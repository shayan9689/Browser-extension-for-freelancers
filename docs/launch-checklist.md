# Launch checklist (Phases 9–12, the manual parts)

Code for every phase is done. These are the steps only the owner can do, in order.
Tick them off as you go.

Public URLs (GitHub Pages, serves `docs/`):

- Privacy policy: https://shayan9689.github.io/Browser-extension-for-freelancers/privacy-policy.html
- Reviewer demo page: https://shayan9689.github.io/Browser-extension-for-freelancers/demo/job-post.html

## A. Accounts and limits (15 min)

- [x] Support inbox: supportextension9@gmail.com (in privacy policy and listing).
- [ ] OpenAI dashboard → create a **project API key** for ProposalPilot.
- [ ] OpenAI dashboard → Limits: set a monthly budget (e.g. $10) and an email alert at 50%.
- [ ] Generate an admin secret for `/v1/ping-llm`, e.g. `python -c "import secrets; print(secrets.token_urlsafe(32))"`.

## B. Deploy the backend on Render (Phase 9, ~20 min)

1. [ ] render.com → sign in with GitHub → **New → Web Service** → pick
       `shayan9689/Browser-extension-for-freelancers`.
2. [ ] Settings: **Root Directory** `backend`, **Runtime** Docker, region nearest your users,
       instance type Free (or Starter at ~$7/mo to avoid cold starts).
3. [ ] Environment variables:

       ENV=production
       LLM_PROVIDER=openai
       OPENAI_API_KEY=<your key>
       ALLOWED_ORIGINS=chrome-extension://placeholder   (replaced in step C)
       RATE_LIMIT_PER_HOUR=20
       DAILY_REQUEST_CAP=200
       ADMIN_PING_SECRET=<secret from A>
       LLM_MODEL=                                        (blank = gpt-4o-mini)

4. [ ] Recommended: **New → Key Value** (free, same region) → copy its *internal* URL →
       add `REDIS_URL=<url>` to the web service.
5. [ ] Health check path: `/health`. Create the service and wait for "Live".
6. [ ] Backend URL: `https://proposalpilot-api-awbv.onrender.com`.
7. [ ] Verify (gate):
       - Open `https://<your-api>/health` on your phone with Wi-Fi off → `{"status":"ok",...}`
       - `curl -H "x-admin-secret: <secret>" https://<your-api>/v1/ping-llm` → `{"status":"ok"}`
8. [ ] UptimeRobot (free) → New monitor → HTTP(s) → `https://<your-api>/health`, 5 min, email alert.
       Suspend the Render service once to confirm the alert email arrives, then resume.

## C. Production build and real-browser test (Phase 10, ~30 min)

The developer sets the GitHub repo variable `API_BASE_URL` and cuts the `v1.0.0` release; the
release workflow builds and verifies the zip and attaches it to the GitHub Release. Then:

1. [ ] Download the zip from the GitHub Release and unzip it into a folder.
2. [ ] In a **new Chrome profile**: `chrome://extensions` → Developer mode → Load unpacked → that folder.
3. [ ] Copy the extension ID shown on the card. In Render set
       `ALLOWED_ORIGINS=chrome-extension://<that id>` and save (it redeploys).
4. [ ] Run the full flow on the demo page (see "Reviewer test instructions" in `docs/store-listing.md`).
       A real draft must appear. Also run `docs/manual-qa.md`.
5. [ ] Ask a friend to follow only the reviewer instructions; they must succeed without help.
6. [ ] Screenshots: 5 images at exactly **1280x800**, from the demo page, no client data,
       no marketplace logos. Use the list in `docs/store-listing.md`. Tip: set the Chrome window so
       the page plus side panel fill 1280x800, then use Win+Shift+S and crop/resize to 1280x800.
7. [ ] Open the privacy policy URL in an incognito window: it must load publicly.

## D. Publish to the Chrome Web Store (Phase 11, ~1 hr + review wait)

1. [ ] https://chrome.google.com/webstore/devconsole → sign in with the Google account that will
       own the extension → accept the agreement → pay the one-time registration fee.
2. [ ] Account tab: developer email (cannot be changed later), publisher name, enable 2-Step
       Verification, turn on notifications.
3. [ ] **Add new item** → upload the release zip.
4. [ ] Store listing tab: paste from `docs/store-listing.md`; category Productivity; upload
       `extension/store-assets/store-icon-128.png`, the 5 screenshots and
       `extension/store-assets/promo-small-440x280.png`.
5. [ ] Privacy tab: single purpose, each permission justification (`docs/permissions.md`),
       "No, I am not using remote code", the data-usage answers, the three certifications,
       and the privacy policy URL above.
6. [ ] Distribution: Public (or Unlisted for a soft launch), all regions, Free.
7. [ ] Test instructions: paste the reviewer instructions (they include the demo URL).
8. [ ] Package tab: copy the **store extension ID**. In Render set
       `ALLOWED_ORIGINS=chrome-extension://<store id>,chrome-extension://<unpacked id from C>`.
9. [ ] Submit for review. Watch email; review usually takes days.
10. [ ] After approval: install from the store link in a clean profile and run the full flow.
        Then remove the unpacked ID from `ALLOWED_ORIGINS`.

If rejected: fix only the cited policy, bump the version (`cd extension && npm run bump -- patch`, update CHANGELOG, push tag `vX.Y.Z`), and resubmit.
See `docs/incident-playbook.md`.

## E. Post-launch (Phase 12)

- [ ] Optional automated publishing: add repo secrets `CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`,
      `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN` (Chrome Web Store API OAuth client).
      Tag pushes then upload a draft; set repo variable `CWS_AUTO_PUBLISH=true` to auto-submit.
- [ ] README: add the store link, a demo GIF and screenshots; add repo topics
      (chrome-extension, ai, freelance, proposal-generator, llm, manifest-v3) and pin the repo.
- [ ] Weekly: store reviews, installs/uninstalls, OpenAI spend per proposal, uptime alerts.
