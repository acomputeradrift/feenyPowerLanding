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
| `/sentinel_lite/` | Sentinel Lite — dealer utility: `.apex` compare in the browser (Pyodide). Files never leave the dealer’s machine. **Not indexed** (no sitemap entry; `robots.txt` Disallow; `X-Robots-Tag: noindex`). Bookmark/direct link only. |
| `/{location}/{brand}` | Homeowner landing pages: `vancouver` and `kelowna` × `lutron`/`vantage`/`rti`/`clipsal-c-bus`, plus `los-gatos` × `lutron`/`rti`. **Only brands with `published: true` are public (Lutron as of 2026-11-07, RTI, Vantage and Clipsal C-Bus as of 2026-11-08 — every brand is now live);** the rest 404 unless `HOMEOWNER_SHOW_DRAFTS=true` (local `.env` only). Other combos 404. |
| `/analytics` | Token-gated first-party analytics dashboard for the homeowner pages. No login screen: open once per device with `?token=<ANALYTICS_DASHBOARD_TOKEN>` to set a 90-day cookie (Jamie keeps the link in 1Password). Without the cookie it returns an empty 404, which looks like a **blank white page**. |
| `/robots.txt`, `/sitemap.xml` | Generated from the homeowner content data (sitemap lists public pages + the published homeowner pages) |
| `/idea-feedback/` | Hidden HMAC-signed confirm page for overnight idea thumbs (GET never writes) |

**API:** `POST /api/proposal/estimate`, `/api/proposal` (proposal) · `GET`/`POST /api/sentinel_lite/compare-count` (count-only Compare beacon; no files) · `POST /api/homeowner-inquiry` (homeowner form) · `POST /api/analytics/event` (cookieless beacon) and the dashboard's token-gated summary API

**Retired (2026-11-12):** RTI log diagnostics (`/rti_diagnostics/*`, `/api/upload`, `/api/process`, `/api/retrieve`) returns **410 Gone**. Source still in repo (`frontend/upload_files.html`, `backend/RTI_log_analysis/`, `routes/upload.js`, etc.) but is not mounted. `robots.txt` disallows `/rti_diagnostics/`.

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
- `consultation.js` on landing + FAQ: Calendly popup only (partner logos are decorative).
- **Per-zone rates never reach the browser.** `backend/proposal/calc/` is not served statically.

## Components

**Marketing** — `consultation.html`, `faq.html` · shared layout CSS + page CSS (`faq.css`, `testimonials.css`) · Calendly via `consultation.js`.

**Consultation testimonials** — `/consultation` shows a Happy Clients carousel between the benefits and the bottom Calendly close. One quote at a time. It loops every 8 seconds, pauses on hover or keyboard focus, and builds the dots from each `figure.testimonial`. Styles are `frontend/styles/testimonials.css` and behavior is `frontend/scripts/testimonials.js` (loaded only by `consultation.html`). Add a quote by inserting another figure in the track. Do not put this CSS in `consultation.css`.

**Homeowner landing pages** — `/{location}/{brand}` pages selling remote programming and troubleshooting to homeowners. **Read `docs/homeowner_pages/README.md` before touching them**: it has the approved v2 layout, the shared rules and the per-brand checklist for bringing RTI, Clipsal C-Bus and Vantage up to the Lutron standard. A ready-made hand-off prompt for the next brand is in `docs/homeowner_pages/rti_agent_prompt.md`. **All copy lives in `backend/homeowner/content.js`**: locations, brands, the valid `pages` list, `publishedPages`, `shared` (v1) and `sharedV2` copy and FAQ. `backend/homeowner/render.js` fills `frontend/homeowner/service_v2.html` for brands with `layout: 'v2'` (Lutron) and `service.html` for the rest (neither is served directly). It escapes everything, builds the JSON-LD (`ProfessionalService` + `FAQPage`), robots and sitemap, and caches each page. Restart the server after copy edits. Styles are in `styles/homeowner.css` (it reuses `testimonials.css` cards). `scripts/homeowner_form.js` posts to `POST /api/homeowner-inquiry` and sends `fpcTrack` events (`cta_click`, `form_start`, `form_submit`, `faq_open`). The route sits after all specific routes in `fpc_server.js`. To add a page, add its location or brand data and an entry in `pages`. The copy never says the diagnostic fee is credited toward repairs, never promises a fixed repair price, and never mentions HomeWorks.

