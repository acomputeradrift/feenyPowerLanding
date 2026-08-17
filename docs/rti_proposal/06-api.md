# 06 - API

Four routes, registered from `backend/routes/proposal.js` and mounted in
`backend/fpc_server.js`.

## Registration

Follow the existing pattern in `fpc_server.js`. The only additions to that file are
the router mount, the page route, the audit page route, and the shared-module
static mount:

```javascript
import proposalRoutes, { handleProposalAudit } from './routes/proposal.js';

app.use('/api/proposal', proposalRoutes);

app.use('/scripts/proposal/shared',
    express.static(path.join(__dirname, 'proposal/shared')));

app.get('/rti_proposal', (req, res, next) => {
    const pathOnly = req.originalUrl.split('?')[0];
    if (pathOnly === '/rti_proposal') {
        res.redirect('/rti_proposal/');
        return;
    }
    next();
});

app.get('/rti_proposal/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/rti_proposal.html'));
});

app.get('/rti_proposal/audit/:reference', handleProposalAudit);
```

Note that `express.json()` is already applied globally in `fpc_server.js`, so no
body parser is needed here. Existing routes must not be touched (NFR-5).

---

## GET /rti_proposal/

Serves the form page. Static HTML; the schema and renderer are fetched as ES
modules by the browser.

Trailing slash matches the `/rti_diagnostics/` convention. Add a redirect from
`/rti_proposal` so both forms work.

Express does **not** treat those as distinct paths by default (`strict routing`
is off), so a naive `app.get('/rti_proposal')` redirect would also match
`/rti_proposal/` and loop. Redirect only when `req.originalUrl` (query stripped)
is exactly `/rti_proposal`, then `next()` so the trailing-slash handler can
serve the page.

---

## POST /api/proposal/estimate

Returns a live hours estimate for a partially completed form (FR-9).

This endpoint exists solely so the rate card can stay on the server (ADR-005). It
is called on a debounce as the dealer types.

**Request**

```json
{ "answers": { "lightingZones": 10, "audioZones": 8 } }
```

Partial answers are expected and normal. Missing fields are treated as zero.

**Response 200**

```json
{
  "sectionHours": {
    "lightingShading": 4.4,
    "audioVideo": 3.6,
    "climate": 0,
    "security": 0,
    "poolAndPumps": 0,
    "inputOutput": 0,
    "controllers": 0
  },
  "totalProjectHours": 8.0
}
```

**Rules**

- Returns section totals and the project total **only**. Never line items, never
  `minutesPerUnit`, never anything from which a rate could be derived. Returning
  both a count and its hours for a single-line section would let a caller divide
  one by the other and recover the rate, so aggregate at section level.
- Never persists anything.
- Never sends email.
- Tolerates invalid input by treating unparseable values as zero rather than
  returning errors. This endpoint fires mid-typing; a validation error while
  someone is halfway through entering "12" is noise.
- Rate limited more loosely than submission, but still limited.

---

## POST /api/proposal

The real submission (FR-11).

**Request**

```json
{
  "answers": { "...": "the complete answers object" },
  "honeypot": ""
}
```

**Response 201**

```json
{
  "reference": "RTI-20260817-K3M9QP",
  "totalProjectHours": 42,
  "emailedTo": "john@example.com"
}
```

When PDF generation or email delivery has not completed, the same 201 body
includes `"delivery": "pending"`. That is an operational note, not a client error.

**Response 400**

```json
{
  "error": "validation_failed",
  "fieldErrors": {
    "contractorEmail": "A valid email address is required",
    "bonus": "Unknown field"
  }
}
```

**Processing order**

This sequence is normative. It exists so that a failure late in the pipeline cannot
lose a valid submission (FR-15).

1. Check the honeypot field. If non-empty, respond 201 with a plausible body and
   discard silently. Do not reveal that the submission was rejected.
2. Validate with the shared `validate.js`. On failure respond 400 with per-field
   errors and stop.
3. Derive `systemData`, then `hoursData` with line items.
4. **Persist the submission** with `emailStatus: 'pending'`.
5. Generate the PDF.
6. Send the email.
7. Update `emailStatus` to `sent` or `failed`, recording `emailError` on failure.
8. Respond 201.

If step 5 or 6 fails, the submission is already stored and recoverable. Respond 201
with a note that delivery is pending rather than 500 — from the dealer's point of
view their submission succeeded, and the failure is operational. Do not ask a dealer
to re-enter a 60-field form because an email provider had an outage.

**Rules**

- Never trust client validation (FR-8, NFR-6).
- Reject unknown keys rather than ignoring them, so a schema mismatch surfaces
  immediately.
- Rate limit per IP.
- Cap request body size. A repeat group with a mistyped count is the obvious abuse
  vector.
- In development, email must be written to disk or logged rather than sent. Guard
  on an explicit environment variable, not on `NODE_ENV` alone.

---

## GET /rti_proposal/audit/:reference

Internal breakdown view (FR-20, FR-21).

**Authentication.** A shared secret from `process.env.PROPOSAL_AUDIT_TOKEN`,
supplied as the query parameter `token` or the header `X-Proposal-Audit-Token`.
The header wins if both are present. This is deliberately not a login system;
the site has no auth and this feature does not justify building one.

Requirements:

- If `PROPOSAL_AUDIT_TOKEN` is unset or empty, the route must be disabled entirely
  rather than open. An unset secret must never mean unauthenticated access.
- Compare in constant time.
- Return 404, not 403, on a bad token, so the route's existence is not confirmed to
  a prober.
- Send `X-Robots-Tag: noindex` and `Cache-Control: no-store`.

**Response.** An HTML table of every line item grouped by section, showing count,
minutes per unit, raw hours and rounded hours, with section subtotals and the
project total. Include `rateCardVersion`, `schemaVersion` and `submittedAt`.

Where rounding changed a value, show both `rawHours` and `hours` so the effect of
the per-line rounding described in [04-calculations.md](04-calculations.md) is
visible rather than implied.

This is the only surface where rates are shown. It must never be linked from a
public page.

---

## Configuration

New environment variables, added to `backend/.env` both locally and on the server.
`deployment.md` records that the two files are not synced by git, so both need
updating by hand.

| Variable | Purpose |
|---|---|
| `PROPOSAL_EMAIL_API_KEY` | transactional email provider credential |
| `PROPOSAL_EMAIL_FROM` | verified sending address |
| `PROPOSAL_EMAIL_BCC` | business owner's copy of every proposal |
| `PROPOSAL_AUDIT_TOKEN` | secret for the audit route |
| `PROPOSAL_EMAIL_ENABLED` | must be explicitly true to send real mail |
| `PROPOSAL_IP_HASH_SALT` | salt for hashing client addresses |

No default may be a working production value. The legacy system hardcoded a Drive
folder id, a template id and a recipient address in source; none of that is carried
forward (NFR-6).
