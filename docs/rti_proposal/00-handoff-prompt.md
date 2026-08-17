# 00 - Handoff Prompt

Paste the block below into a fresh agent conversation to continue implementation.

Prerequisite: a multi-root workspace containing both repositories.

---

```text
Read docs/rti_proposal/README.md and follow its reading order. Those documents
are constraining specifications, already agreed. You are implementing against
them, not authoring them. If you believe a specification is wrong, say so and
update it in the same change rather than diverging from it silently.

Background reading, in order:
  docs/rti_proposal/README.md
  docs/rti_proposal/01-requirements.md
  docs/rti_proposal/02-decisions.md
  docs/rti_proposal/03-form-schema.md
  docs/rti_proposal/04-calculations.md
  docs/rti_proposal/05-data-model.md
  docs/rti_proposal/06-api.md
  docs/rti_proposal/07-pdf-document.md
  docs/rti_proposal/08-design-system.md
Also read development_continuity.md and deployment.md at the repository root.

CONTEXT
We are replacing a Google Forms + Apps Script + Google Docs pipeline with a
self-hosted branching proposal form at /rti_proposal/ on
feenypowerandcontrol.com. Driving requirement: count-driven repeat groups.

THIS IS A MULTI-ROOT WORKSPACE WITH TWO REPOSITORIES
- Target, WRITE here:
  /Users/jamiefeeny/Development (Not Shared)/feenyPowerLanding   [branch: master]
- Legacy reference, READ ONLY:
  /Users/jamiefeeny/Development (Not Shared)/RTI AutoProposal    [branch: main]
  Do not modify anything in that repository.

HARD CONSTRAINTS
- Live production site. Do not modify frontend/styles/global.css,
  frontend/styles/consultation.css, or any existing route or page. Add new
  files. Touch backend/fpc_server.js only to register /rti_proposal/ routes
  (page, redirect, later audit) plus the MONGO_URI fail-fast when both .env
  files have MONGO_URI. The API mount and shared static mount are already
  in place.
- No build step. Vanilla HTML/CSS/JS with native ES modules.
- Test-first with node --test. From backend: npm test
- Do not commit or push unless explicitly asked.
- Per-zone minute rates never reach the browser, including via
  /api/proposal/estimate. Rates appear only on the audit view.
- Never send real email unless PROPOSAL_EMAIL_ENABLED is the string 'true'.
- Preserve hour output exactly (04-calculations.md parity contract).
  Documented oddities are not yours to fix: per-line rounding, timer double
  counting, section-versus-total display mismatch, excluded processor hours.

WHAT IS ALREADY DONE (do not redo)
1. Golden-master fixture at
   backend/proposal/calc/fixtures/legacy-golden-master.json
   Captured from RTI AutoProposal testOnFormSubmit() at commit df0afbc.
   Project total: 62.3 hours. IEEE-754 sums are kept as the Apps Script
   produced them (7.700000000000001, 8.600000000000001, 3.0999999999999996).
2. Calculators under backend/proposal/calc/: rates.js (RATE_CARD_VERSION
   2026.1, no logic), systemData.js, hoursData.js (rates injected, returns
   lineItems + sectionHours + totalProjectHours). Parity tests pass.
3. Shared schema + validation under backend/proposal/shared/: schema.js
   (10 steps, SCHEMA_VERSION 2026.1), validate.js, repeatGroups.js (FR-6).
   Repeat groups attach to discrete counts; names are optional. Floorplan
   add-on is hidden unless globalControllerCount > 0 and cannot exceed it.
4. POST /api/proposal/estimate — section totals only, no rates, no persist,
   no email. Mounted at /api/proposal. Shared modules served at
   /scripts/proposal/shared. Rate key is poolAndPumps (06-api.md was
   corrected from poolPumps).
5. development_continuity.md and deployment.md restored at repo root.
6. Form UI at GET /rti_proposal/ (ADR-011: redirect /rti_proposal only when
   originalUrl with query stripped is exactly that path, then next()).
   frontend/rti_proposal.html copies the FAQ header/partners/footer shell.
   frontend/styles/rti_proposal.css is page-scoped. Renderer is
   frontend/scripts/proposal/rti_proposal.js; answers/steps/repeats live in
   formController.js. Browser imports /scripts/proposal/shared/{schema,
   validate, repeatGroups}.js only — nothing from calc/. Header copy is
   invented and may still be changed: "Describe the project scope and I will
   email you a programming budget."
7. Persistence + submit. ProposalSubmission model matches 05-data-model.md.
   POST /api/proposal via createProposalRouter: honeypot non-empty → 201
   plausible body and discard; unknown keys 400; persist first
   (emailStatus pending), then PDF, then email (FR-15). PDF/email failure
   still returns 201 with delivery: "pending". Rate limit 10 / 15 min,
   body cap 100kb. Real mail only if PROPOSAL_EMAIL_ENABLED === 'true';
   otherwise write JSON to backend/proposal/email/outbox/ (gitignored).
   Provider not chosen; enabling email currently throws that a transactional
   provider is not configured. Local Mongo is often not running — valid
   submit returns persist_failed until it is. Validation 400 works without
   Mongo.
8. PDF with pdfmake@0.3.11 in backend/proposal/pdf/. Visual source is the
   2026-08-14 Dave Marshall / OFFICE production Google Docs export: three
   US Letter pages, centred type, Feeny then RTI logos, bands charcoal
   #575759 / gold #f1b353 / steel #a7a9ac, Additional Info on page 3.
   Wording from processFormDataForOutput.js (hours suffix, singularisation,
   "None Included.", site summary, timer sentences, Input Zone (Sense) /
   Output Zone (Relays)). Deliberate departures: current copyright year,
   empty additional info punctuates as "No additional info.", named items
   when supplied (FR-18), no rates (FR-19). Roboto via pdfmake fonts;
   setLocalAccessPolicy allows only node_modules/pdfmake/fonts/Roboto/*.ttf.
   This repo vendors node_modules for git-pull deploys.

SPEC NOTES ALREADY APPLIED
- 03-form-schema.md examples now match the catalogue (audioDiscreteSourceZones,
  optional names). Do not reintroduce a fictional audioSources id.
- projectTimeline is an HTML date (yyyy-mm-dd), not the legacy mock's
  12/12/2025 string.
- 07-pdf-document.md is three pages, not four. The four-page split was
  inferred from a text dump and was wrong.
- MONGO_URI fail-fast is implemented. Local backend/.env has a localhost
  testdb URI; server .env already had MONGO_URI.

START HERE, IN THIS ORDER, AND STOP AFTER EACH FOR REVIEW
1. Audit view GET /rti_proposal/audit/:reference (FR-20, FR-21, 06-api.md).
   Disabled entirely if PROPOSAL_AUDIT_TOKEN is unset (never treat unset as
   open). Constant-time compare. 404 on a bad token, not 403. Send
   X-Robots-Tag: noindex and Cache-Control: no-store. HTML table of every
   line item grouped by section: count, minutes per unit, rawHours, hours,
   section subtotals, project total, plus rateCardVersion, schemaVersion,
   submittedAt. This is the only surface that shows rates. Do not link it
   from any public page.
2. MONGO_URI fail-fast in fpc_server.js only after both .env files have
   MONGO_URI. Then verify /consultation, /faq, and RTI diagnostics still
   serve.

Do not add React, a bundler, or a second test framework.
```

---

## Open items still unresolved

- **Email provider not chosen.** ADR-010 requires a transactional HTTPS API
  (Resend vs Postmark undecided). SPF and DKIM are part of that work. Until
  then, `PROPOSAL_EMAIL_ENABLED` stays off and submissions write to
  `backend/proposal/email/outbox/`.
- **Form header copy is invented** and may still be changed.
- **Backup and retention deliberately deferred.** [05-data-model.md](05-data-model.md).

## How to verify before starting

```bash
cd "/Users/jamiefeeny/Development (Not Shared)/feenyPowerLanding/backend"
npm test
```

Expect 75 passing tests (`node --test` suites listed in `backend/package.json`).
This work is on `master`.