**Homeowner analytics** — First-party and cookieless (no Google or Facebook). `frontend/scripts/fpc_analytics.js` (`window.fpcTrack`) posts to `POST /api/analytics/event`. Code is in `backend/analytics/` and `routes/analytics.js`. The dashboard is `/analytics` (`frontend/analytics.html`), gated by `ANALYTICS_DASHBOARD_TOKEN`. A `node-cron` weekly email goes out Mondays at 07:00 America/Vancouver through Resend (`PROPOSAL_EMAIL_*`), and Mongo guards against double sends. Preview it with `node analytics/weeklyReportCli.js`. Only published pages are counted. With MongoDB down, the dashboard API returns 503 and the site keeps serving. The dashboard cookie must stay `SameSite=Lax`: with Strict, a token link tapped in Mail or Messages lands on a blank page. Live since 2026-11-07. **Jamie's own traffic is flagged, not counted:** any event or homeowner inquiry sent with a valid dashboard cookie is saved with `test: true` (`isOwnerRequest` in `routes/analytics.js`). `fetchEvents` and `fetchLeads` skip those, so the dashboard and weekly email never show them. Test leads are still emailed, with "[TEST]" in the subject. A device only counts as Jamie's after the token link has been opened on it; private windows don't count. All pre-2026-11-09 data was test traffic and was deleted. Never print the token in chat. It lives only in the server's `backend/.env`.

**RTI proposal form** — Replaced the retired Google Form AutoProposal. Vanilla ES modules, schema-driven. For form/PDF/CSS work, read **`docs/rti_proposal/agent_brief.md` next** — do not load the full spec set for a visual pass. Key: `frontend/rti_proposal.html`, `styles/rti_proposal.css`, `scripts/proposal/`, `backend/proposal/`, `routes/proposal.js`. Deep specs: `docs/rti_proposal/README.md`.

Current product (`SCHEMA_VERSION` `2026.6`, `RATE_CARD_VERSION` `2026.3`): hours split into Overhead, Programming and Graphics. Global controllers are Phone, Tablet, Large Touchscreen and Small Touchscreen. Displays are always discrete. Custom audio/video is never cloned. Audio types are Streamer / Turntable / Custom (no Tuner). Video types are Media Player / Cable / Satellite / Box / Blu-ray Player / Game Console / Custom. Distributed video zones require at least one video source; audio sources may be 0. Motorized lifts/mounts appear under displays (0 allowed; first discrete, rest cloned). Every help line ends with a period. Rate card 2026.2 remains in `backend/proposal/calc/legacy/` for old submissions and the v1 preview.

**Sentinel Lite** — Live at `/sentinel_lite/` (dealer utility Jamie uses; not an SEO landing). The dealer’s `.apex` files are compared in the browser with Pyodide; this server never receives a file. The only API is `GET`/`POST /api/sentinel_lite/compare-count` (a running total, no body). Excluded from `sitemap.xml`; `robots.txt` and `X-Robots-Tag` keep crawlers out. Static bundle is generated — ship from the sibling **Sentinel (Lite)** repo with `tools/ship.py`. Do not edit `frontend/sentinel_lite/` here. Mount and CSP live in `fpc_server.js`.

**RTI diagnostics** — **Retired 2026-11-12** (Jamie). Do not re-enable without an explicit ask. Legacy code under `backend/RTI_log_analysis/`, `backend/routes/upload.js`, `process.js`, `retrieve.js`, and matching `frontend/` pages.

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
| `ANALYTICS_DASHBOARD_TOKEN` | Enables `/analytics` when set |
| `ANALYTICS_PUBLIC_URL` | Optional; base URL for links in the weekly email (default production URL) |
| `ANALYTICS_REPORT_ENABLED` | `false` turns the weekly email off (`ANALYTICS_REPORT_CRON`, `ANALYTICS_REPORT_TZ`, `ANALYTICS_REPORT_TO` optional) |
| `HOMEOWNER_SHOW_DRAFTS` | `true` renders unpublished homeowner pages. **Local only — never on the server** |

