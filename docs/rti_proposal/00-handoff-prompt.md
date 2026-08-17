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
  files. Touch backend/fpc_server.js only to register the page route
  /rti_proposal/ (and /rti_proposal redirect), plus the MONGO_URI fail-fast
  fix in 05-data-model.md when you do persistence. The API mount and shared
  static mount are already in place.
- No build step. Vanilla HTML/CSS/JS with native ES modules.
- Test-first with node --test. From backend: npm test
- Do not commit or push unless explicitly asked.
- Per-zone minute rates never reach the browser, including via /api/proposal/estimate.
- Never send real email during development. Guard on PROPOSAL_EMAIL_ENABLED.
- Preserve hour output exactly (04-calculations.md parity contract). Documented
  oddities are not yours to fix: per-line rounding, timer double counting,
  section-versus-total display mismatch, excluded processor hours.

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

SPEC NOTES ALREADY APPLIED
- 03-form-schema.md examples now match the catalogue (audioDiscreteSourceZones,
  optional names). Do not reintroduce a fictional audioSources id.
- projectTimeline is an HTML date (yyyy-mm-dd), not the legacy mock's
  12/12/2025 string.
- Do not implement the MONGO_URI fail-fast until local and server .env both
  have MONGO_URI; doing it earlier would break RTI diagnostics on boot.

START HERE, IN THIS ORDER, AND STOP AFTER EACH FOR REVIEW
1. Form UI. Create frontend/rti_proposal.html (copy the existing header /
   partners / footer shell from consultation.html / faq.html; do not extract
   a template engine), frontend/styles/rti_proposal.css (08-design-system.md;
   do not edit global.css or consultation.css), and a vanilla schema-driven
   renderer that imports /scripts/proposal/shared/schema.js, validate.js,
   and repeatGroups.js. Ten steps, back/forward, progress, visibleIf,
   count-driven repeats with FR-6 preservation. Debounced POST to
   /api/proposal/estimate for the running total (FR-9). Register
   GET /rti_proposal/ and a redirect from /rti_proposal in fpc_server.js.
   Do not import anything from backend/proposal/calc/ in browser code.
2. Persistence + submit. backend/models/ProposalSubmission.js (05-data-model.md),
   POST /api/proposal with honeypot, shared validate.js, persist first
   (emailStatus pending), then PDF, then email (FR-15). Unknown keys 400.
   PROPOSAL_EMAIL_ENABLED must be explicitly true to send mail; otherwise
   write the payload to disk or log it.
3. PDF with pdfmake (07-pdf-document.md). Visual design is still unspecified —
   ask whether to follow 08-design-system.md or wait for a template PDF
   export. Do not guess at logo/fonts/spacing and call it done.
4. Audit view GET /rti_proposal/audit/:reference (FR-20, FR-21). Disabled
   entirely if PROPOSAL_AUDIT_TOKEN is unset. 404 on bad token, not 403.
5. MONGO_URI fail-fast in fpc_server.js only after both .env files have
   MONGO_URI. Then verify /consultation, /faq, and RTI diagnostics still
   serve.

Do not add React, a bundler, or a second test framework.
```

---

## Open items still unresolved

- **PDF visual design is unspecified.** See [07-pdf-document.md](07-pdf-document.md).
- **Email provider not chosen.** ADR-010 requires a transactional HTTPS API
  (Resend vs Postmark undecided). SPF and DKIM are part of that work.
- **Backup and retention deliberately deferred.** [05-data-model.md](05-data-model.md).

## How to verify before starting

```bash
cd "/Users/jamiefeeny/Development (Not Shared)/feenyPowerLanding/backend"
node --test proposal/calc/*.test.js proposal/shared/*.test.js proposal/estimate.test.js routes/proposal.test.js
```

Expect 32 passing tests. This work is on `master` once committed.
