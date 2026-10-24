# Chrome Web Store review audit

**Date:** 2026-10-24  
**Verdict:** PASS with manual follow-ups before submit

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

## 7. FIX list (before submit)

1. Host privacy policy + demo page on GitHub Pages; paste public URLs in the dashboard.
2. Set production `VITE_API_BASE_URL=https://…` and rebuild/zip.
3. Set backend `ALLOWED_ORIGINS=chrome-extension://REAL_ID` after first upload.
4. Replace `support@example.com` in the privacy policy.
5. Create real store screenshots at required sizes.
6. Pay Chrome Web Store developer registration fee and submit.
