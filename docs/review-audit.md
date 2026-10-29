# Chrome Web Store review audit

**Date:** 2026-10-24 (re-audited 2026-10-30)  
**Verdict:** PASS on code; owner steps pending (see section 7)

## 1. Permissions and host matches

| Item | Used in code | Notes |
|------|--------------|-------|
| `storage` | `src/shared/storage.ts`, background onboarding | Required |
| `sidePanel` | `entrypoints/background.ts` | Required |
| `activeTab` | selection fallback / tab query | Required |
| `scripting` | `getSelectedTextFromActiveTab` | Required |
| `https://www.fiverr.com/*` | content script | Required for auto extract |
| `https://www.upwork.com/*` | content script | Required for auto extract |

No unused permissions found.

## 2. Remote code / eval / external scripts

- No `eval`, `new Function`, or remotely hosted scripts in source.
- Tailwind/React are bundled by WXT/Vite.
- Default MV3 CSP not weakened in manifest.

## 3. Listing vs behaviour

Store listing claims match: detect job → generate draft → user copies/sends manually. Non-goals (no auto-submit) are accurate.

## 4. Privacy policy vs network

Only intended outgoing request from the extension is `POST {VITE_API_BASE_URL}/v1/proposals` over HTTPS in production builds.

## 5. Trademark / misleading risk

Working name “ProposalPilot” avoids marketplace trademarks in title/icons. Keep screenshots free of marketplace logos/names.

## 6. Stranger can test?

Yes, using `docs/demo/job-post.html` + selected-text flow, once privacy policy and demo are publicly hosted and the production API is live.

## 7. FIX list (before submit) — status 2026-10-30

| # | Item | Status |
|---|------|--------|
| 1 | Privacy policy + demo page public via GitHub Pages | Done (URLs in `docs/launch-checklist.md`) |
| 2 | Production `VITE_API_BASE_URL` baked into zip | Build now enforces https URL; release reads repo variable `API_BASE_URL` — pending backend URL |
| 3 | `ALLOWED_ORIGINS=chrome-extension://REAL_ID` | Pending first upload |
| 4 | Support email in privacy policy | Done (supportextension9@gmail.com) |
| 5 | Store screenshots 1280x800 | Pending owner; icon + promo tile done in `extension/store-assets/` |
| 6 | Developer registration and submit | Pending owner |

Found and fixed during the re-audit: the v1.0.0 zip contained a `localhost` fallback and failed
`verify-zip`; privacy policy did not name the LLM provider or disclose IP use for rate limiting.
