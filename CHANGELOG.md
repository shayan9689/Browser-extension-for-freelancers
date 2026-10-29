# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - unreleased

### Added

- Chrome MV3 extension with side panel, job extraction adapters, profile/history
- FastAPI backend with fake/Anthropic/OpenAI providers, rate limits, privacy logging
- CI, packaging scripts, store listing drafts, deploy docs
- Redis-backed rate limiter and daily cap (`REDIS_URL`), configurable `LLM_MODEL`
- Store icon and promo tile (`npm run icons`), `npm run bump`, launch checklist

### Fixed (before first store release)

- Production zip no longer contains a `localhost` API fallback; production builds require an https API URL
- `verify-zip` works on Linux CI and rejects unexpected permissions; release workflow no longer ignores it
- Per-IP rate limiting used the proxy IP behind Render (all users shared one bucket)
- Blocking LLM call no longer stalls the event loop; rate-limited requests no longer consume the daily cap
- `/v1/ping-llm` failed with OpenAI JSON mode; production refuses to start without an LLM key
- Privacy policy names OpenAI and discloses IP use for rate limiting
