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
3. Detect the job on Fiverr or Upwork. On any other site, highlight the job text, right-click and choose "Draft proposal with ProposalPilot", or paste the text into the panel.
4. Generate a draft proposal with a suggested price and delivery estimate.
5. Edit, copy, and paste it yourself into the marketplace. ProposalPilot never submits for you.

Privacy:
- Job text and your profile are sent to the ProposalPilot server and our AI provider (Groq) only when you click Generate, and are not stored on the server.
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
3. Select the job title and description with the mouse.
4. Right-click the selection and choose **Draft proposal with ProposalPilot**. The side panel opens with the job ready.
   (Alternative: open the panel from the toolbar icon, expand **Paste job text**, paste the text and click **Use this text**.)
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

## Support email

supportextension9@gmail.com
