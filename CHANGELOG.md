# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2026-11-12

### Added

- Free LLM providers: Groq and Google Gemini via their OpenAI-compatible APIs
  (`LLM_PROVIDER=groq|gemini`, `GROQ_API_KEY`, `GEMINI_API_KEY`)

### Changed

- Privacy policy and store listing name Groq as the AI provider
- Deploy docs, launch checklist and runbook use only free services

### Fixed

- `/health` answers HEAD requests, so uptime monitors no longer see 405
- "Use selected text" asks the content script first, so it works on tabs where Chrome has not
  granted activeTab; errors show readable titles instead of raw codes
- `verify-zip` checks the zip for the current version instead of the first zip in `.output`

## [1.0.0] - 2026-10-30

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
