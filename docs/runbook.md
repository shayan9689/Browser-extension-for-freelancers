# Runbook

## Rotate LLM key

1. Create a new key in the provider dashboard; revoke the old one after cutover.
2. Update `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` in the host dashboard.
3. Redeploy / restart the service.
4. Hit `/v1/ping-llm` with the admin header to confirm.

## Logs

- Render/Railway/Fly: use the platform log viewer.
- Never expect job text in logs — if you see it, treat as an incident.

## Rollback

1. Redeploy the previous Docker image / git tag (`phase-N`).
2. Confirm `/health`.
3. Smoke-test one generation from the extension.

## Cost spike

1. Lower `DAILY_REQUEST_CAP` and `RATE_LIMIT_PER_HOUR` immediately.
2. Check provider dashboard spend cap / kill switch.
3. Inspect traffic for abuse; tighten CORS to the real extension ID only.
