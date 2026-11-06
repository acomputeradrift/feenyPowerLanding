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
| `/consultation` | Main landing — Calendly, partner logos. Dealer funnel. Unchanged by the homeowner pages. |
| `/faq` | Dealer FAQ — accordion, Calendly, links to `/rti_proposal/` |
| `/homeowners/greater-vancouver` | Homeowner landing — Greater Vancouver. Consulting, design, and specification. Not live until this branch is published. |
| `/homeowners/kelowna` | Homeowner landing — Kelowna, BC. Same offer. Not live until this branch is published. |
| `/homeowners/los-gatos` | Homeowner landing — **review only**. Los Gatos stands in for “El Gato, California” until Jamie confirms. `noindex`, not in the sitemap. |
| `/rti_proposal/` | RTI programming budget form → PDF + email |
| `/rti_proposal/preview.pdf` | PDF preview — **localhost only** |
| `/rti_proposal/audit/:reference` | Token-gated rate audit (404 unless env token set) |
| `/sentinel_lite/` | Sentinel Lite — dealer-side `.apex` compare in the browser (Pyodide). Files never leave the dealer’s machine. |
| `/idea-feedback/` | Hidden HMAC-signed confirm page for overnight idea thumbs (GET never writes) |
| `/rti_diagnostics/upload_files/` | RTI log upload |
| `/rti_diagnostics/process_files/` | Log analysis results |

**API:** `POST /api/upload`, `/api/process`, `/api/retrieve` (diagnostics) · `POST /api/proposal/estimate`, `/api/proposal` (proposal) · `POST /api/retail-enquiry` (homeowner project form) · `GET`/`POST /api/sentinel_lite/compare-count` (count-only Compare beacon; no files) · `GET /sitemap.xml`, `GET /robots.txt`

Entry point: `backend/fpc_server.js`. Every new HTML page needs an `app.get(...)` route there.

## Repo layout

