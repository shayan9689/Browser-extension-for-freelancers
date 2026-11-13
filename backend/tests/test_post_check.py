from helpers import sample_body

from app.schemas import ProposalRequest, ProposalResponse, SuggestedPrice
from app.service import _post_check, tidy_text


def _response(proposal: str, amount: float = 450) -> ProposalResponse:
    return ProposalResponse(
        proposal=proposal,
        suggested_price=SuggestedPrice(amount=amount, currency="USD", rationale="Fits"),
        delivery_days=5,
        questions_to_ask=["Which plan?"],
        warnings=[],
    )


def _request(budget_text: str | None = "$500") -> ProposalRequest:
    body = sample_body()
    body["job"]["budget_text"] = budget_text
    return ProposalRequest.model_validate(body)


def test_tidy_text_plain_punctuation_and_paragraphs() -> None:
    raw = "It’s a “quick” fix—really .\nSame paragraph.\n\n\n\nNext one?"
    assert tidy_text(raw) == 'It\'s a "quick" fix - really. Same paragraph.\n\nNext one?'


def test_tidy_text_moves_closing_question_to_own_paragraph() -> None:
    assert tidy_text("I can fix it. Do you have access?") == "I can fix it.\n\nDo you have access?"


def test_post_check_flags_invented_timing() -> None:
    out = _post_check(_response("I recently shipped Stripe billing.\n\nWhich plan?"), _request())
    assert any("recently" in w for w in out.warnings)


def test_post_check_flags_hourly_rate_as_total() -> None:
    out = _post_check(_response("Draft.\n\nWhich plan?", amount=45), _request(budget_text=None))
    assert any("hourly rate" in w for w in out.warnings)


def test_post_check_allows_hourly_rate_on_hourly_job() -> None:
    req = _request(budget_text="Hourly: $35.00 - $55.00")
    out = _post_check(_response("Draft.\n\nWhich plan?", amount=45), req)
    assert out.warnings == []
