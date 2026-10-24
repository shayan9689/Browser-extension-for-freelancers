# Progress

| Phase | Name | Status | Date | Notes | Known issues |
|------:|------|--------|------|-------|--------------|
| 0 | Project setup and ground rules | done | 2026-10-24 | README, PRD, PROGRESS, Cursor rules, layout | — |
| 1 | Extension scaffold | done | 2026-10-24 | WXT+React side panel, typed PING, lint/typecheck/test/build green | Load unpacked for manual ping check |
| 2 | Job post detection and extraction | done | 2026-10-24 | Adapters + fixtures + selection fallback; 11 tests green | Real-site manual check still recommended |
| 3 | Backend API (fake LLM) | done | 2026-10-24 | FastAPI + rate limit + FakeProvider; pytest/ruff green | Docker not installed on this machine |
| 4 | Real proposal generation | done | 2026-10-24 | Anthropic/OpenAI providers + prompts + injection defence; mocked tests | Needs real API key for live golden quality |
| 5 | Side panel UI | done | 2026-10-24 | State machine UI + API client + cancel/errors; 17 tests | Manual E2E with local backend recommended |
| 6 | Profile, settings, local history | pending | | | |
| 7 | Hardening, security, privacy | pending | | | |
| 8 | Automated tests and CI | pending | | | |
| 9 | Deploy backend (production) | pending | | | |
| 10 | Package and store assets | pending | | | |
| 11 | Publish to Chrome Web Store | pending | | Manual dashboard steps | |
| 12 | Post-launch monitoring & docs | pending | | | |

## Chrome permissions (justifications filled as added)

| Permission | Why |
|------------|-----|
| `storage` | Save profile, settings, history, install_id (Phase 6) |
| `sidePanel` | Keep UI open while reading the job post |
| `activeTab` | Read the current tab URL/title and selected text on demand |
| `scripting` | Inject/query selection fallback when adapters fail |

Content script matches (from `src/shared/sites.ts`): `https://www.fiverr.com/*`, `https://www.upwork.com/*`

### Phase 1 how to verify
1. `cd extension && npm run build`
2. Chrome ? `chrome://extensions` ? Developer mode ? Load unpacked ? `extension/.output/chrome-mv3`
3. Click toolbar icon ? side panel opens
4. On fiverr.com/upwork.com: Ping page returns title; on example.com: friendly error
5. Side panel Network tab: no outgoing requests
