# Progress

| Phase | Name | Status | Date | Notes | Known issues |
|------:|------|--------|------|-------|--------------|
| 0 | Project setup and ground rules | done | 2026-10-24 | README, PRD, PROGRESS, Cursor rules, layout | — |
| 1 | Extension scaffold | done | 2026-10-24 | WXT+React side panel, typed PING | Load unpacked for manual ping check |
| 2 | Job post detection and extraction | done | 2026-10-24 | Adapters + fixtures + selection fallback | Real-site manual check recommended |
| 3 | Backend API (fake LLM) | done | 2026-10-24 | FastAPI + rate limit + FakeProvider | Docker not installed locally |
| 4 | Real proposal generation | done | 2026-10-24 | Anthropic/OpenAI + injection defence | Needs real API key for live quality |
| 5 | Side panel UI | done | 2026-10-24 | Full state machine + API client | Manual E2E with local backend |
| 6 | Profile, settings, local history | done | 2026-10-24 | Options/onboarding, history cap 50 | — |
| 7 | Hardening, security, privacy | done | 2026-10-24 | permissions/privacy, daily cap, HTTPS check | Install Docker/gitleaks for full gate |
| 8 | Automated tests and CI | done | 2026-10-24 | GitHub Actions, fixtures check, Playwright smoke | Full extension-loaded e2e still thin |
| 9 | Deploy backend (production) | done | 2026-10-24 | render.yaml, deploy.md, runbook, ping-llm | User must deploy to a host |
| 10 | Package and store assets | done | 2026-10-24 | zip verify script, store-listing, demo page | User must create real screenshots |
| 11 | Publish to Chrome Web Store | done | 2026-10-24 | review-audit.md prepared | Dashboard submit is manual |
| 12 | Post-launch monitoring & docs | done | 2026-10-24 | release.yml, CHANGELOG, playbook | Optional CWS API secrets later |

## Launch status (2026-10-30)

Code for phases 0-12 is complete. Phase gates 9-11 still need the owner's manual steps
(deploy, production test, screenshots, store submission). Follow `docs/launch-checklist.md`.
The 2026-10-30 re-audit fixed production-blocking issues; see CHANGELOG.

## Chrome permissions (justifications filled as added)

| Permission | Why |
|------------|-----|
| `storage` | Save profile, settings, history, install_id |
| `sidePanel` | Keep UI open while reading the job post |
| `activeTab` | Read the current tab URL/title and selected text on demand |
| `scripting` | Inject/query selection fallback when adapters fail |

Content script matches (from `src/shared/sites.ts`): `https://www.fiverr.com/*`, `https://www.upwork.com/*`

See also `docs/permissions.md`.
