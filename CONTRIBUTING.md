# Contributing

## Development

1. Read `PRD.md` and `PROGRESS.md`.
2. Work one phase at a time; do not skip verification gates.
3. Extension: `cd extension && npm install && npm run dev`
4. Backend: `cd backend && pip install -r requirements-dev.txt && uvicorn app.main:app --reload`

## Site stopped working

Open an issue with:

- Which site (Fiverr / Upwork / other)
- Page type (job post / home / search) — not a private client URL if sensitive
- A saved HTML sample with personal/client names removed (`Webpage, HTML only`)
- What the side panel showed (error code if any)
