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
- Job text and your profile are sent to the ProposalPilot server and OpenAI only when you click Generate, and are not stored on the server.
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

No marketplace account is needed.

1. Install the extension. The profile page opens automatically: fill in name, headline and at least one skill, then save.
2. Open the demo job post: https://shayan9689.github.io/Browser-extension-for-freelancers/demo/job-post.html
3. Click the ProposalPilot toolbar icon to open the side panel.
4. Select the job text on the demo page with the mouse, then click **Use selected text** in the panel.
5. Click **Generate proposal**. Expected: within ~20 seconds an editable draft appears with a suggested price and delivery estimate.
6. Click **Copy**: the draft is placed on the clipboard. Nothing is ever submitted to any website.

## Store artwork

- Store icon (128x128, 96px art + padding): `extension/store-assets/store-icon-128.png`
- Small promo tile (440x280): `extension/store-assets/promo-small-440x280.png`
- Regenerate with `npm run icons` (source: `extension/assets/store/icon.svg`)

## Screenshot checklist (1280x800, taken on the demo page)

1. Idle / open a job post
2. Job detected with skills
3. Generating state
4. Result with price + delivery chips
5. Settings / profile page

## Privacy policy URL

https://shayan9689.github.io/Browser-extension-for-freelancers/privacy-policy.html
