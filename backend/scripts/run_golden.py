"""Run golden jobs against the configured provider (real or fake).

Usage (from /backend):
  python scripts/run_golden.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import get_settings  # noqa: E402
from app.prompts.proposal import BANNED_PHRASES  # noqa: E402
from app.providers import get_provider  # noqa: E402
from app.schemas import ProposalRequest  # noqa: E402
from app.service import generate_proposal  # noqa: E402

GOLDEN = ROOT / "tests" / "golden"
PROFILE = {
    "name": "Alex Freelancer",
    "headline": "Full-stack freelancer",
    "skills": ["Python", "React", "FastAPI", "JavaScript"],
    "years_experience": 6,
    "hourly_rate": 50,
    "currency": "USD",
    "highlights": [
        "Shipped Stripe billing for a SaaS",
        "Built MV3 Chrome extensions used by 2k users",
    ],
}


def violations(text: str) -> list[str]:
    found: list[str] = []
    lowered = text.lower()
    for phrase in BANNED_PHRASES:
        if phrase in lowered:
            found.append(f"banned:{phrase}")
    if "[" in text and "]" in text:
        found.append("possible-placeholder")
    return found


def main() -> int:
    settings = get_settings()
    provider = get_provider(settings)
    print(f"provider={settings.llm_provider} type={type(provider).__name__}")
    ok = True
    for path in sorted(GOLDEN.glob("job*.json")):
        job = json.loads(path.read_text(encoding="utf-8"))
        req = ProposalRequest.model_validate(
            {
                "install_id": str(uuid4()),
                "job": {
                    "platform": job["platform"],
                    "title": job["title"],
                    "description": job["description"],
                    "budget_text": job.get("budget_text"),
                    "skills": job.get("skills") or [],
                },
                "profile": PROFILE,
                "options": {"tone": "professional", "length": "short"},
            }
        )
        result = generate_proposal(req, provider)
        words = len(result.proposal.split())
        v = violations(result.proposal)
        print("=" * 60)
        print(path.name, f"words={words}", f"violations={v}")
        print(result.proposal)
        print("price=", result.suggested_price.model_dump())
        print("delivery_days=", result.delivery_days)
        print("questions=", result.questions_to_ask)
        print("warnings=", result.warnings)
        if v:
            ok = False
        # Real providers should hit ~90+ words; FakeProvider is shorter by design.
        min_words = 30 if settings.llm_provider == "fake" else 70
        if words < min_words:
            ok = False
            print(f"FAIL word count {words} < {min_words}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
