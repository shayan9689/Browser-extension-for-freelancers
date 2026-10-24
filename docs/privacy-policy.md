# Privacy Policy — ProposalPilot

**Last updated:** 2026-10-24

ProposalPilot helps freelancers draft proposals from the job post they are viewing.

## What we collect / process

When you click **Generate proposal**, the extension sends:

- The job text extracted (or selected) from the page you are viewing
- The profile text you saved locally (name, headline, skills, experience, rate, highlights)
- An anonymous `install_id` used only for rate limiting

## What we do **not** do

- We do **not** store or log job text or profile text on the server
- We do **not** create user accounts
- We do **not** sell your data
- We do **not** use your data for creditworthiness, lending, or unrelated advertising
- History and profile remain on your device in `chrome.storage.local` until you export or delete them

## Third parties

Generation uses an LLM provider you configure on the backend (Anthropic or OpenAI). Their processing is governed by their own policies. Job/profile text is sent to that provider only to produce the draft.

## Data retention

Server-side: none for job/profile content. Rate-limit counters may keep anonymous IDs temporarily in memory (or Redis if configured).

On-device: until you clear them via **Delete all data** in Settings.

## Contact

Replace this with your support email before publishing: `support@example.com`
