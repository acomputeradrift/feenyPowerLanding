# RTI proposal — agent continuity

Catch-up for look, copy, and form-behavior work. Do not rebuild the feature.

Live URL: https://www.feenypowerandcontrol.com/rti_proposal/  
Local: http://localhost:3000/rti_proposal/

## Read, then stop

| Task | Read |
|---|---|
| Look, layout, CSS, header copy | this file, then [08-design-system.md](08-design-system.md) |
| Question labels, help text, defaults, repeats, validation | this file, then [03-form-schema.md](03-form-schema.md) and `backend/proposal/shared/schema.js` |
| Hours, API, PDF, email, audit | the matching `0N-*.md` spec — only if that is the task |

Do not read the full spec set for a visual or form pass. `01`–`08` are constraining specs, not a backlog. If a spec is wrong, say so and update it in the same change.

Repo-wide rules: `development_continuity.md` and `deployment.md` at the repo root.

## Session workflow (Jamie’s preference)

1. Keep local Node running: `cd backend && node fpc_server.js`
2. Change code. Show/test at **localhost**, not the live site. Open the Cursor browser to http://localhost:3000/rti_proposal/ after a round. Hard-refresh (`Cmd+Shift+R`) if CSS/JS looks stale.
3. Do **not** commit, push, or deploy until Jamie says the session is done.
4. Then, in order: commit → `git push origin master` → SSH `my-do-server` and `cd /root/feenyPowerLanding && git pull origin master && pm2 restart "FPC Website"`. Tell Jamie at each step.
5. Verify https://www.feenypowerandcontrol.com/rti_proposal/ with a hard refresh.

Pushing to GitHub does not update the live site.

## What this is

A public branching form that emails an RTI programming-hour PDF. It exists because Google Forms cannot do count-driven repeat groups (N sources → N name fields).

Vanilla HTML/CSS/JS. No React, no bundler, no second test framework. Deploy is `git pull` + `pm2 restart "FPC Website"`.

## Hard no

- Do not edit `frontend/styles/global.css` or `frontend/styles/consultation.css`.
- Do not change existing routes or pages (`/consultation`, `/faq`, RTI diagnostics).
- Do not serve `backend/proposal/calc/` or any per-zone rate to the browser. Rates appear only on the audit view.
- Do not “fix” hour oddities: per-line rounding, timer double counting, AV devices counted twice in `totalProjectZones` (feeds controller hours only), section-vs-total mismatch, excluded processor hours.
- Do not send real mail unless `PROPOSAL_EMAIL_ENABLED` is the string `true`.
- Do not link `/rti_proposal/audit/` or `/rti_proposal/preview.pdf` from any public page.
- Do not commit or push unless asked. Never commit `.env`.
- Do not re-add a live hours estimate on the public form.
- Do not put Discrete/Cloned labels or cloned-count questions back on the public form.
- Do not switch emailed PDFs back to v1. Live mail uses v2 (`proposalDocumentV2.js` / `formatProposalV2.js`). Keep v1 in `proposalDocument.js` / `formatProposal.js` for `?v=1` preview.
- Do not re-add a pdfmake `background` canvas behind the colour bands. That made page 3 a giant green slab with the copy sitting high in it.

## Where the look and form live

| File | Role |
|---|---|
| `frontend/rti_proposal.html` | Page shell, header, partners, footer. Header line is invented and may change. No hours aside. |
| `frontend/styles/rti_proposal.css` | **Only** stylesheet you should edit for this page. Palette is CSS variables at the top. Single centered column (`max-width: 720px`). |
| `frontend/scripts/proposal/rti_proposal.js` | DOM: steps, inputs, submit. Does not call the estimate API. |
| `frontend/scripts/proposal/formController.js` | Answers object is the source of truth. Re-render from it. Count defaults use `question.min ?? 0`. Text `default` values are prefilled the same way. |
| `backend/proposal/shared/schema.js` | Questions, help text (preserve verbatim unless Jamie asks to change it), `visibleIf`, repeats. |
| `backend/proposal/shared/repeatGroups.js` | Resize arrays to the driving count. New items get `name` from `itemLabel` (Room 1, …). |
| `backend/proposal/shared/validate.js` | Shared client/server validation, including the controller-pair rule. |

