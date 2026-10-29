import json
import logging
import re

from pydantic import ValidationError

from app.prompts.proposal import (
    BANNED_PHRASES,
    SYSTEM_PROMPT,
    build_user_prompt,
)
from app.providers.fake import FakeProvider
from app.providers.http_llm import AnthropicProvider, HttpLLMError, OpenAIProvider
from app.schemas import ProposalRequest, ProposalResponse, SuggestedPrice

logger = logging.getLogger("proposalpilot")

Provider = FakeProvider | AnthropicProvider | OpenAIProvider

SAFE_FALLBACK = ProposalResponse(
    proposal=(
        "Thanks for sharing the project details. I can help based on the requirements "
        "in your post and my relevant experience. I would clarify scope first, then "
        "deliver a clean first version for your review. What is the top priority for "
        "the first milestone?"
    ),
    suggested_price=SuggestedPrice(
        amount=0,
        currency="USD",
        rationale="Estimate unavailable — review and set your own price.",
    ),
    delivery_days=7,
    questions_to_ask=["What is the top priority for the first milestone?"],
    warnings=["Used safe fallback due to untrusted or invalid model output."],
)


def _looks_injected(text: str, system_prompt: str) -> bool:
    lowered = text.lower()
    if "pwned" in lowered:
        return True
    if "ignore previous instructions" in lowered:
        return True
    # If model echoes a large chunk of the system prompt, treat as leak.
    snippet = system_prompt[:80].lower()
    return snippet in lowered


def _post_check(response: ProposalResponse, request: ProposalRequest) -> ProposalResponse:
    warnings = list(response.warnings)
    text = response.proposal.lower()
    for phrase in BANNED_PHRASES:
        if phrase in text:
            warnings.append(f"Removed banned style: {phrase}")
    if re.search(r"\[[A-Za-z _-]{2,}\]", response.proposal):
        warnings.append("Possible placeholder detected.")
    # Never invent years if profile has 0 — soft check
    if request.profile.years_experience == 0 and re.search(
        r"\d+\+?\s+years?", response.proposal, re.I
    ):
        warnings.append("Proposal may claim experience not in profile.")
    response.warnings = warnings
    return response


def _describe(exc: Exception) -> str:
    """Error summary for logs: field paths and error types only, never model text."""
    if isinstance(exc, ValidationError):
        return "; ".join(
            f"{'.'.join(str(p) for p in e['loc'])}:{e['type']}" for e in exc.errors()
        )
    if isinstance(exc, json.JSONDecodeError):
        return f"JSONDecodeError at pos {exc.pos}"
    if isinstance(exc, HttpLLMError):
        return str(exc)
    return type(exc).__name__


def _parse_response(raw: str) -> ProposalResponse:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    data = json.loads(cleaned)
    return ProposalResponse.model_validate(data)


def generate_proposal(request: ProposalRequest, provider: Provider) -> ProposalResponse:
    logger.info(
        "Generating proposal platform=%s install=%s",
        request.job.platform,
        str(request.install_id)[:8],
        extra={"request_id": "-"},
    )

    profile = {
        "name": request.profile.name,
        "headline": request.profile.headline,
        "skills": request.profile.skills,
        "years_experience": request.profile.years_experience,
        "hourly_rate": request.profile.hourly_rate,
        "currency": request.profile.currency,
        "highlights": request.profile.highlights,
    }
    user_prompt = build_user_prompt(
        job_title=request.job.title,
        job_description=request.job.description,
        budget_text=request.job.budget_text,
        skills=request.job.skills,
        platform=request.job.platform,
        profile=profile,
        tone=request.options.tone,
        length=request.options.length,
    )

    if isinstance(provider, FakeProvider):
        raw = provider.generate_from_request(request)
        return _post_check(_parse_response(raw), request)

    try:
        raw = provider.generate(user_prompt, system=SYSTEM_PROMPT)
    except HttpLLMError as exc:
        logger.warning("LLM call failed: %s", exc, extra={"request_id": "-"})
        raise ValueError("UPSTREAM") from exc

    if _looks_injected(raw, SYSTEM_PROMPT):
        fallback = SAFE_FALLBACK.model_copy(deep=True)
        fallback.warnings = [
            *SAFE_FALLBACK.warnings,
            "Blocked possible prompt-injection or system-prompt leak.",
        ]
        return fallback

    try:
        parsed = _parse_response(raw)
    except (json.JSONDecodeError, ValidationError, KeyError) as first_exc:
        logger.warning(
            "Invalid model output, retrying: %s",
            _describe(first_exc),
            extra={"request_id": "-"},
        )
        # One repair attempt
        repair = (
            "Your previous reply was not valid JSON. Reply with STRICT JSON only "
            "matching the contract. No markdown."
        )
        try:
            raw2 = provider.generate(
                user_prompt + "\n\n" + repair,
                system=SYSTEM_PROMPT,
            )
            parsed = _parse_response(raw2)
        except Exception as exc:
            logger.warning(
                "Invalid model output after repair: %s",
                _describe(exc),
                extra={"request_id": "-"},
            )
            raise ValueError("INVALID_UPSTREAM") from exc

    if _looks_injected(parsed.proposal, SYSTEM_PROMPT):
        fallback = SAFE_FALLBACK.model_copy(deep=True)
        fallback.warnings = [
            *SAFE_FALLBACK.warnings,
            "Blocked possible prompt-injection in proposal text.",
        ]
        return fallback

    return _post_check(parsed, request)
