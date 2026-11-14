# Chrome Web Store listing (ready to paste)

## Name (max 75)

ProposalPilot - AI Proposal Drafts for Freelancers

## Summary (max 132)

Drafts a tailored proposal from the job you are viewing, using your niche profile, with a fair price and delivery time.

## Single purpose

Drafts a tailored freelance proposal from the job post the user is currently viewing.

## Category

Productivity

## Detailed description

ProposalPilot helps freelancers write better proposals faster, from their real experience.

Set up once:
- A welcome page guides you through your profile in four short steps.
- Create one profile per niche (web development, WordPress, design, data...). The best match is picked for each job, and you can switch.

Draft in seconds:
1. Open a freelance job post and click the ProposalPilot icon (or press Alt+Shift+P).
2. The job is detected on Fiverr and Upwork. On any other site, highlight the job text and right-click "Draft proposal with ProposalPilot", or paste it.
3. Choose a tone and length, then click Generate.
4. Get a short, specific draft, a fair price based on working hours and your rate, a competitive delivery time and a question to ask the client.
5. Edit, copy and send it yourself. ProposalPilot never submits anything for you.

Also:
- In your Fiverr inbox, find out whether a client actually described a project or just said hello.
- Optional sign-in with Google backs up your profiles and proposal history and syncs them across computers.
- Light and dark themes.

Privacy:
- Job text and the chosen profile are sent to our server and our AI provider (Groq) only when you click Generate, and are not stored there.
- Fiverr chats are checked only when you click Check for project, with names removed.
- Without sign-in, profiles and history stay in your browser. With sign-in, they are stored in your private account.
- No auto-submit. No bulk scraping.

## Permission justifications

See `docs/permissions.md`. New in 1.1.0:

**identity:** Used only when the user clicks "Sign in with Google" to turn on optional cloud sync. chrome.identity.launchWebAuthFlow opens Google's sign-in window and returns the result to the extension, so profiles and proposal history can be backed up and synced. No sign-in happens unless the user asks for it.

## Data usage disclosure (Privacy tab)

Tick:

- **Personally identifiable information**: name in the profile; name and email from Google when the user signs in
- **Authentication information**: the sign-in session stored when the user signs in with Google
- **Personal communications**: messages of an open Fiverr inbox conversation, only when the user clicks Check for project, with names removed
- **Website content**: job text from the page the user is viewing

Certify:

- Data is not sold to third parties.
- Data is not used or transferred for purposes unrelated to the single purpose.
- Data is not used or transferred to determine creditworthiness or for lending.

## Reviewer test instructions (under 500 characters)

```
No account needed. 1) Install: the welcome page opens. Click Set up your profile, fill the 4 steps (any name, 3 skills, 1 achievement), Finish. 2) Open https://shayan9689.github.io/Browser-extension-for-freelancers/demo/job-post.html and select the job text. 3) Click the toolbar icon, choose a Tone and Length, click Generate proposal. A draft with price and delivery appears in ~20s. Google sign-in in Settings is optional.
```

## Store artwork

- Store icon (128x128, 96px art + padding): `extension/store-assets/store-icon-128.png`
- Small promo tile (440x280): `extension/store-assets/promo-small-440x280.png`
- Regenerate with `npm run icons` (source: `extension/assets/store/icon.svg`)

## Screenshots (1280x800, ready to upload)

Files in `extension/store-assets/screenshots/`, in this order. Content is made up; no marketplace
names or logos.

1. `screenshot-1-detect.png`: job ready, tone and length chosen first
2. `screenshot-2-draft.png`: generated draft with price and delivery
3. `screenshot-3-setup.png`: guided four-step profile setup
4. `screenshot-4-profiles.png`: niche profiles, history and cloud sync
5. `screenshot-5-chat.png`: inbox chat checked for a project

## Privacy policy URL

https://shayan9689.github.io/Browser-extension-for-freelancers/privacy-policy.html

## Support email

supportextension9@gmail.com
