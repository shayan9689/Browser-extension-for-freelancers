from fastapi.testclient import TestClient
from helpers import sample_body

from app.schemas import ProposalRequest, ProposalResponse, ScreeningAnswer, SuggestedPrice
from app.service import _post_check


def _request(questions: list[str]) -> ProposalRequest:
    body = sample_body()
    body["job"]["questions"] = questions
    return ProposalRequest.model_validate(body)


def _response(answers: list[tuple[str, str]]) -> ProposalResponse:
    return ProposalResponse(
        proposal="Draft.\n\nWhich plan?",
        suggested_price=SuggestedPrice(amount=400, currency="USD", rationale="Fits"),
        delivery_days=5,
        questions_to_ask=["Which plan?"],
        answers=[ScreeningAnswer(question=q, answer=a) for q, a in answers],
    )


def test_questions_are_cleaned() -> None:
    req = _request(["  How soon can you start?  ", "", "x" * 600])
    assert req.job.questions == ["How soon can you start?", "x" * 500]


def test_answers_keep_the_clients_wording_and_order() -> None:
    req = _request(["How soon can you start?", "Describe similar work"])
    out = _post_check(
        _response([("When can you start", "This week."), ("similar", "I built X—fast.")]),
        req,
    )
    assert [a.question for a in out.answers] == ["How soon can you start?", "Describe similar work"]
    assert out.answers[1].answer == "I built X - fast."
    assert out.warnings == []


def test_missing_answers_add_a_warning_and_extra_ones_are_dropped() -> None:
    req = _request(["Q1", "Q2"])
    out = _post_check(_response([("Q1", "A1")]), req)
    assert len(out.answers) == 1
    assert any("not answered" in w for w in out.warnings)

    out = _post_check(_response([("Q1", "A1"), ("Q2", "A2"), ("Q3", "A3")]), _request(["Q1"]))
    assert [a.answer for a in out.answers] == ["A1"]


def test_api_returns_answers_and_old_clients_still_work(client: TestClient) -> None:
    body = sample_body()
    body["job"]["questions"] = ["How soon can you start?"]
    res = client.post("/v1/proposals", json=body)
    assert res.status_code == 200
    assert res.json()["answers"][0]["question"] == "How soon can you start?"

    old = client.post("/v1/proposals", json=sample_body())  # no questions field
    assert old.status_code == 200
    assert old.json()["answers"] == []


def test_answers_drop_profile_mentions_and_flag_timing() -> None:
    req = _request(["Share links", "Similar work?"])
    out = _post_check(
        _response([
            ("Share links", "I don't have links listed in my profile, but I can share details."),
            ("Similar work?", "I recently built Stripe billing."),
        ]),
        req,
    )
    assert out.answers[0].answer == "I don't have links, but I can share details."
    assert any("An answer says" in w for w in out.warnings)
