# Incident playbook

## Extension rejected / taken down

1. Read the exact policy cited in the email.
2. Fix only that issue; bump version (`cd extension && npm run bump -- patch`, update CHANGELOG); tag `vX.Y.Z` to build the zip; resubmit.
3. Common causes: unused permissions, privacy mismatch, trademarks, reviewers cannot test.

## Marketplace markup changed

1. Save a fresh HTML fixture (names removed).
2. Run `npm run check:fixtures` in `/extension`.
3. Patch selectors/adapters; release a patch.
4. Keep “Use selected text” visible so users are not blocked.

## LLM provider down

1. Extension should show NETWORK/SERVER/UPSTREAM errors with Retry.
2. History, profile, and copy still work offline for past drafts.
3. Optionally set `LLM_PROVIDER=fake` temporarily (not for real users).

## Cost spike

1. Lower `DAILY_REQUEST_CAP` / `RATE_LIMIT_PER_HOUR`.
2. Confirm provider spend cap.
3. Ensure CORS allows only your extension ID.
