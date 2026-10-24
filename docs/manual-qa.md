# Manual QA checklist

Use before every release (and after Phase 8).

- [ ] Install: Fresh Chrome profile: install, onboarding opens, profile saves.
- [ ] Detect: 3 real job posts per supported site show correct title, description, budget.
- [ ] Non-job: Home page, profile page and search page show the 'not a job post' state.
- [ ] SPA: Navigating between jobs without reload updates the panel (re-detect).
- [ ] Fallback: Highlight text on any site and generate from the selection.
- [ ] Generate: Result appears in under 15 s; no placeholders; mentions a real detail from the post.
- [ ] Edit/Copy: Edit text, copy, paste into the marketplace's proposal box: formatting intact.
- [ ] Regenerate: Tone and length changes produce visibly different output.
- [ ] Errors: Offline, backend down, rate limited, invalid response: friendly message plus retry.
- [ ] Privacy: Network tab shows only the API call. History export and delete-all work.
- [ ] Resilience: Restart Chrome, reload extension, sleep and wake the service worker: still works.
- [ ] Security: Job text containing 'ignore previous instructions' is not obeyed.
- [ ] A11y: Keyboard-only run through the whole flow; focus visible; dark mode OK.
- [ ] Perf: Side panel opens instantly; no console errors; no memory growth after 20 runs.
- [ ] Production: Zip build against the production API passes the full flow.
