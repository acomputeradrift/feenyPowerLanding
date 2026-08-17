# RTI Proposal Form - Specification Set

Specifications for the RTI programming budget form served at `/rti_proposal/` on
feenypowerandcontrol.com.

This feature replaces a Google Forms + Google Apps Script + Google Docs pipeline
with a self-hosted branching form. The reason for the replacement is a capability
gap: Google Forms cannot ask follow-up questions driven by a count. If a dealer
says the project has two audio sources, the form must then ask for both source
names. Google Forms has no repeat groups, and looping back with logic jumps
overwrites the earlier answers.

## Status

These documents are **constraining specifications**, agreed before implementation.
Implementation is expected to conform to them. Where implementation reveals that a
specification is wrong, update the specification in the same change and note it in
the decision record, rather than letting code and spec drift apart.

Documents that *describe* the built system - test results, runbook additions,
recent-changes entries - are written during implementation, not here.

## Reading order

Read `01` and `02` first. They establish what is being built and why the
technology choices are what they are. Everything else can be read on demand.

- **[00-handoff-prompt.md](00-handoff-prompt.md)** - the prompt used to start
  implementation, plus the list of open items still to resolve.
- **[01-requirements.md](01-requirements.md)** - product context, scope, and
  numbered functional and non-functional requirements. The traceability baseline.
- **[02-decisions.md](02-decisions.md)** - architecture decision records. Read
  this before proposing an alternative approach; most obvious alternatives were
  considered and rejected for recorded reasons.
- **[03-form-schema.md](03-form-schema.md)** - the question definition format,
  including conditional visibility and count-driven repeat groups, plus the
  complete question catalogue with help text.
- **[04-calculations.md](04-calculations.md)** - the hour calculation rules. Every
  rate, formula and rounding step, and the parity contract against the legacy
  system. The highest-risk document in the set.
- **[05-data-model.md](05-data-model.md)** - the persisted submission document.
- **[06-api.md](06-api.md)** - endpoint contracts.
- **[07-pdf-document.md](07-pdf-document.md)** - the generated proposal document.
- **[08-design-system.md](08-design-system.md)** - visual and interaction rules,
  derived from the existing site.

## Repository context

This feature is built **inside** this repository rather than as a separate
application. See [02-decisions.md](02-decisions.md) ADR-001.

Before writing code, read the two existing repository-level documents:

- `development_continuity.md` - repository layout, conventions, and agent rules
- `deployment.md` - the local-to-production sync procedure

The legacy Apps Script system being replaced lives in a separate repository at
`RTI AutoProposal`. It is the source of truth for the hour calculations and must
not be modified.

## Non-negotiable constraints

These come from the production environment and are repeated here because they are
easy to violate accidentally.

1. This repository serves a **live production website**. Do not modify
   `frontend/styles/global.css`, `frontend/styles/consultation.css`, or any
   existing route or page. `backend/fpc_server.js` is touched only to register the
   new route and static mount.
2. **No build step.** Vanilla HTML, CSS and JavaScript with native ES modules.
   Deployment is `git pull` plus `pm2 restart`, and it must stay that way.
3. **The rate card never reaches the browser.** Per-zone minute values are
   commercially sensitive. See [04-calculations.md](04-calculations.md).
4. **Hour output must match the legacy system exactly** until a change is
   deliberately decided. See the parity contract in
   [04-calculations.md](04-calculations.md).
5. **Never send real email during development.**