Load order in the HTML, do not reorder:

`global.css` → `consultation.css` → `rti_proposal.css`

Shared schema is imported by the browser from `/scripts/proposal/shared/{schema,validate,repeatGroups}.js` only.

## Form rules that are easy to break

These are current product rules, not a backlog.

**Counts**

- Rooms **min 1**. Floors **min 1**. Both default to 1.
- Other counts default to 0.
- Exterior zones may be 0.
- Global controllers may be 0, and room controllers may be 0, but **not both**. Error: *Enter at least one global controller or one room controller*.
- `projectTimeline` is **required**.

**Defaults (unedited look faded)**

- `projectClientName` prefills `Private Client`. `projectAddress` prefills `Private Location`.
- Repeat names prefill from `itemLabel` (Room 1, Audio Source 1, …).
- Unedited default text uses class `proposal-value-default` (hint colour `#a7a9ac`). As soon as the dealer types something else, it goes full contrast.
- Do **not** fade Type selects or `Select…`.

**Repeat groups** render **immediately under** the count that drives them. Do not park them at the end of the step.

| Count | Repeat | Defaults / fields |
|---|---|---|
| `rooms` | `roomDetails` | Name: Room 1, Room 2, … (optional to edit) |
| `exteriorZones` | `exteriorZoneDetails` | Name: Exterior Zone 1, … (optional to edit) |
| `audioDiscreteSourceZones` | `audioSourceDetails` | Name default; **type required**: Streamer / Tuner / Turntable / Custom |
| `videoDiscreteSourceZones` | `videoSourceDetails` | Name default; **type required**: Media Player / Cable or Satellite / Games Console / Custom |
| `displayDiscreteZones` | `displayDetails` | Name default; **type required**: TV / Projector |
| `cameraZones` | `cameraDetails` | Name default Camera 1, …; location optional |
| `globalControllerCount` | `globalControllerDetails` | **Type required**: iPhone / iPad / Touchscreen |

No name fields on AV receivers (count only). Do **not** put Discrete/Cloned labels back on the form. Those counts are derived in `systemData.js`:

- First of each type is discrete; later of the same type are cloned (half rate).
- `Custom` is **never** cloned — each Custom is discrete.
- AV receivers have no type: first unit discrete, rest cloned.
- Global controllers: extra units of a type already counted do not add to the hours multiplier. Legacy answers without types still bill the total count.
- Form field ids such as `audioDiscreteSourceZones` are the **total** count the dealer entered. Live answers do not include `*Cloned*` keys. Those keys still exist on the calculator output and on old submissions for golden-master parity.

Leaving a type on “Select…” must block Next/Submit with *Type is required*. Names may stay as the auto-filled label.

## Copy that is fair game

- Header under the H1: *Describe the project scope and I will email you a programming budget.*
- From-name on mail is `RTI Proposals`. Address stays `proposals@feenypowerandcontrol.com`.
- Page title / meta description.
- Step 1 labels now: *Your Name*, *Your Email*, *Project Location* (id is still `projectAddress`). Location help is *A city is fine.*

Help text in the schema is domain knowledge. Do not rewrite it for tone.

## Implementation snapshot (2026-08-19)

Built and live. Do not reimplement.

- Form, persist, pdfmake PDF, Resend email, audit route, `MONGO_URI` fail-fast.
- Public form has **no** live hours estimate. Hours remain on the PDF and audit view. The estimate API may still exist; the page does not call it.
- Reply-To is `Feeny.jamie@gmail.com`. BCC is the same inbox. Sending is on in production.
- Audit route is disabled until `PROPOSAL_AUDIT_TOKEN` is set on the **server** `.env`.
- FAQ still links the old Google Form. Cutover (point dealers here, retire the Form) is not done.
- Backup/retention was deferred on purpose.
- `SCHEMA_VERSION` is `2026.3`.

