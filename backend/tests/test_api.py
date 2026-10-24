import logging

from fastapi.testclient import TestClient
from helpers import sample_body


def test_health(client: TestClient) -> None:
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert "version" in res.json()


def test_proposals_fake_shape(client: TestClient) -> None:
    res = client.post("/v1/proposals", json=sample_body())
    assert res.status_code == 200
    data = res.json()
    assert "proposal" in data
    assert "suggested_price" in data
    assert "amount" in data["suggested_price"]
    assert "delivery_days" in data
    assert isinstance(data["questions_to_ask"], list)
    assert isinstance(data["warnings"], list)


def test_oversize_description_422(client: TestClient) -> None:
    body = sample_body()
    body["job"]["description"] = "x" * 13_000
    res = client.post("/v1/proposals", json=body)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "INVALID_INPUT"


def test_rate_limit_429(client: TestClient) -> None:
    body = sample_body()
    last = None
    for _ in range(21):
        last = client.post("/v1/proposals", json=body)
    assert last is not None
    assert last.status_code == 429
    assert last.json()["error"]["code"] == "RATE_LIMITED"
    assert "Retry-After" in last.headers


def test_cors_allowed(client: TestClient) -> None:
    res = client.options(
        "/v1/proposals",
        headers={
            "Origin": "chrome-extension://test-extension-id",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert res.status_code in (200, 204)
    assert (
        res.headers.get("access-control-allow-origin")
        == "chrome-extension://test-extension-id"
    )


def test_cors_blocked(client: TestClient) -> None:
    res = client.options(
        "/v1/proposals",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    # Starlette omits allow-origin for disallowed origins
    assert res.headers.get("access-control-allow-origin") != "https://evil.example"


def test_job_text_not_in_logs(client: TestClient, caplog) -> None:
    with caplog.at_level(logging.INFO):
        client.post("/v1/proposals", json=sample_body())
    combined = " ".join(r.message for r in caplog.records)
    assert "UNIQUE_JOB_MARKER_XYZ" not in combined
