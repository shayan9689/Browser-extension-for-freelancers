# Privacy Policy — ProposalPilot

**Last updated:** 2026-10-30

ProposalPilot helps freelancers draft proposals from the job post they are viewing.

## What we collect / process

When you click **Generate proposal**, the extension sends:

- The job text extracted (or selected) from the page you are viewing
- The profile text you saved locally (name, headline, skills, experience, rate, highlights)
- An anonymous `install_id` used only for rate limiting

The ProposalPilot server also sees your IP address, as any web server does. It is used only for rate limiting and abuse prevention.

## What we do **not** do

- We do **not** store or log job text or profile text on the server
- We do **not** create user accounts
- We do **not** sell your data
- We do **not** use your data for creditworthiness, lending, or unrelated advertising
- History and profile remain on your device in `chrome.storage.local` until you export or delete them

## Third parties

The ProposalPilot server sends the job text and your profile text to OpenAI to generate the draft, and for no other purpose. OpenAI processes it under its API data policy (https://openai.com/policies/api-data-usage-policies).

## Data retention

Server-side: none for job/profile content. Rate-limit counters keep the anonymous `install_id` and IP address temporarily (in memory or Redis) and expire automatically.

On-device: until you clear them via **Delete all data** in Settings.

## Contact

Questions or deletion requests: [supportextension9@gmail.com](mailto:supportextension9@gmail.com)
