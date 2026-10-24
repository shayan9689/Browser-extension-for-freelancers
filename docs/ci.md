# CI notes

- Workflow: `.github/workflows/ci.yml`
- Extension job: lint, typecheck, unit tests, fixture health check, build, zip artifact
- Backend job: ruff + pytest

## Branch protection (recommended)

On GitHub → Settings → Branches → protect `main`:

- Require status checks: `extension`, `backend`
- Require pull request reviews (optional for solo)

## Local commands

```bash
cd extension && npm run lint && npm run typecheck && npm run test && npm run check:fixtures && npm run build
cd backend && ruff check . && pytest -q
```
