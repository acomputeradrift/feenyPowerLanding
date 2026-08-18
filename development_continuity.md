# Development continuity — feenyPowerLanding

Use this file to onboard a new agent (or Jamie) on how this repo works, where things live, and what rules to follow.

**Start here:** read this file, then `deployment.md` if the task involves shipping changes.

For the RTI proposal form (`/rti_proposal/`), also read `docs/rti_proposal/CONTINUITY.md` — that is the short catch-up for look, copy, and form-behavior work. Do not reload the full spec set for a visual pass.

---

## What this repo is

**feenyPowerLanding** is the production codebase for [feenypowerandcontrol.com](https://www.feenypowerandcontrol.com).

| Item | Value |
|------|--------|
| GitHub | https://github.com/acomputeradrift/feenyPowerLanding.git |
| Default branch | `master` |
| Live domain | https://www.feenypowerandcontrol.com |
| Stack | Node.js + Express, static HTML/CSS/JS frontend, MongoDB |

There is **no GitHub Actions CI/CD**. Changes are developed locally, pushed to GitHub, then pulled on the Ubuntu server manually. See `deployment.md`.

---

## Related repo (drafts only)

| Repo | Role |
|------|------|
| **workGenerationAutomation** | Idea generator — briefs, automation docs, FAQ **drafts** in `faq-hub/` |
| **feenyPowerLanding** (this repo) | Production site only |

When migrating content from drafts (e.g. FAQ):

- Copy production-ready files into this repo.
- Adapt paths to site-root style (`/styles/...`, `/images/...`).
- Add any new Express routes in `backend/fpc_server.js`.
- **Do not delete** source files in `workGenerationAutomation`.

Handoff example: `workGenerationAutomation/faq-hub/FEENY_POWER_LANDING_HANDOFF.md`

---

## Repo layout

```
feenyPowerLanding/
  frontend/                    # Static pages, assets
    consultation.html          # Main landing page (homepage redirect target)
    faq.html                   # Dealer FAQ page
    rti_proposal.html          # RTI programming budget form
    upload_files.html          # RTI diagnostics — upload
    process_files.html         # RTI diagnostics — process/view
    styles/
      global.css               # Site-wide base styles — shared, avoid breaking changes
      consultation.css         # Landing/FAQ shared layout — shared, avoid breaking changes
      faq.css                  # FAQ-only styles (accordion, green links)
      rti_proposal.css         # Proposal form only (08-design-system.md)
      upload_files.css
      process_files.css
    scripts/
      consultation.js          # Calendly popup + RTI logo click handler
      proposal/                # Schema-driven RTI proposal form (vanilla ES modules)
      upload_files.js
      process_files.js
      filterLogs.js
      utils/
    images/
    fonts/
  backend/
    fpc_server.js              # Main Express entry point — page routes + static file serving
    routes/
      upload.js                # POST /api/upload
      process.js               # POST /api/process
      retrieve.js              # POST /api/retrieve
    models/
      LogFile.js
      MapFile.js
      User.js
    proposal/                  # RTI proposal form. Calc is server-side only; shared schema is served to the browser.
      calc/
        rates.js               # Minute-per-unit values. Never served to the browser.
        systemData.js
        hoursData.js
        fixtures/
      shared/                  # Schema + validation. Served to the browser; no rates.
    RTI_log_analysis/          # RTI log parsing/analysis subsystem
    uploads/                   # Uploaded log/map files (runtime; not always in git)
    package.json
  docs/rti_proposal/           # Constraining specifications for the proposal form
  .gitignore                   # Ignores .env only
  development_continuity.md    # This file
  deployment.md                # Local ↔ server sync guide
```

---

## How the server works

**Entry point:** `backend/fpc_server.js` (ES modules — `"type": "module"` in `backend/package.json`).

**Static assets** are served from `frontend/` via explicit mounts:

- `/styles` → `frontend/styles`
- `/scripts` → `frontend/scripts`
- `/images` → `frontend/images`

**HTML page routes** (each needs an `app.get(...)` in `fpc_server.js`):

| URL | File |
|-----|------|
| `/` | Redirect → `/consultation` |
| `/consultation` | `frontend/consultation.html` |
| `/faq` | `frontend/faq.html` |
| `/rti_proposal` | Redirect → `/rti_proposal/` |
| `/rti_proposal/` | `frontend/rti_proposal.html` |
| `/rti_proposal/audit/:reference` | Server-rendered audit table. Disabled unless `PROPOSAL_AUDIT_TOKEN` is set. Not linked from any public page. |
| `/rti_diagnostics/` | Redirect → `/rti_diagnostics/upload_files/` |
| `/rti_diagnostics/upload_files/` | `frontend/upload_files.html` |
| `/rti_diagnostics/process_files/` | `frontend/process_files.html` |

**API routes:**

| Method | Path | Router |
|--------|------|--------|
| POST | `/api/upload` | `routes/upload.js` |
| POST | `/api/process` | `routes/process.js` |
| POST | `/api/retrieve` | `routes/retrieve.js` |
| POST | `/api/proposal/estimate` | `routes/proposal.js` — hours totals only, no rates |
| POST | `/api/proposal` | `routes/proposal.js` — persist submission, then PDF, then email |

**MongoDB:** connected in `fpc_server.js` via `MONGO_URI` from `.env`. Required. The process exits at startup if it is unset. Required for RTI diagnostics and for persisting proposal submissions.

**Environment:** `backend/.env` is gitignored. Expected variables:

- `MONGO_URI` — required. Process exits if unset. Local typical value: `mongodb://localhost:27017/testdb`. Production uses the server `.env` value.
- `PORT` — defaults to `3000`
- `PROPOSAL_EMAIL_ENABLED` — must be the string `true` to send real proposal mail; otherwise the payload is written to `backend/proposal/email/outbox/`
- `PROPOSAL_EMAIL_API_KEY`, `PROPOSAL_EMAIL_FROM`, `PROPOSAL_EMAIL_BCC` — Resend. Real mail only if `PROPOSAL_EMAIL_ENABLED` is the string `true`.
- `PROPOSAL_AUDIT_TOKEN` — shared secret for `GET /rti_proposal/audit/:reference`. If unset or empty the route is disabled (404). Supply as `?token=` or `X-Proposal-Audit-Token`.
- `PROPOSAL_IP_HASH_SALT` — salt for hashing submitter IPs; if unset, no hash is stored

---

## Frontend conventions

### Asset paths in HTML

Production HTML uses **site-root absolute paths**, matching `consultation.html`:

```html
<link rel="stylesheet" href="/styles/global.css">
<script src="/scripts/consultation.js"></script>
<img src="/images/feeny-logo-white.png" alt="...">
```

Do not use relative paths like `styles/global.css` or hardcoded `https://www.feenypowerandcontrol.com/images/...` in production pages.

### CSS rules

- **Shared styles:** `global.css`, `consultation.css` — used by landing and FAQ pages. Avoid unrelated edits.
- **Page-specific styles:** add a new file under `frontend/styles/` (e.g. `faq.css`) rather than bloating shared CSS.
- FAQ accordion and green link styling live only in `faq.css`.

### Shared JavaScript gotcha — RTI logo

`frontend/scripts/consultation.js` is loaded on both `/consultation` and `/faq`. It:

1. Wires all `.calendly-button` elements to Calendly popup (`feeny-jamie/programming-consultation`).
2. Attaches a click handler on `.partners img[alt="RTI Logo"]` → `/rti_diagnostics`.

On `/consultation`, the RTI logo is also wrapped in `<a href="/rti_diagnostics/">`. On `/faq`, the logo is a plain `<img>`, so only the JS handler applies.

If FAQ should **not** link RTI logo to diagnostics, either use a FAQ-only script or remove the global RTI handler (ask Jamie before changing shared behavior).

### Calendly

Both landing and FAQ pages load:

- `https://assets.calendly.com/assets/external/widget.css`
- `https://assets.calendly.com/assets/external/widget.js`
- `/scripts/consultation.js`

---

## RTI diagnostics subsystem

Separate feature area for dealers uploading RTI log files.

- **UI:** `upload_files.html`, `process_files.html`
- **Analysis:** `backend/RTI_log_analysis/` (driver-specific handlers, xlsx export, etc.)
- **Upload storage:** `backend/uploads/` locally; production code in `routes/process.js` hardcodes server path `/root/feenyPowerLanding/backend/uploads`

When changing upload/process paths, check both local relative paths (`routes/upload.js` uses `../uploads`) and the hardcoded production path in `process.js`.

---

## Local development

```bash
cd backend
npm install          # first time or after dependency changes
node fpc_server.js
```

Server runs at **http://localhost:3000** (or `PORT` from `.env`).

Quick checks:

| Page | URL |
|------|-----|
| Landing | http://localhost:3000/consultation |
| FAQ | http://localhost:3000/faq |
| RTI proposal | http://localhost:3000/rti_proposal/ |
| RTI upload | http://localhost:3000/rti_diagnostics/upload_files/ |

MongoDB must be reachable for RTI API flows. Static pages (consultation, FAQ) work without MongoDB; the server will log a connection error but still serve HTML.

Calculator tests (no server required):

```bash
cd backend
npm test
```

---

## Agent working rules

1. **Minimize scope** — only change what the task requires.
2. **Match existing patterns** — copy `consultation.html` structure for new marketing pages.
3. **New pages need a route** — add `app.get(...)` in `fpc_server.js` for every new HTML page.
4. **Do not commit unless asked** — Jamie commits explicitly.
5. **Do not push unless asked** — deployment is a separate step; see `deployment.md`.
6. **Never commit secrets** — `.env`, credentials, API keys stay out of git.
7. **Never delete workGenerationAutomation** source when copying drafts here.
8. **Never run destructive git commands** (force push, hard reset) unless explicitly requested.
9. **Do not edit `frontend/styles/global.css` or `frontend/styles/consultation.css`.** They are shared by live pages. New pages get their own stylesheet.
10. **Per-zone minute rates never leave the server.** `backend/proposal/calc/` is not mounted statically.

---

## Production server (reference)

Details and step-by-step deploy commands are in `deployment.md`. Quick facts:

| Item | Value |
|------|--------|
| Provider | DigitalOcean (droplet hostname: `fpcwebsite-sfo3`) |
| SSH | `ssh my-do-server` (see `~/.ssh/config` on Jamie's Mac) |
| Server IP | `161.35.236.81` |
| SSH user | `root` |
| Repo on server | `/root/feenyPowerLanding` |
| Process manager | PM2 |
| PM2 process name | **`FPC Website`** (not `fpc_server`) |

---

## Recent changes log

| Date | Change |
|------|--------|
| 2026-08-13 | Added `/faq` page (`frontend/faq.html`, `frontend/styles/faq.css`, route in `fpc_server.js`). Deployed to production. |
| 2026-08-17 | Restored this file and `deployment.md` (written 13 Aug, never committed). Golden-master fixture and ported hour calculators under `backend/proposal/calc/`. Shared question schema and validation under `backend/proposal/shared/`. `POST /api/proposal/estimate` plus static mount `/scripts/proposal/shared`. No existing pages or shared CSS were changed. |
| 2026-08-17 | Schema-driven RTI proposal form at `/rti_proposal/` (`frontend/rti_proposal.html`, `frontend/styles/rti_proposal.css`, `frontend/scripts/proposal/`). Live hours total via debounced `POST /api/proposal/estimate`. |
| 2026-08-17 | `POST /api/proposal` persists a `ProposalSubmission` first (`emailStatus: pending`), then PDF, then email (FR-15). Real mail only if `PROPOSAL_EMAIL_ENABLED=true`; otherwise write to `backend/proposal/email/outbox/`. |
| 2026-08-17 | pdfmake proposal document matching the production Google Docs export (cover / gold systems page / steel equipment page). Named items listed when supplied. |
| 2026-08-17 | Audit view at `GET /rti_proposal/audit/:reference` (FR-20, FR-21). Token-gated, noindex, no-store. The only surface that shows per-zone rates. |
| 2026-08-17 | `MONGO_URI` is required at startup. Missing or empty value exits the process. No `testdb` fallback. |
| 2026-08-17 | Proposal email via Resend. Reply-To / BCC: Jamie's Gmail. |
| 2026-08-18 | Proposal form: no live hours on the public page; rooms/floors min 1; exterior names; repeats sit under their count; source type Other → Custom; no AV receiver names; global controller types iPhone/iPad/Touchscreen; at least one controller required. Type selects are required. Session workflow is localhost-first, then commit/push/server pull when Jamie asks. See `docs/rti_proposal/CONTINUITY.md`. |