**Live email sends the five-page v2 PDF.**

### v2 PDF (live email)

Five-page layout. Local preview: http://localhost:3000/rti_proposal/preview.pdf (HIGH RD sample). `?v=1` still shows v1. 404 unless Host is localhost / 127.0.0.1 / ::1. Do not link it from the public form.

Files: `backend/proposal/pdf/formatProposalV2.js`, `proposalDocumentV2.js`, `preview.js`, plus their tests. Route is `GET /rti_proposal/preview.pdf` in `fpc_server.js`. Spec notes: [07-pdf-document.md](07-pdf-document.md).

Pages: cover (no tagline; Feeny logo 200×150; ID only — PO, client, location; no timeline/hours; RTI logo below the orange band with light-grey *An* above and *Proposal* below) → Project Overview (*Your project covers N rooms (…)*; controllers *every room / system*; Additional Info heading plus notes if present) → Controlled Systems Overview (sources as `N x Type (Name)`; displays as `N x Display (TV)`; count-only rows stay `N x`; `None Included` when empty) → Controller Overview (`N x Global Controller (iPhone)`, `N x Room Controller`; no intro) → Project Summary (orange band is only `Total Programming Hours: N`; acceptance + signature / print name / date in the white space below). Page titles are 22pt.

Colour bands cycle Feeny logo colours: orange `#fcb040`, dark grey `#575759`, green `#39b54a`, light grey `#a7a9ac`. Dark grey uses white text; others black. Band body is 16pt Roboto, full-bleed table `fillColor`.

**Band placement:** each band is `absolutePosition` at `y = (792 - renderedHeight) / 2` so it is geometrically centered on US Letter, independent of the page title. Height is measured from a real pdfmake table, not a line-count guess (16pt Roboto at `lineHeight` 1.25 is 23.4375pt, not 18). Titles stay in normal flow at the top at 22pt. The RTI logo sits below the cover orange band, centered in the leftover white above the footer, at 480×76, with *An* above and *Proposal* below in light grey `#a7a9ac` at the same 11pt as *Prepared for:*. Contractor name on the cover is 16pt. Do not go back to flow spacers under titles.

**Do not** paint a matching `background()` canvas. Height estimates run long on page 3 (six categories), so the canvas was taller than the table and looked like a huge green bar with copy at the top. Colour comes from the table only.

**Signatures** are a second `absolutePosition` stack, vertically centered in the leftover white between the hours band bottom and the footer (`PAGE_MARGIN_BOTTOM` 56), not parked immediately under the band. The block is 516pt wide (48pt side margins) and centered as a group; copy and labels stay left-aligned inside it. Lines are canvas strokes in a fixed second column so they share a start and end. Do not use `decoration: 'underline'` on the line cells. Copy is *I approve this budget and understand that work will commence when Feeny Power and Control Ltd has received a 50% deposit* (`a` and `50%` stay on the same line).

Node does **not** hot-reload. After PDF code changes, kill the listener on port 3000 and restart `node fpc_server.js`, then hard-refresh the preview URL. Restarts often hit `EADDRINUSE` if the old process is still up.

## Verify a look or form change

```bash
cd backend && npm test
```

Then open http://localhost:3000/rti_proposal/ — and confirm `/consultation` and `/faq` still look the same.

PDF preview (localhost only; 404 on the public host): http://localhost:3000/rti_proposal/preview.pdf is **v2** (HIGH RD sample). Append `?v=1` for the original three-page layout. Hard-refresh after PDF code changes. Live email sends v2.

## Spec index (on demand)

[README.md](README.md) · [01-requirements](01-requirements.md) · [02-decisions](02-decisions.md) · [03-form-schema](03-form-schema.md) · [04-calculations](04-calculations.md) · [05-data-model](05-data-model.md) · [06-api](06-api.md) · [07-pdf-document](07-pdf-document.md) · [08-design-system](08-design-system.md)
