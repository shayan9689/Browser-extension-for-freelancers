# Chrome Web Store listing (ready to paste)

## Name (max 75)

ProposalPilot - AI Proposal Drafts for Freelancers

## Summary (max 132)

Reads the job post you are viewing and drafts a tailored proposal with a price and delivery estimate. You review and send.

## Single purpose

Drafts a tailored freelance proposal from the job post the user is currently viewing.

## Category

Productivity

## Detailed description

ProposalPilot helps freelancers draft better proposals faster.

How it works:
1. Open a freelance job post in Chrome.
2. Open the ProposalPilot side panel.
3. Detect the job (or highlight text and use selected text).
4. Generate a draft proposal with a suggested price and delivery estimate.
5. Edit, copy, and paste it yourself into the marketplace. ProposalPilot never submits for you.

Privacy:
- Job text and your profile are sent only to your configured backend / LLM provider when you generate.
- History and profile stay on your device.
- No accounts. No auto-submit. No bulk scraping.

Limits:
- You must review every draft. The AI only uses facts from your saved profile.

## Permission justifications

See `docs/permissions.md`.

## Data usage disclosure

- Handles website content (job text from the page you view) and user-provided profile text.
- Data is not sold.
- Data is not used for unrelated purposes.
- Data is not used for creditworthiness or lending.

## Reviewer test instructions

1. Install the extension.
2. Complete the short profile form (name, headline, one skill is enough).
3. Open the hosted demo page: `docs/demo/job-post.html` (publish via GitHub Pages) OR any page, select the job text.
4. Open the side panel → Use selected text → Generate proposal.
5. Expect an editable draft; Copy should place text on the clipboard.
6. Backend must be reachable at the production HTTPS API configured in the build.

## Screenshot checklist

1. Idle / open a job post
2. Job detected with skills
3. Generating state
4. Result with price + delivery chips
5. Settings / profile page
