# Deploy the backend

## Option A — Render (Docker)

1. Push this repo to GitHub.
2. Create a new Web Service from the repo; root directory `backend`, Docker runtime (or use `render.yaml`).
3. Set environment variables (never commit them):

| Variable | Purpose |
|----------|---------|
| `ENV` | `production` |
| `LLM_PROVIDER` | `anthropic` or `openai` (production refuses to start without a matching key) |
| `LLM_MODEL` | optional; defaults to `claude-opus-5-5` (Anthropic) or `gpt-4o-mini` (OpenAI). `claude-haiku-5-5` is far cheaper per proposal |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Provider key |
| `ALLOWED_ORIGINS` | `chrome-extension://YOUR_EXTENSION_ID` |
| `RATE_LIMIT_PER_HOUR` | e.g. `20` |
| `DAILY_REQUEST_CAP` | e.g. `500` |
| `REDIS_URL` | optional; enables shared rate limits |
| `ADMIN_PING_SECRET` | secret for `/v1/ping-llm` |

4. Confirm `https://YOUR-SERVICE/health` returns ok from mobile data.
5. Point the extension build at the HTTPS API: `VITE_API_BASE_URL=https://YOUR-SERVICE`.

## Redis tradeoff

- Without Redis: counters live in each uvicorn worker (the image runs 2), so limits are per worker
  and reset on every restart. Render's free plan sleeps after ~15 min idle, so the daily cost cap
  effectively resets often. Rely on the LLM provider's spending limit in that setup.
- With Redis: per-install/per-IP hourly limits and the global daily cap are shared by all workers and
  survive restarts. On Render, create a free **Key Value** instance in the same region and paste its
  internal URL into `REDIS_URL`. The app refuses to start if `REDIS_URL` is set but unreachable.

## Client IPs behind the proxy

The container runs uvicorn with `--proxy-headers --forwarded-allow-ips *`, so per-IP limits use the
real client IP from `X-Forwarded-For`. Only expose the container behind the platform's proxy.

## Local production-like run

```bash
cd backend
set ENV=production
set ALLOWED_ORIGINS=chrome-extension://local-dev-id
set LLM_PROVIDER=fake
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