```
frontend/            HTML, styles/, scripts/, images/
frontend/sentinel_lite/  Generated Sentinel Lite bundle — do not hand-edit
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

**Marketing** — `consultation.html`, `faq.html` · shared layout CSS + page CSS (`faq.css`, `testimonials.css`) · Calendly via `consultation.js`.

**Consultation testimonials** — `/consultation` shows a Happy Clients carousel between the benefits and the bottom Calendly close. One quote at a time. It loops every 8 seconds, pauses on hover or keyboard focus, and builds the dots from each `figure.testimonial`. Styles are `frontend/styles/testimonials.css` and behavior is `frontend/scripts/testimonials.js` (loaded only by `consultation.html`). Add a quote by inserting another figure in the track. Do not put this CSS in `consultation.css`.

**RTI proposal form** — Replaced the retired Google Form AutoProposal. Vanilla ES modules, schema-driven. For form/PDF/CSS work, read **`docs/rti_proposal/agent_brief.md` next** — do not load the full spec set for a visual pass. Key: `frontend/rti_proposal.html`, `styles/rti_proposal.css`, `scripts/proposal/`, `backend/proposal/`, `routes/proposal.js`. Deep specs: `docs/rti_proposal/README.md`.

Current product (`SCHEMA_VERSION` `2026.6`, `RATE_CARD_VERSION` `2026.3`): hours split into Overhead, Programming and Graphics. Global controllers are Phone, Tablet, Large Touchscreen and Small Touchscreen. Displays are always discrete. Custom audio/video is never cloned. Audio types are Streamer / Turntable / Custom (no Tuner). Video types are Media Player / Cable / Satellite / Box / Blu-ray Player / Game Console / Custom. Distributed video zones require at least one video source; audio sources may be 0. Motorized lifts/mounts appear under displays (0 allowed; first discrete, rest cloned). Every help line ends with a period. Rate card 2026.2 remains in `backend/proposal/calc/legacy/` for old submissions and the v1 preview.

**Sentinel Lite** — Live at `/sentinel_lite/`. The dealer’s `.apex` files are compared in the browser with Pyodide; this server never receives a file. The only API is `GET`/`POST /api/sentinel_lite/compare-count` (a running total, no body). Static bundle is generated — ship from the sibling **Sentinel (Lite)** repo with `tools/ship.py`. Do not edit `frontend/sentinel_lite/` here. Mount and CSP live in `fpc_server.js`.

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
| Host | DigitalOcean droplet `fpcwebsite-sfo3` |
| Repo | `/root/feenyPowerLanding` |
| Node | **22.23.4** — NodeSource `node_22.x`, `/usr/bin/node` |
| PM2 name | **`FPC Website`** (not `fpc_server`) |

**2026-10-23 — CVE-2026-111497.** Production Node moved from 18.20.5 (end of life, bundled Brotli 1.1.0) to 22.23.4, the release that cherry-picks the Brotli decoder fix. `process.versions.brotli` still prints `1.1.0`; the fix is the 22.23.4 binary, not a Brotli version bump. Apt upgrade plus PM2 resurrect and `pm2 save` only. The git checkout was left at `6978f0c2` (2026-10-09). No commit, no push, no `git pull`. Jamie’s Mac was still Node 22.20.0.

Full deploy: `deployment.md`. Sentinel Lite UI/engine releases: run `tools/ship.py` from the sibling **Sentinel (Lite)** repo — see `deployment.md` § Sentinel Lite.

## Agent rules

1. Minimize scope — match existing patterns.
2. New public page = HTML file + route in `fpc_server.js`.
3. Never commit secrets or run destructive git unless asked.
4. Never revive RTI AutoProposal (Google Form) — dead.
5. Do not link audit or preview PDF from public pages.
6. Never hand-edit `frontend/sentinel_lite/` — it is generated by Sentinel Lite’s `tools/ship.py`.

## Homeowner area pages (review, not published)

Added 2026-11-06 on `cursor/retail-area-landing-pages-b76c`. **Do not merge or deploy until Jamie has looked at the three pages and confirmed the Los Gatos place name.** `/` still redirects to `/consultation`. `consultation.html` and `faq.html` were not edited. Docs-only PR #1 (dealer “free consultation” copy, $100 USD/hr, discovery framing) was not applied.

**Offer.** Feeny Power and Control Ltd. consults, designs, and specifies Lutron, RTI, and Vantage for homeowners in these areas. A local AV company supplies and installs. We do not install, and the pages do not claim an office, a showroom, or a named install partner in any of the three places. This is a separate funnel from dealer programming. No prices, no turnaround promise, no free installation quote. The form qualifies fit. Paid consulting scope is agreed later.

**Voice.** Company “we”, matching `/consultation`. The approved line “I’ll review your enquiry…” is adapted to “We'll review your enquiry and get back to you to discuss whether consulting is the right next step. Consulting, design, and specification are paid services.” The button stays “Tell me about your project” and scrolls to the form. It does not open Calendly. The word “independent” is not used. The repo does not state an independence or authorization claim.

**Social proof.** The two `/consultation` quotes are reprinted verbatim: Daniel, The Home Automation Store, Sydney Australia; Morgan McMillan, Blue Ember Solutions, Vancouver Canada. The pages say these are integration-company comments about programming, not homeowner reviews. Blue Ember is not named as the installer for this funnel. The Vancouver history is Jamie’s own dealer-FAQ account: almost 10 years running an electrical contracting company in Vancouver, BC, in custom homes (lighting control, motorized shading, audio/video), contracting side closed in 2017. There is no Kelowna project list, no Los Gatos project, no local installation photo, and no rating in the repo. The Kelowna string in the proposal PDF tests is fixture data, not a project. None of those gaps were filled with invented quotes.

**Los Gatos assumption — confirm before publication.** Jamie called the area “El Gato, California.” The page uses Los Gatos, California, and says so in a banner. It does not treat El Gato as a municipality and does not cover the rest of California or the Bay Area. It is `noindex`, sends `X-Robots-Tag: noindex`, and is omitted from `/sitemap.xml` (`indexable: false` in `backend/retail/areas.js`). The dealer FAQ line about Bay Area dealers is described as a dealer service, not a Los Gatos office. After Jamie confirms the town: remove the banner, remove `noindex`, set `indexable: true`, and check `/sitemap.xml`. If the town is wrong, replace the page rather than widening it to California.

**Enquiry delivery.** `POST /api/retail-enquiry` reuses the existing Resend path. Mail is sent only when `PROPOSAL_EMAIL_ENABLED=true` and both `PROPOSAL_EMAIL_API_KEY` and `PROPOSAL_EMAIL_FROM` are set. The recipient is the existing inbox `feeny.jamie@gmail.com` (same constant as proposal mail). No new account and no secret in git. If mail is not enabled, the API returns 503 `delivery_not_configured` and the page says nothing was sent. Retail enquiries are not written to an outbox and are not stored in Mongo, so a failed or unconfigured send is not queued. Do not post test enquiries against production.

**Checks.** `cd backend && npm test` on 2026-11-06: 194 passed, 0 failed. Enquiry tests use a mock `fetch`. They do not call Resend.

**SEO.** Canonical host is `https://www.feenypowerandcontrol.com` (the live host in `deployment.md`). Each page has its own title, description, and H1. Structured data is a `Service` for Greater Vancouver and Kelowna only: organization name, logo, and area served. No street address, phone, review, or rating. `/sitemap.xml` lists `/consultation`, `/faq`, `/homeowners/greater-vancouver`, and `/homeowners/kelowna`. `/robots.txt` allows crawling and points at that sitemap.

## Related docs

| Doc | When |
|-----|------|
| `deployment.md` | Shipping to production |
| `deployment.md` § Sentinel Lite | Releasing `/sentinel_lite/` (from the other repo) |
| `docs/rti_proposal/agent_brief.md` | Proposal form look, copy, behavior |
| `docs/rti_proposal/README.md` | Spec index for proposal deep dives |