# 05 - Data Model

One collection, one document per submission. See [02-decisions.md](02-decisions.md)
ADR-006 for why MongoDB.

## Design principles

**A submission is an immutable record.** Once written it is never edited. Delivery
status fields are the only exception, and they are append-only in spirit: they
record what happened, not what should happen.

**A submission is self-explaining.** It carries the rate card version and the full
line-item breakdown that produced its numbers. A proposal from March remains
explainable after rates change in June without consulting any other record
(FR-14).

**Answers are stored as submitted.** The raw answers object is kept alongside the
derived values, so a submission can be recomputed if a calculation bug is found.
Never store only the derived output.

## Model file

`backend/models/ProposalSubmission.js`, following the existing pattern in
`backend/models/LogFile.js`: a named schema constant, then a single exported model.

```javascript
import mongoose from 'mongoose';

const LineItemSchema = new mongoose.Schema({
  section:        { type: String, required: true },
  id:             { type: String, required: true },
  label:          { type: String, required: true },
  count:          { type: Number, required: true },
  minutesPerUnit: { type: Number, required: true },
  rawHours:       { type: Number, required: true },
  hours:          { type: Number, required: true }
}, { _id: false });

const ProposalSubmissionSchema = new mongoose.Schema({
  reference:        { type: String, required: true, unique: true, index: true },
  submittedAt:      { type: Date, required: true, index: true },

  contractorName:   { type: String, required: true },
  contractorEmail:  { type: String, required: true },
  projectPoName:    { type: String, required: true },
  projectClientName:{ type: String },

  answers:          { type: mongoose.Schema.Types.Mixed, required: true },
  systemData:       { type: mongoose.Schema.Types.Mixed, required: true },

  rateCardVersion:  { type: String, required: true },
  lineItems:        { type: [LineItemSchema], required: true },
  sectionHours:     { type: mongoose.Schema.Types.Mixed, required: true },
  totalProjectHours:{ type: Number, required: true },

  pdfFilename:      { type: String },
  emailStatus:      {
                      type: String,
                      enum: ['pending', 'sent', 'failed'],
                      default: 'pending'
                    },
  emailError:       { type: String },
  emailedAt:        { type: Date },

  clientIpHash:     { type: String },
  userAgent:        { type: String },
  schemaVersion:    { type: String, required: true }
});

export const ProposalSubmission =
  mongoose.model('ProposalSubmission', ProposalSubmissionSchema);
```

## Field notes

**`reference`** - a short human-quotable identifier, generated server-side, used in
the PDF filename and the audit URL. Format
`RTI-{yyyymmdd}-{6 random alphanumerics}`, for example `RTI-20260817-K3M9QP`. Do not
expose the Mongo `_id` in URLs or filenames; a random suffix avoids leaking how many
proposals have been submitted.

**`contractorName`, `contractorEmail`, `projectPoName`, `projectClientName`** -
promoted out of `answers` and stored as first-class fields because they are needed
to list and search submissions without unpacking a Mixed value. They are duplicated,
not moved: `answers` remains complete.

**`answers`** - the raw validated answers object exactly as specified in
[03-form-schema.md](03-form-schema.md), including repeat-group arrays. Stored as
`Mixed` because its shape changes as questions are added; that flexibility is a
reason MongoDB was chosen.

**`systemData`** - derived zone rollups and equipment counts. Stored so an audit can
show the intermediate step between answers and hours without recomputing.

**`rateCardVersion`** - the `RATE_CARD_VERSION` in force at submission. The rate
*values* are not copied into the document; the version plus git history reconstructs
them, and `lineItems` already records the `minutesPerUnit` actually applied to every
charge. That combination is sufficient to re-derive any figure.

**`lineItems`** - the complete breakdown. This is the audit trail (FR-12, FR-20).
Subdocuments use `_id: false` because they are values, not entities.

**`sectionHours`** - per-section totals keyed by section id. Derived from
`lineItems`, stored to avoid recomputation on display.

**`emailStatus`** - a submission is persisted before delivery is attempted (FR-15).
A failed send must never lose the submission; it means someone can resend from a
stored record rather than asking the dealer to fill the form in again.

**`pdfFilename`** - the generated filename. Whether the PDF bytes are retained on
disk is deliberately left open; the document is regenerable from `answers` and
`lineItems`, which is the stronger guarantee. If PDFs are stored, put them outside
the repository and outside `backend/uploads/`, which is used by RTI diagnostics.

**`clientIpHash`** - a salted hash, not the address itself. It exists for abuse
investigation only. Storing raw IP addresses for a public form is personal data with
no purpose here.

**`schemaVersion`** - which version of the question schema produced these answers.
When questions change, this is what lets you tell whether a missing field means "not
asked yet" or "left blank". Without it, older submissions become ambiguous.

## Validation boundary

Mongoose enforces required fields and types, but MongoDB does not enforce the shape
of `Mixed` values. Shape is guaranteed by `validate.js` running on the server before
persistence (ADR-006). Never write a submission that has not passed that validation.

## Indexes

`reference` is unique and indexed for audit lookups. `submittedAt` is indexed for
chronological listing. Nothing else needs an index at this volume; add one when a
real query demands it, not speculatively.

## Configuration

`backend/fpc_server.js` requires `MONGO_URI` and exits at startup if it is unset
or empty. There is no fallback to `testdb`. Both the local and server `.env`
files must set it; `deployment.md` records that those files are not synced by
git.

## Retention and backup

Not addressed in this phase, by explicit decision. Worth revisiting: proposal
history is business record data, materially more valuable than the uploaded log
files this MongoDB instance currently holds.