Local and server each have their own `.env` — not synced via git.

## Production (quick ref)

| | |
|---|---|
| SSH | `ssh my-do-server` |
| Host | DigitalOcean droplet `fpcwebsite-sfo3` |
| Repo | `/root/feenyPowerLanding` |
| Node | **22.23.4** — NodeSource `node_22.x`, `/usr/bin/node` |
| PM2 name | **`FPC Website`** (not `fpc_server`) |

**Deploy notes (2026-11-07).**
- `backend/node_modules` is tracked in git, so a pull brings new packages. Don't run `npm install` on the server unless a package needs a native build.
- The server checkout has old uncommitted edits in `backend/RTI_log_analysis/` and some untracked images. Leave them alone, and use `git pull --ff-only`.
- Don't commit `.DS_Store` or `.cursor/`.
- Locally, after `kill`, wait a second before restarting, or the new process hits `EADDRINUSE` on port 3000.
- Deploy `bd7a26a` put the Lutron homeowner pages and the analytics dashboard live; the 2026-11-08 deploys added the RTI pages (`52985b7`), then the Vantage pages (`45fe7f8`), then the Clipsal C-Bus pages, plus the shared v2 changes listed in `docs/homeowner_pages/README.md`. A later 2026-11-08 deploy added the audit changes in `docs/landing_pages_todo.md`: price beside the hero CTA, a mid-page CTA after "Who am I?", no phone or city on the form (phone came back as optional on 2026-11-09, commit `268c3eb`, which also removed the named Kelowna partner), the project-file hint, longer meta descriptions, WebP cutouts and one shared business entity in the JSON-LD. Deploy `21896bb` (2026-11-09) added test-traffic flagging to analytics.

**2026-10-23 — CVE-2026-111497.** Production Node moved from 18.20.5 (end of life, bundled Brotli 1.1.0) to 22.23.4, the release that cherry-picks the Brotli decoder fix. `process.versions.brotli` still prints `1.1.0`; the fix is the 22.23.4 binary, not a Brotli version bump. Apt upgrade plus PM2 resurrect and `pm2 save` only. The git checkout was left at `6978f0c2` (2026-10-09). No commit, no push, no `git pull`. Jamie’s Mac was still Node 22.20.0.

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
| `docs/homeowner_pages/README.md` | Homeowner landing pages — v2 layout, shared rules, per-brand checklist |
| `docs/homeowner_pages/rti_agent_prompt.md` | Hand-off prompt for the next brand (RTI) |
| `docs/cro_audit.md` | Conversion audit of `/consultation` and the homeowner pages (2026-11-08) |
| `docs/seo_audit.md` | SEO audit of the same pages (2026-11-08). Homeowner pages get **no internal links** (Jamie's decision) |
| `docs/landing_pages_todo.md` | **Start here** for landing-page work: what's done from both audits and what's left |
| `docs/rti_proposal/README.md` | Spec index for proposal deep dives |

## Google Search Console — indexing (2026-11-12)

**Report:** Page indexing → *Duplicate without user-selected canonical* (3 URLs, crawled ~2026-11-08).

| URL in report | Why it appears |
|---|---|
| `https://www.feenypowerandcontrol.com/consultation` | Dealer landing has **no** `<link rel="canonical">` (unlike homeowner pages from `render.js`). |
| `https://feenypowerandcontrol.com/consultation` | **Apex + www both return 200** with the same HTML; no canonical on either, so Google treats them as duplicates. |

The Nov 8 spike lines up with the homeowner launch and sitemap work: more recrawling surfaced long-standing gaps on dealer static HTML. **Not a penalty** — Google is saying it found duplicate or near-duplicate URLs and you did not pick the primary URL. RTI diagnostics was **retired 2026-11-12** (410 + `robots.txt`); request removal in GSC for the upload URL after deploy if it still shows as indexed.

**Fixes shipped 2026-11-12 (deploy after commit):** canonical + OG/Twitter + JSON-LD on `/consultation`; canonical on `/faq` and `/rti_proposal/`; `/` → `/consultation` **301** in Node; **non-www → www 301** in nginx (`feenyPowerLanding` vhost). RTI diagnostics retired (410). Homeowner pages already self-canonical.