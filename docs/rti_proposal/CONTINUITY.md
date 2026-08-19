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
- Do not link `/rti_proposal/audit/` from any public page.
- Do not commit or push unless asked. Never commit `.env`.
- Do not re-add a live hours estimate on the public form.
- Do not put Discrete/Cloned labels or cloned-count questions back on the public form.

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
- From-name on mail (`proposals` today). Address stays `proposals@feenypowerandcontrol.com`.
- Page title / meta description.
- Step 1 labels now: *Your Name*, *Your Email*, *Project Location* (id is still `projectAddress`). Location help is *A city is fine.*

Help text in the schema is domain knowledge. Do not rewrite it for tone.

## Implementation snapshot (2026-08-18)

Built and live. Do not reimplement.

- Form, persist, pdfmake PDF, Resend email, audit route, `MONGO_URI` fail-fast.
- Public form has **no** live hours estimate. Hours remain on the PDF and audit view. The estimate API may still exist; the page does not call it.
- Reply-To is `Feeny.jamie@gmail.com`. BCC is the same inbox. Sending is on in production.
- Audit route is disabled until `PROPOSAL_AUDIT_TOKEN` is set on the **server** `.env`.
- FAQ still links the old Google Form. Cutover (point dealers here, retire the Form) is not done.
- Backup/retention was deferred on purpose.
- `SCHEMA_VERSION` is `2026.3`.

Last production deploy: `fa59dc0` (discrete/clone inferred from types; dealer-facing project-detail copy; faded unedited defaults). Local/master also restores AV-device double-count in `totalProjectZones` and ceils hours in the email subject and body; that is not live until the server pull.

## Verify a look or form change

```bash
cd backend && npm test
```

Then open http://localhost:3000/rti_proposal/ — and confirm `/consultation` and `/faq` still look the same.

## Spec index (on demand)

[README.md](README.md) · [01-requirements](01-requirements.md) · [02-decisions](02-decisions.md) · [03-form-schema](03-form-schema.md) · [04-calculations](04-calculations.md) · [05-data-model](05-data-model.md) · [06-api](06-api.md) · [07-pdf-document](07-pdf-document.md) · [08-design-system](08-design-system.md)
