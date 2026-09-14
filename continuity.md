# continuity — feenyPowerLanding

**Read this first.** Catch-up for agents on [feenypowerandcontrol.com](https://www.feenypowerandcontrol.com).

| | |
|---|---|
| GitHub | https://github.com/acomputeradrift/feenyPowerLanding.git |
| Branch | `master` |
| Stack | Node/Express, static HTML/CSS/JS, MongoDB |
| Deploy | Manual — see `deployment.md` (no CI/CD). **Exception: Sentinel Lite** — ship from the Sentinel (Lite) repo with `tools/ship.py`; do not hand-edit `frontend/sentinel_lite/`. |

Drafts live in **workGenerationAutomation**; production code lives here. Do not delete draft sources when copying content in.

## Local dev

```bash
cd backend && npm install   # first time
node fpc_server.js          # http://localhost:3000
```

`backend/.env` is gitignored and required. **`MONGO_URI` must be set** or the process exits. Develop on localhost; hard-refresh after CSS/JS changes. Node does not hot-reload. Do **not** commit, push, or deploy unless Jamie asks.

Unit tests (calculator, no server): `cd backend && npm test`

## Site map

| URL | What |
|-----|------|
| `/` | Redirect → `/consultation` |
| `/consultation` | Main landing — Calendly, partner logos |
| `/faq` | Dealer FAQ — accordion, Calendly, links to `/rti_proposal/` |
| `/rti_proposal/` | RTI programming budget form → PDF + email |
| `/rti_proposal/preview.pdf` | PDF preview — **localhost only** |
| `/rti_proposal/audit/:reference` | Token-gated rate audit (404 unless env token set) |
| `/idea-feedback/` | Hidden HMAC-signed confirm page for overnight idea thumbs (GET never writes) |
| `/rti_diagnostics/upload_files/` | RTI log upload |
| `/rti_diagnostics/process_files/` | Log analysis results |

**API:** `POST /api/upload`, `/api/process`, `/api/retrieve` (diagnostics) · `POST /api/proposal/estimate`, `/api/proposal` (proposal)

Entry point: `backend/fpc_server.js`. Every new HTML page needs an `app.get(...)` route there.

## Repo layout

```
frontend/            HTML, styles/, scripts/, images/
backend/
  fpc_server.js      Routes + static mounts
  routes/            Express routers
  models/            MongoDB (LogFile, MapFile, ProposalSubmission, …)
  proposal/          RTI proposal — calc/ (server-only rates), shared/ (schema), pdf/, email/
  RTI_log_analysis/  Log parsing for diagnostics
  uploads/           Runtime upload storage
docs/rti_proposal/   Specs + agent_brief.md for proposal form work
```

Static mounts: `/styles`, `/scripts`, `/images`. Proposal schema also at `/scripts/proposal/shared/`.

## Frontend rules

- HTML uses **site-root paths**: `/styles/...`, `/scripts/...`, `/images/...` (see `consultation.html`).
- **Do not edit** `frontend/styles/global.css` or `consultation.css` — shared by live pages. New pages get their own CSS.
- `consultation.js` on landing + FAQ: Calendly popup + RTI logo → `/rti_diagnostics`.
- **Per-zone rates never reach the browser.** `backend/proposal/calc/` is not served statically.

## Components

**Marketing** — `consultation.html`, `faq.html` · shared layout CSS + page CSS (`faq.css`) · Calendly via `consultation.js`.

**RTI proposal form** — Replaced the retired Google Form AutoProposal. Vanilla ES modules, schema-driven. For form/PDF/CSS work, read **`docs/rti_proposal/agent_brief.md` next** — do not load the full spec set for a visual pass. Key: `frontend/rti_proposal.html`, `styles/rti_proposal.css`, `scripts/proposal/`, `backend/proposal/`, `routes/proposal.js`. Deep specs: `docs/rti_proposal/README.md`.

Current product (`SCHEMA_VERSION` `2026.5`, `RATE_CARD_VERSION` `2026.2`): Custom audio/video is **33 min** and never cloned. Audio types are Streamer / Turntable / Custom (no Tuner). Video types are Media Player / Cable / Satellite / Box / Blu-ray Player / Game Console / Custom. Distributed video zones require at least one video source; audio sources may be 0. Motorized lifts/mounts appear under displays (0 allowed; first discrete, rest cloned at the 22/11 device rate). Every help line ends with a period.

**RTI diagnostics** — Dealers upload RTI logs; analysis in `backend/RTI_log_analysis/`. Uploads in `backend/uploads/` (production path hardcoded in `routes/process.js` as `/root/feenyPowerLanding/backend/uploads`).

## Environment (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | **Required** at startup |
| `PORT` | Default `3000` |
| `PROPOSAL_EMAIL_ENABLED` | String `true` sends real mail via Resend |
| `PROPOSAL_EMAIL_*` | Resend config; To is always `feeny.jamie@gmail.com` |
| `PROPOSAL_AUDIT_TOKEN` | Enables audit route when set |
| `PROPOSAL_IP_HASH_SALT` | Optional IP hashing on submit |
| `IDEA_FEEDBACK_HMAC` | Same value as Cursor Cloud Secret; required for `/idea-feedback/` |

Local and server each have their own `.env` — not synced via git.

## Production (quick ref)

| | |
|---|---|
| SSH | `ssh my-do-server` |
| Repo | `/root/feenyPowerLanding` |
| PM2 name | **`FPC Website`** (not `fpc_server`) |

Full deploy: `deployment.md`. Sentinel Lite UI/engine releases: run `tools/ship.py` from the sibling **Sentinel (Lite)** repo — see `deployment.md` § Sentinel Lite.

## Agent rules

1. Minimize scope — match existing patterns.
2. New public page = HTML file + route in `fpc_server.js`.
3. Never commit secrets or run destructive git unless asked.
4. Never revive RTI AutoProposal (Google Form) — dead.
5. Do not link audit or preview PDF from public pages.
6. Never hand-edit `frontend/sentinel_lite/` — it is generated by Sentinel Lite’s `tools/ship.py`.

## Related docs

| Doc | When |
|-----|------|
| `deployment.md` | Shipping to production |
| `deployment.md` § Sentinel Lite | Releasing `/sentinel_lite/` (from the other repo) |
| `docs/rti_proposal/agent_brief.md` | Proposal form look, copy, behavior |
| `docs/rti_proposal/README.md` | Spec index for proposal deep dives |