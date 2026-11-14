# Privacy Policy — ProposalPilot

**Last updated:** 2026-11-15

ProposalPilot helps freelancers draft proposals from the job post they are viewing.

## What we collect / process

When you click **Generate proposal**, the extension sends:

- The job text extracted (or selected) from the page you are viewing
- The profile you chose for that job (name, headline, skills, experience level, years, rate, achievements)
- An anonymous `install_id` used only for rate limiting

When you click **Check for project** in a Fiverr inbox conversation, the extension sends the messages of that open conversation so the AI can tell whether the client described a project. Each message is labelled only as "client" or "me": usernames and display names are removed first. The conversation is not stored or logged on the server.

The ProposalPilot server also sees your IP address, as any web server does. It is used only for rate limiting and abuse prevention.

## Optional account and cloud sync

Signing in is optional. Without it, everything stays in your browser.

If you click **Sign in with Google**:

- Google shares your **name, email address and profile picture** with our authentication provider, Supabase. We use them only to identify your account and show who is signed in.
- Your **profiles** (all fields you entered) and your **proposal history** (job title, platform, draft text, suggested price, the profile used and the date) are stored in our Supabase database so they can be restored and synced across your browsers.
- Row level security limits every account to its own data. We do not read, share or analyse it.
- A sign-in session is kept in `chrome.storage.local` so you stay signed in. **Sign out** removes it.

## What we do **not** do

- We do **not** store or log job text, conversation messages or profile text on the AI server
- We do **not** create an account unless you choose to sign in
- We do **not** sell your data
- We do **not** use your data for creditworthiness, lending, or unrelated advertising
- Without sign-in, history and profiles remain on your device in `chrome.storage.local` until you export or delete them

## Third parties

- **Groq** (AI model provider): the ProposalPilot server sends the job text and the chosen profile to Groq to generate the draft, and for no other purpose. Groq processes it under its API data policy (https://console.groq.com/docs/your-data) and privacy policy (https://groq.com/privacy-policy).
- **Supabase** (database and sign-in, only if you sign in): stores your account, profiles and proposal history. Privacy policy: https://supabase.com/privacy
- **Google** (sign-in, only if you sign in): verifies your Google account. Privacy policy: https://policies.google.com/privacy

## Data retention and deletion

- AI server: none for job, conversation or profile content. Rate-limit counters keep the anonymous `install_id` and IP address temporarily and expire automatically.
- Cloud sync: kept until you delete it. Deleting a profile or draft in the extension also deletes it from your account on the next sync. Only your 300 most recent drafts are kept.
- On-device: until you clear it with **Delete local data** in Settings.
- To delete your account and all synced data, email us from the address you signed in with. We delete it within 30 days.

## Contact

Questions or deletion requests: [supportextension9@gmail.com](mailto:supportextension9@gmail.com)
