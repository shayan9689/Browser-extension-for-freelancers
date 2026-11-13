"""Score the proposal and conversation prompts on the golden set in tests/golden/eval.

Usage (from /backend, uses LLM_PROVIDER from .env):
  python scripts/eval_prompts.py              # all cases
  python scripts/eval_prompts.py j05 c06      # only cases whose id starts with these

Prints a scorecard and saves full outputs to eval-runs/ (gitignored).
Checks are heuristics: a flag means "read this one", not always a bug.
"""

from __future__ import annotations

import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import get_settings  # noqa: E402
from app.prompts.conversation import CONVERSATION_PROMPT_VERSION  # noqa: E402
from app.prompts.proposal import BANNED_PHRASES, PROMPT_VERSION  # noqa: E402
from app.providers import get_provider  # noqa: E402
from app.schemas import ConversationRequest, ProposalRequest  # noqa: E402
from app.service import analyze_conversation, generate_proposal  # noqa: E402

EVAL = ROOT / "tests" / "golden" / "eval"
RUNS = ROOT / "eval-runs"
PAUSE_SECONDS = 6  # stay under Groq free-tier per-minute limits
WORDS = {"short": (60, 125), "medium": (120, 210)}
BUZZWORDS = (
    "leverage", "expertise", "specializ", "inside out", "seamless", "top-notch", "robust",
    "cutting-edge", "thousands", "stealth", "bypass", "looking forward", "keep you informed",
    "is essential", "is critical", "proving", "demonstrating", "so i know where", "partner",
)
GENERIC_OPENERS = ("dear", "hello, my name", "hi, my name", "i am a", "i'm a", "greetings")
CLAIM_WORDS = re.compile(
    r"\b(i've|i have|i built|i shipped|i delivered|my experience|experienced|expert|"
    r"years of|worked (?:on|with)|i specialize|proficient|hands-on)\b",
    re.I,
)


def sentences(text: str) -> list[str]:
    return [s for s in re.split(r"(?<=[.!?])\s+|\n+", text) if s.strip()]


def invented_numbers(text: str, sources: str) -> list[str]:
    """Numbers in the draft that appear nowhere in the job or profile."""
    known = {n.replace(",", "") for n in re.findall(r"\d[\d,]*", sources)}
    found = {n.replace(",", "") for n in re.findall(r"\d[\d,]*", text)}
    return sorted(n for n in found - known if len(n) > 1 or n not in "123456789")


def check_proposal(case: dict, profile: dict, result, length: str) -> list[str]:
    flags: list[str] = []
    text = result.proposal
    lower = text.lower()
    words = len(text.split())
    lo, hi = WORDS[length]
    if not lo <= words <= hi:
        flags.append(f"words={words} (want {lo}-{hi})")
    flags += [f"banned:{p}" for p in BANNED_PHRASES if p in lower]
    if re.search(r"\[[^\]]*\]|\{[^}]*\}|\bTODO\b|\bTBD\b|XXX", text):
        flags.append("placeholder")
    flags += [f"buzzword:{w}" for w in BUZZWORDS if re.search(rf"\b{w}", lower)]
    if text.count("\n\n") < 2:
        flags.append(f"paragraphs={text.count(chr(10) * 2) + 1}")
    if lower.lstrip().startswith(GENERIC_OPENERS):
        flags.append("generic-opener")
    questions = text.count("?")
    ends_with_question = text.rstrip().endswith("?")
    if questions != 1 or not ends_with_question:
        flags.append(f"question: {questions} in draft, ends with ?={ends_with_question}")
    if re.search(r"[\u2010-\u2015\u2018-\u201d\u202f\u00a0\u2248]", text):
        flags.append("typographic characters")
    for term in case.get("forbidden_text", []):
        if term.lower() in lower:
            flags.append(f"INJECTION:{term}")
    for term in case.get("must_not_claim", []):
        for s in sentences(text):
            if term.lower() in s.lower() and CLAIM_WORDS.search(s):
                flags.append(f"CLAIM:{term} -> {s.strip()[:90]}")
                break
    sources = json.dumps(case["job"]) + json.dumps(profile)
    nums = invented_numbers(text, sources)
    if nums:
        flags.append(f"new-numbers={','.join(nums)}")

    budget = case.get("budget")
    amount = result.suggested_price.amount
    if budget:
        low, high = (0.7, 1.3) if budget["type"] == "fixed" else (0.8, 1.2)
        if not budget["min"] * low <= amount <= budget["max"] * high:
            flags.append(f"price={amount} vs {budget['type']} {budget['min']}-{budget['max']}")
    if result.delivery_days <= 0 or result.delivery_days > 120:
        flags.append(f"delivery_days={result.delivery_days}")
    return flags


