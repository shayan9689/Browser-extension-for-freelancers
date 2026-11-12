# Deploy the backend

## Option A — Render (Docker)

1. Push this repo to GitHub.
2. Create a new Web Service from the repo; root directory `backend`, Docker runtime (or use `render.yaml`).
3. Set environment variables (never commit them):

| Variable | Purpose |
|----------|---------|
| `ENV` | `production` |
| `LLM_PROVIDER` | `groq` (free, recommended), `gemini` (free), `openai` or `anthropic` (paid). Production refuses to start without the matching key |
| `LLM_MODEL` | optional; defaults: `openai/gpt-oss-120b` (Groq), `gemini-2.5-flash` (Gemini), `gpt-4o-mini` (OpenAI), `claude-opus-5-5` (Anthropic). Free providers retire models often: if `/v1/ping-llm` fails, pick a current model from the provider console |
| `GROQ_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Key for the chosen provider |
| `ALLOWED_ORIGINS` | `chrome-extension://YOUR_EXTENSION_ID` |
| `RATE_LIMIT_PER_HOUR` | e.g. `20` |
| `DAILY_REQUEST_CAP` | e.g. `500` |
| `REDIS_URL` | optional; enables shared rate limits |
| `ADMIN_PING_SECRET` | secret for `/v1/ping-llm` |

4. Confirm `https://YOUR-SERVICE/health` returns ok from mobile data.
5. Point the extension build at the HTTPS API: `VITE_API_BASE_URL=https://YOUR-SERVICE`.

## Free LLM providers

- **Groq (recommended):** create a key at https://console.groq.com/keys. No card is needed. By default
  Groq does not retain inference data (https://console.groq.com/docs/your-data). Do not add billing
  details if you want it to stay free.
- **Gemini:** create a key at https://aistudio.google.com/apikey. On the free tier Google may use
  prompts and responses to improve its products, so update the "Third parties" section of
  `docs/privacy-policy.md` and the store listing before switching to it.

Free tiers have per-minute and per-day request limits. Keep `RATE_LIMIT_PER_HOUR` and
`DAILY_REQUEST_CAP` below them so users hit our friendly limit first.

## Redis tradeoff

- Without Redis: counters live in each uvicorn worker (the image runs 2), so limits are per worker
  and reset on every restart. Render's free plan sleeps after ~15 min idle, so the daily cost cap
  effectively resets often. On a free LLM tier this cannot cost money: when the provider's free
  quota runs out it returns errors (users see a retry message) until the quota resets.
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
