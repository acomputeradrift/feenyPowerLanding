# 00 - Handoff Prompt

Paste the block below into a fresh agent conversation to begin implementation.

Prerequisite: a multi-root workspace containing both repositories. If the second
root is missing, step 1 cannot read the legacy calculators.

---

```text
Read docs/rti_proposal/README.md and follow its reading order. Those documents
are constraining specifications, already agreed. You are implementing against
them, not authoring them. If you believe a specification is wrong, say so and
update it in the same change rather than diverging from it silently.

Background reading, in order:
  docs/rti_proposal/README.md          - index, constraints
  docs/rti_proposal/01-requirements.md - numbered FR/NFR baseline
  docs/rti_proposal/02-decisions.md    - why the stack is what it is
  docs/rti_proposal/04-calculations.md - highest-risk document, read fully
Also read development_continuity.md and deployment.md at the repository root.

CONTEXT
We are replacing a Google Forms + Apps Script + Google Docs pipeline with a
self-hosted branching proposal form. The driving requirement is that answers
open up follow-up questions: ask "how many audio sources?", get 2, and the form
asks for both names. Google Forms cannot do count-driven repeat groups.

THIS IS A MULTI-ROOT WORKSPACE WITH TWO REPOSITORIES
- Target, where you write code:
  /Users/jamiefeeny/Development (Not Shared)/feenyPowerLanding   [branch: master]
  The LIVE production site feenypowerandcontrol.com.
- Legacy reference, READ ONLY:
  /Users/jamiefeeny/Development (Not Shared)/RTI AutoProposal    [branch: main]
  The Apps Script system being replaced. Source of truth for the hour math.
  Do not modify anything in this repository.

HARD CONSTRAINTS
- Live production site. Do not modify frontend/styles/global.css,
  frontend/styles/consultation.css, or any existing route or page. Add new
  files. Touch backend/fpc_server.js only to register the new route and the
  static mount for backend/proposal/shared, plus the MONGO_URI fail-fast fix
  described in 05-data-model.md.
- No build step. Vanilla HTML/CSS/JS with native ES modules. No React, no
  bundler, no TypeScript.
- Test-first, using Node's built-in node --test. Do not add Jest or Vitest.
- Do not commit or push unless I explicitly ask. The two repositories use
  different default branches: master here, main there.
- Keep the per-zone minute rates server-side only. They are commercially
  sensitive and must never be served to the browser, including via the live
  estimate endpoint.
- Never send real email during development.
- Preserve the hour output exactly. See the parity contract in
  04-calculations.md. The documented oddities - per-line rounding, timer double
  counting, the section-versus-total display mismatch, excluded processor hours
  - are preserved deliberately and are not yours to fix.

START HERE, IN THIS ORDER, AND STOP AFTER EACH FOR REVIEW
1. Build the golden-master fixture. Stub global.Logger, load the legacy
   calculators from the RTI AutoProposal root, run them against the mock answer
   set in testOnFormSubmit() in onFormSubmit.js, and save the resulting
   systemData and hoursData as a JSON fixture inside feenyPowerLanding. Report
   the totals you get.
2. Create backend/proposal/calc/rates.js containing every minute-per-unit value
   and no logic, then port the calculators as ES modules that take rates as an
   argument and return the itemised line-item breakdown specified in
   04-calculations.md. Prove deep equality against the fixture before moving on.

Do not build any UI until parity tests pass.
```

---

## Open items to resolve during implementation

- **PDF visual design is unspecified.** Only a text export of the Google Docs
  template was available, so the logo, fonts, colours and spacing are unknown.
  Either obtain a PDF export of the template or agree the document follows
  [08-design-system.md](08-design-system.md). See
  [07-pdf-document.md](07-pdf-document.md).
- **Email provider not chosen.** [02-decisions.md](02-decisions.md) ADR-010
  requires a transactional HTTPS API rather than SMTP, but Resend versus Postmark
  is undecided. SPF and DKIM records are part of that work.
- **Backup and retention deliberately deferred.** Noted in
  [05-data-model.md](05-data-model.md).
