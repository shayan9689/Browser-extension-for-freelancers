<div align="center">

<img src="extension/store-assets/store-icon-128.png" alt="ProposalPilot logo" width="88">

# ProposalPilot

**AI-written first drafts for freelance proposals, right from the job post you are reading.**

[![CI](https://github.com/shayan9689/Browser-extension-for-freelancers/actions/workflows/ci.yml/badge.svg)](https://github.com/shayan9689/Browser-extension-for-freelancers/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/shayan9689/Browser-extension-for-freelancers)](https://github.com/shayan9689/Browser-extension-for-freelancers/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-14b8a6)

[Demo job post](https://shayan9689.github.io/Browser-extension-for-freelancers/demo/job-post.html) ·
[Privacy policy](https://shayan9689.github.io/Browser-extension-for-freelancers/privacy-policy.html) ·
[Changelog](CHANGELOG.md)

</div>

<p align="center">
  <img src="docs/images/popup-start.png" alt="Start screen" width="31%">
  &nbsp;
  <img src="docs/images/popup-job.png" alt="Job detected" width="31%">
  &nbsp;
  <img src="docs/images/popup-draft.png" alt="Generated draft" width="31%">
</p>

ProposalPilot reads the job post, writes a short proposal based only on your profile, and suggests a price and delivery time. You edit it, copy it and send it yourself. It never clicks, types or submits anything on a marketplace.

## ✨ Features

- 🎯 **Job detection** on Upwork job pages and the Best matches slider (Fiverr in progress)
- 🖱️ **Works on any site:** highlight text and open the popup, right-click → *Draft proposal with ProposalPilot*, or paste
- ✍️ **Grounded drafts:** uses only facts from your profile, with a price, a delivery estimate and a question to ask the client
- 🪟 **Floating popup** (`Alt+Shift+P`) that keeps your draft if it closes, plus a one-click side panel for long sessions
- 🎨 **Light and dark themes**, tone and length controls, local history of your last 50 drafts
- 🔒 **Private by design:** profile and history stay in your browser; job text is never stored on the server

## ⚙️ How it works

```mermaid
flowchart LR
  Page[Job post] -->|read only| Ext[Extension popup]
  Ext -->|job text + profile| API[FastAPI backend]
  API --> LLM[Groq free tier]
  LLM --> API --> Ext
  Ext --> You[You edit, copy and send]
```

The extension never holds an API key. The backend keeps the key, applies rate limits and a daily cap, and runs on free tiers (Render + Groq).

## 🚀 Getting started

**Backend** (uses a fake AI provider by default, no key needed)

```bash
cd backend
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload          # http://localhost:8000/health
```

Set `LLM_PROVIDER=groq` and `GROQ_API_KEY` in `.env` for real drafts ([free key](https://console.groq.com/keys)).

**Extension**

```bash
cd extension
npm install
npm run dev                            # opens Chrome with the extension loaded
```

**Production build**

```bash
VITE_API_BASE_URL=https://your-api.example.com npm run zip
npm run verify-zip                     # checks permissions, no localhost, manifest at root
```

## 🧱 Tech stack

| Part | Built with |
|------|------------|
| Extension | WXT, React 19, TypeScript, Tailwind CSS 4, Manifest V3 |
| Backend | FastAPI, Python 3.12, Docker, optional Redis |
| AI | Groq or Gemini (free), OpenAI or Anthropic (optional) |
| Quality | Vitest, pytest, Playwright, ESLint, Ruff, GitHub Actions |

## 🗂️ Project layout

```text
extension/   Chrome extension (popup, side panel, settings, content scripts)
backend/     FastAPI service that calls the AI provider
docs/        Privacy policy, store listing, deploy guide, runbooks (GitHub Pages)
```

## 🧪 Tests

```bash
cd extension && npm run lint && npm run typecheck && npm test
cd backend && ruff check . && pytest -q
```

CI runs both on every push. Pushing a `vX.Y.Z` tag builds, verifies and attaches the store zip to a GitHub Release.

## 🔐 Privacy

Job text and your profile are sent only when you click **Generate**, and are not stored or logged on the server. Permissions are limited to `storage`, `sidePanel`, `activeTab`, `scripting` and `contextMenus`, with page access only on Upwork and Fiverr. Details: [privacy policy](docs/privacy-policy.md) and [permissions](docs/permissions.md).

## 🗺️ Roadmap

- [ ] Chrome Web Store release
- [ ] Fiverr Briefs support on the current layout
- [ ] Microsoft Edge Add-ons

## 📄 License

[MIT](LICENSE)