def check_chat(case: dict, analysis) -> list[str]:
    flags: list[str] = []
    if analysis.has_project != case["expect_project"]:
        flags.append(f"has_project={analysis.has_project} (want {case['expect_project']})")
    if analysis.has_project:
        if not analysis.title or not analysis.requirements:
            flags.append("missing title/requirements")
        if case.get("expect_budget") is True and not analysis.budget_text:
            flags.append("missed budget")
        if case.get("expect_budget") is False and analysis.budget_text:
            flags.append(f"invented budget: {analysis.budget_text}")
        if case.get("expect_deadline") is True and not analysis.deadline:
            flags.append("missed deadline")
        if case.get("expect_deadline") is False and analysis.deadline:
            flags.append(f"invented deadline: {analysis.deadline}")
    if "free money" in analysis.title.lower():
        flags.append("INJECTION:title")
    return flags


def call(fn, *args):
    """One retry after a pause, for free-tier rate limits."""
    try:
        return fn(*args)
    except ValueError:
        time.sleep(30)
        return fn(*args)


def main(filters: list[str]) -> int:
    sys.stdout.reconfigure(encoding="utf-8")  # drafts may contain non-ASCII spaces
    settings = get_settings()
    provider = get_provider(settings)
    profiles = json.loads((EVAL / "profiles.json").read_text(encoding="utf-8"))
    jobs = json.loads((EVAL / "jobs.json").read_text(encoding="utf-8"))
    chats = json.loads((EVAL / "chats.json").read_text(encoding="utf-8"))
    pick = lambda c: not filters or any(c["id"].startswith(f) for f in filters)  # noqa: E731

    print(f"provider={settings.llm_provider} model={settings.llm_model or 'default'}")
    print(f"proposal prompt={PROMPT_VERSION} conversation prompt={CONVERSATION_PROMPT_VERSION}\n")
    run: dict = {
        "proposal_prompt": PROMPT_VERSION,
        "conversation_prompt": CONVERSATION_PROMPT_VERSION,
        "provider": settings.llm_provider,
        "cases": [],
    }
    clean = total = 0

    for case in filter(pick, jobs):
        profile = profiles[case["profile"]]
        length = case.get("length", "short")
        req = ProposalRequest.model_validate({
            "install_id": str(uuid4()), "job": case["job"], "profile": profile,
            "options": {"tone": case.get("tone", "professional"), "length": length},
        })
        try:
            result = call(generate_proposal, req, provider)
            flags = check_proposal(case, profile, result, length)
            out = result.model_dump()
        except Exception as exc:  # noqa: BLE001 - report and keep going
            flags, out = [f"ERROR:{exc}"], None
        total += 1
        clean += not flags
        print(f"{'OK  ' if not flags else 'FLAG'} {case['id']}")
        for f in flags:
            print(f"       - {f}")
        run["cases"].append({"id": case["id"], "flags": flags, "output": out})
        time.sleep(PAUSE_SECONDS)

    for case in filter(pick, chats):
        req = ConversationRequest.model_validate({
            "install_id": str(uuid4()), "platform": "fiverr", "messages": case["messages"],
        })
        try:
            analysis = call(analyze_conversation, req, provider)
            flags = check_chat(case, analysis)
            out = analysis.model_dump()
        except Exception as exc:  # noqa: BLE001
            flags, out = [f"ERROR:{exc}"], None
        total += 1
        clean += not flags
        print(f"{'OK  ' if not flags else 'FLAG'} {case['id']}")
        for f in flags:
            print(f"       - {f}")
        run["cases"].append({"id": case["id"], "flags": flags, "output": out})
        time.sleep(PAUSE_SECONDS)

    RUNS.mkdir(exist_ok=True)
    path = RUNS / f"{datetime.now():%Y%m%d-%H%M%S}-{PROMPT_VERSION}.json"
    path.write_text(json.dumps(run, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nScore: {clean}/{total} clean. Full outputs: {path.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
