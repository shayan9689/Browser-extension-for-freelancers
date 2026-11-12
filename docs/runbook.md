# Runbook

## Rotate LLM key

1. Create a new key in the provider dashboard; revoke the old one after cutover.
2. Update the key for the active provider (`GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY` or
   `ANTHROPIC_API_KEY`) in the host dashboard.
3. Redeploy / restart the service.
4. Hit `/v1/ping-llm` with the admin header to confirm.

## Logs

- Render/Railway/Fly: use the platform log viewer.
- Never expect job text in logs — if you see it, treat as an incident.

## Rollback

1. Redeploy the previous Docker image / git tag (`phase-N`).
2. Confirm `/health`.
3. Smoke-test one generation from the extension.

## Free quota exhausted / traffic spike

On a free LLM tier this costs nothing, but users get errors once the quota is used up.

1. Lower `DAILY_REQUEST_CAP` and `RATE_LIMIT_PER_HOUR` immediately.
2. Check usage in the provider console (Groq: Settings → Limits / Usage).
3. Inspect traffic for abuse; tighten CORS to the real extension ID only.
4. If real demand outgrows one free tier, switch provider with `LLM_PROVIDER=gemini` and
   `GEMINI_API_KEY` (update the privacy policy first, see `docs/deploy.md`).

## Model retired

Free providers retire models. If `/v1/ping-llm` returns `fail` and the logs show a 400/404 from the
provider, set `LLM_MODEL` to a current model from the provider console and redeploy.
