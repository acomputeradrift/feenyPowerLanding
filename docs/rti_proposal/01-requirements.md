# 01 - Requirements

## Product context

Feeny Power and Control Ltd provides remote programming for RTI, Lutron and
Vantage control systems. Dealers and integrators request a programming budget by
describing their project scope: how many lighting zones, audio zones, cameras,
controllers and so on.

Today that request is captured by a Google Form. On submission, an Apps Script
converts the answers into derived zone totals, applies fixed per-zone minute
rates to produce an hour estimate, generates a Google Sheets workbook, merges a
Google Docs template, exports it to PDF, and emails the PDF.

### The problem

The form cannot ask follow-up questions based on an answer. Every question is
asked of every dealer, and the answers are bare counts with no detail attached.

The concrete example that motivated this project: asking "how many audio sources
are in the project?" should, when the answer is two, produce two follow-up fields
for the source names. Google Forms cannot do this. Logic jumps that loop back to
an earlier question overwrite the previous answers, and the documented workaround
is to duplicate the question group as many times as anyone might need and
hand-edit the logic on every copy.

Secondary problems with the current system:

- Form question titles are the schema. Renaming a question in the Google Form
  silently breaks the calculation code, which looks answers up by exact title
  string.
- All count fields are free-text, so non-numeric input propagates as `NaN`.
- Drive folder IDs, the Doc template ID and the recipient email are hardcoded in
  source.
- The rates that determine pricing are interleaved with the arithmetic that uses
  them, and the output shows only section totals, so no figure can be traced back
  to a count and a rate.

### Goals

1. Ask questions conditionally, and ask for named detail per item when a count
   warrants it.
2. Remove the dependency on Google Forms, Apps Script, Google Docs and Google
   Drive.
3. Make the hour calculations auditable and cheap to change.
4. Preserve the existing hour estimates exactly, so the migration does not
   silently reprice work.

### Non-goals

Explicitly out of scope. Do not implement these without a new decision.

- **Dealer accounts, logins or saved drafts.** The form is public and anonymous.
- **The Google Sheets project workbook.** The legacy pipeline generated a
  partially populated workbook of zone tabs. It is dropped. The `xlsx` dependency
  already present in this repository makes it cheap to reinstate later.
- **An admin UI for editing rates.** Rates are edited in a file. See
  [02-decisions.md](02-decisions.md) ADR-004.
- **Quoting money.** The system outputs programming hours, not prices.
- **Processor hours.** The legacy code computes processor counts but excludes
  their hours from the total. That exclusion is preserved.

### Success criteria

- A dealer can complete the form and receive a PDF proposal without any Google
  service being involved.
- For identical project scope, total hours match the legacy system exactly.
- Changing a per-zone rate is a one-line edit in a file containing no logic.
- Any past submission can be re-explained line by line, showing count, rate and
  resulting hours, even after rates have subsequently changed.

## Functional requirements

### Form behaviour

- **FR-1** The form is served at `/rti_proposal/` and requires no
  authentication.
- **FR-2** Questions are defined by a schema, not hand-written markup. Adding or
  reordering a question is a data change.
- **FR-3** The form presents questions in steps matching the existing form's ten
  pages, with forward and backward navigation and a visible progress indicator.
- **FR-4** A question may declare a visibility condition evaluated against
  current answers. Hidden questions are not rendered and are excluded from
  validation and submission.
- **FR-5** A question group may repeat a number of times driven by the value of a
  count question. Setting the count to N renders N instances; setting it to 0
  renders none.
- **FR-6** Changing a count preserves values already entered in surviving repeat
  instances. Reducing the count from 5 to 3 discards only instances 4 and 5.
- **FR-7** Count questions accept non-negative integers only, and are rendered as
  numeric inputs.
- **FR-8** Validation rules are defined once and enforced both in the browser and
  on the server. The server never trusts client validation.
- **FR-9** The form shows a running total of estimated hours as the dealer
  progresses, obtained from the server.
- **FR-10** Field help text from the existing form is preserved verbatim. See
  [03-form-schema.md](03-form-schema.md).

### Processing

- **FR-11** On submission the server validates the payload, derives zone totals,
  computes hours, persists the submission, generates a PDF, and emails it.
- **FR-12** Hour computation returns an itemised breakdown, not only totals.
  Every line records the count, the minutes per unit applied, and the resulting
  hours.
- **FR-13** Section totals and the project total are derived by summing line
  items.
- **FR-14** Each submission persists the rate card version in force at the time,
  together with its full breakdown.
- **FR-15** A submission is persisted even if PDF generation or email delivery
  subsequently fails. Delivery state is recorded on the document.

### Output

- **FR-16** The generated PDF reproduces the structure of the existing Doc
  template. See [07-pdf-document.md](07-pdf-document.md).
- **FR-17** The PDF is emailed only to the business owner
  (`feeny.jamie@gmail.com`). The submitting dealer must not receive a copy.
  Subject is `A new RTI proposal was created!`. Body is
  `{contractorName} ({contractorEmail}) just submitted a new project ({projectPoName}).`
- **FR-18** Where the dealer supplied names for items, the PDF lists those names
  instead of bare counts.
- **FR-19** The PDF shows section totals only. It does not show per-zone rates or
  the line-item breakdown.

### Audit

- **FR-20** An internal view renders any submission's full breakdown as count,
  minutes per unit and hours, grouped by section.
- **FR-21** That view is protected by a shared secret held in the server
  environment. It does not require a login system.

## Non-functional requirements

- **NFR-1** The feature runs inside the existing Express application and the
  existing PM2 process. It introduces no new service, port, nginx configuration
  or process manager entry.
- **NFR-2** No build or compilation step. Browser code is vanilla JavaScript
  using native ES modules.
- **NFR-3** Deployment remains the documented `git pull` plus `pm2 restart`
  procedure in `deployment.md`.
- **NFR-4** Per-zone minute rates are never served to the browser in any form.
- **NFR-5** Existing pages, routes and shared stylesheets are unmodified. A
  regression on `/consultation`, `/faq` or the RTI diagnostics pages is a failure
  of this project.
- **NFR-6** No secret, folder identifier, template identifier or recipient
  address appears in source. Configuration comes from the server environment.
- **NFR-7** The public endpoint is protected against automated abuse.
- **NFR-8** PDF generation must not require a headless browser or other
  system-level dependency on the droplet.
- **NFR-9** Calculation code is pure and dependency-injected so it can be unit
  tested without a database, network or filesystem.
- **NFR-10** Tests run with Node's built-in test runner. No additional test
  framework is introduced.
- **NFR-11** The form is usable on mobile, consistent with the existing site's
  600px breakpoint.
- **NFR-12** Text the dealer must read while typing meets a 4.5:1 contrast ratio.
  See [08-design-system.md](08-design-system.md).

## Traceability

Requirement identifiers above are stable. Reference them in commit messages and
test names so behaviour can be traced from requirement to test to code. When a
requirement is superseded, mark it as such rather than renumbering the list.
