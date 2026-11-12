# Changelog

All notable changes to this project will be documented in this file.

## [1.0.3] - 2026-11-13

### Added

- Fiverr inbox: the open conversation is read automatically (locally). "Check for project" asks
  the AI whether the client described a project; if so, its title, summary, requirements,
  budget and deadline become the job card, otherwise the panel says it is just a simple chat
- Backend `POST /v1/conversation` with a versioned prompt; messages are sent as client/me only,
  with names removed, and are never stored or logged

## [1.0.2] - 2026-11-13

### Added

- Floating popup from the toolbar icon (Alt+Shift+P) replaces the always-docked side panel. The
  screen and draft are kept in session storage, generation runs in the background worker so it
  survives the popup closing, and "Open in side panel" docks the same screen for long sessions
- Popup picks up the job automatically: selected text on any site (the popup grants activeTab),
  or the job on Fiverr/Upwork pages
- Fiverr: drafts a reply to a buyer's Custom Order Request in the inbox, with its budget and
  requested delivery
- Right-click "Draft proposal with ProposalPilot" on selected text opens the popup with the job
  ready, on any website (new `contextMenus` permission)
- "Paste job text" box as a fallback that needs no page access
- Redesigned popup/side panel and settings: new theme with light/dark support, brand gradients,
  progress stepper, animated generating state, price and delivery tiles, segmented tone/length
  controls, profile completeness meter, Enter-to-add skills and confirm before deleting data

### Fixed

- "Use selected text" on sites other than Fiverr/Upwork failed with "Chrome blocked access",
  because Chrome does not grant activeTab when the toolbar icon opens the side panel. The panel
  now guides users to the right-click menu or paste box instead of showing an error
- Draft text box grows with the proposal instead of cutting it off
- Upwork job detection failed on the current Upwork layout ("Couldn't find the job details").
  Selectors are now based on a real job page: title, all description paragraphs, hourly or
  fixed budget, experience level and skills; the page title is a fallback for the job title
- Upwork jobs opened in the "Best matches" slider were reported as "No job post on this page".
  The newer job viewer is now supported and read only inside the open slider (not the feed
  behind it); line breaks in descriptions no longer glue words together

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
