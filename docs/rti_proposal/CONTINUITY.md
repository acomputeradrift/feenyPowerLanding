# RTI proposal — agent continuity

Catch-up for look and copy work. Do not rebuild the feature.

Live URL: https://www.feenypowerandcontrol.com/rti_proposal/

## Read, then stop

| Task | Read |
|---|---|
| Look, layout, CSS, header copy | this file, then [08-design-system.md](08-design-system.md) |
| Question labels or help text | [03-form-schema.md](03-form-schema.md) and `backend/proposal/shared/schema.js` |
| Hours, API, PDF, email, audit | the matching `0N-*.md` spec — only if that is the task |

Do not read the full spec set for a visual pass. `01`–`08` are constraining specs, not a backlog. If a spec is wrong, say so and update it in the same change.

Repo-wide rules: `development_continuity.md` and `deployment.md` at the repo root.

## What this is

A public branching form that emails an RTI programming-hour PDF. It exists because Google Forms cannot do count-driven repeat groups (N sources → N name fields).

Vanilla HTML/CSS/JS. No React, no bundler, no second test framework. Deploy is `git pull` + `pm2 restart "FPC Website"`.

## Hard no

- Do not edit `frontend/styles/global.css` or `frontend/styles/consultation.css`.
- Do not change existing routes or pages (`/consultation`, `/faq`, RTI diagnostics).
- Do not serve `backend/proposal/calc/` or any per-zone rate to the browser. Rates appear only on the audit view.
- Do not “fix” hour oddities: per-line rounding, timer double counting, section-vs-total mismatch, excluded processor hours.
- Do not send real mail unless `PROPOSAL_EMAIL_ENABLED` is the string `true`.
- Do not link `/rti_proposal/audit/` from any public page.
- Do not commit or push unless asked. Never commit `.env`.

## Where the look lives

| File | Role |
|---|---|
| `frontend/rti_proposal.html` | Page shell, header, partners, footer. Header line is invented and may change. |
| `frontend/styles/rti_proposal.css` | **Only** stylesheet you should edit for this page. Palette is CSS variables at the top. |
| `frontend/scripts/proposal/rti_proposal.js` | DOM: steps, inputs, estimate, submit. |
| `frontend/scripts/proposal/formController.js` | Answers object is the source of truth. Re-render from it. |
| `backend/proposal/shared/schema.js` | Questions, help text (preserve verbatim unless Jamie asks to change it), `visibleIf`, repeats. |

Load order in the HTML, do not reorder:

`global.css` → `consultation.css` → `rti_proposal.css`

Shared schema is imported by the browser from `/scripts/proposal/shared/{schema,validate,repeatGroups}.js` only.

## Copy that is fair game

- Header under the H1: *Describe the project scope and I will email you a programming budget.*
- From-name on mail (`proposals` today). Address stays `proposals@feenypowerandcontrol.com`.
- Page title / meta description.

Help text in the schema is domain knowledge. Do not rewrite it for tone.

## Implementation snapshot (2026-08-17)

Built and live. Do not reimplement.

- Form, persist, pdfmake PDF, Resend email, audit route, `MONGO_URI` fail-fast.
  The public form does not show a live hours estimate; hours remain on the PDF
  and audit view. Count fields default to their minimum (rooms and floors start at 1; most
  others at 0). Repeat names default to the item label (Room 1, Exterior Zone 1,
  Audio Source 1, …). Zero rooms or zero floors is invalid. At least one global or room
  controller is required.
- Reply-To is `Feeny.jamie@gmail.com`. BCC is the same inbox. Sending is on in production.
- Audit route is disabled until `PROPOSAL_AUDIT_TOKEN` is set on the **server** `.env`.
- FAQ still links the old Google Form. Cutover (point dealers here, retire the Form) is not done.
- Backup/retention was deferred on purpose.

## Verify a look change

```bash
cd backend && npm test
```

Then open http://localhost:3000/rti_proposal/ — and confirm `/consultation` and `/faq` still look the same.

## Spec index (on demand)

[README.md](README.md) · [01-requirements](01-requirements.md) · [02-decisions](02-decisions.md) · [03-form-schema](03-form-schema.md) · [04-calculations](04-calculations.md) · [05-data-model](05-data-model.md) · [06-api](06-api.md) · [07-pdf-document](07-pdf-document.md) · [08-design-system](08-design-system.md)
