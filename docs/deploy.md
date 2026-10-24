# Deploy the backend

## Option A — Render (Docker)

1. Push this repo to GitHub.
2. Create a new Web Service from the repo; root directory `backend`, Docker runtime (or use `render.yaml`).
3. Set environment variables (never commit them):

| Variable | Purpose |
|----------|---------|
| `ENV` | `production` |
| `LLM_PROVIDER` | `anthropic` or `openai` |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Provider key |
| `ALLOWED_ORIGINS` | `chrome-extension://YOUR_EXTENSION_ID` |
| `RATE_LIMIT_PER_HOUR` | e.g. `20` |
| `DAILY_REQUEST_CAP` | e.g. `500` |
| `REDIS_URL` | optional; enables shared rate limits |
| `ADMIN_PING_SECRET` | secret for `/v1/ping-llm` |

4. Confirm `https://YOUR-SERVICE/health` returns ok from mobile data.
5. Point the extension build at the HTTPS API: `VITE_API_BASE_URL=https://YOUR-SERVICE`.

## Redis tradeoff

- Without Redis: in-memory limiter resets on restart / differs per instance.
- With Redis: shared counters across instances (set `REDIS_URL`).

## Local production-like run

```bash
cd backend
set ENV=production
set ALLOWED_ORIGINS=chrome-extension://local-dev-id
set LLM_PROVIDER=fake
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
