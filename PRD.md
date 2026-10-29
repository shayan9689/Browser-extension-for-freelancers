# ProposalPilot — Product Requirements Document

## Problem

Freelancers spend too much time rewriting similar proposals for each job post. Starting from a blank box leads to generic pitches, inconsistent pricing, and missed details from the post.

## Target user

Freelancers who bid or propose on Fiverr/Upwork-style marketplaces and want a fast, editable first draft based on the post they are already viewing.

## v1 scope

- Chrome Manifest V3 extension with a side panel
- Read job title, description, budget, and skills from the active page (or selected text fallback)
- Send job text + user profile to a self-hosted backend
- Return: proposal draft, suggested price + rationale, delivery days, clarifying questions, warnings
- Local profile, settings, and generation history
- Support Fiverr and Upwork job pages plus a generic selection fallback

## Explicit non-goals (v1)

- **No auto-submit** — the extension never clicks, types, or submits on any marketplace
- **No bulk scraping** — only the page the user is viewing, on demand
- **No accounts** — no signup, login, or cloud user accounts
- **No payments** — free tool; no in-extension billing
- No bypassing marketplace logins or ToS

## Success criteria

- On a real job page, the side panel shows correct extracted title/description/budget
- Generate returns an editable draft within ~15 seconds under normal conditions
- Proposals use only facts from the user’s profile (never invent experience)
- Network tab shows only the generation call to the user’s backend
- Extension loads without console errors; store-ready permissions and privacy policy

## Privacy principles

- Job text and profile text are sent only to our backend and the configured LLM provider for generation
- Job text is **never stored or logged** on the server
- An anonymous `install_id` is used for rate limiting only — not linked to an account
- History and profile stay on-device in `chrome.storage.local`
- Data is not sold or used for unrelated purposes
