# 02 - Decision Records

Decisions taken during planning, with the reasoning and the alternatives that were
rejected. Read this before proposing a different approach.

Each record states the decision, why, what was rejected, and what would justify
revisiting it.

---

## ADR-001: Build inside feenyPowerLanding rather than as a separate application

**Decision.** The proposal form is a new feature area in this repository, served
at `/rti_proposal/` by the existing Express application, following the precedent
of `/rti_diagnostics/`.

**Why.** The existing deployment path already works and is documented: push to
`master`, pull on the droplet, `pm2 restart "FPC Website"`. Reusing it means no
new nginx server block, no second PM2 process, no additional port, no new TLS
certificate, and no second deployment procedure to keep in sync. MongoDB,
Mongoose, Express and dotenv are already installed and configured.

**Rejected.** A standalone application on the same droplet, and a standalone
application in its own repository. Both add operational surface for no functional
gain at this volume, and both split the deployment story in two.

**Revisit if.** The form grows into a product with its own release cadence, or
needs to scale independently of the marketing site.

---

## ADR-002: Vanilla JavaScript, no framework and no build step

**Decision.** The form UI is vanilla HTML, CSS and JavaScript using native ES
modules. No React, no Vue, no bundler, no TypeScript.

**Why.** Three reasons, in order of weight.

First, the deployment model has no build step. `deployment.md` is built around
pulling source and restarting Node. Introducing a bundler means either committing
build artifacts or running a build on the production droplet, which breaks the
documented procedure and adds a failure mode during deploys.

Second, the complexity of this form lives in its question definitions, not its
rendering. A schema-driven renderer is written once; every subsequent question is
a data edit. A framework would not reduce the amount of schema work.

Third, plain ES modules let the browser and the server import the *same* question
and validation definitions with no bundler involved. That eliminates a class of
bug where client and server disagree about what is valid.

**Acknowledged cost.** A large project can render 60 to 100 inputs with dynamic
add and remove behaviour. This is the situation where a framework normally earns
its place, and hand-rolled state management is the main technical risk in the
build. The mitigation is a single plain answers object as the sole source of
truth, with section-level re-render from that object. At this input count, full
section re-render is imperceptible and avoids fine-grained diffing entirely.

**Rejected.** React with Vite for this page only. Considered seriously and
rejected on the deployment grounds above.

**Revisit if.** The renderer's state handling becomes the dominant source of
defects. The schema is plain data and ports to a framework unchanged, so this
decision is reversible without rewriting the question catalogue.

---

## ADR-003: pdfmake for PDF generation

**Decision.** Generate the proposal PDF with `pdfmake`.

**Why.** It is pure JavaScript with no system dependencies, and its declarative
document definition suits a document assembled from conditional sections.

**Rejected.** Puppeteer rendering an HTML template. It produces excellent
fidelity and would let the PDF share CSS with the site, but it installs a full
Chrome binary - roughly 300MB - and consumes substantially more memory per render.
That is disproportionate on a small droplet whose main job is serving a marketing
site. Also rejected: `pdfkit`, which is lower level and would mean hand-managing
layout that pdfmake expresses declaratively.

**Revisit if.** The proposal needs visual fidelity that pdfmake cannot achieve,
particularly complex multi-column layouts or precise reproduction of a designed
template.

---

## ADR-004: Rates in a version-controlled file, not a database or admin UI

**Decision.** Every per-zone minute value lives in a single module containing no
logic, with an explicit rate card version identifier. Changing a rate is a code
edit and a deploy.

**Why.** Git history becomes a complete, tamper-evident audit log of every pricing
change, with dates, authorship and a commit message explaining the reason. An
admin UI would provide faster edits but a worse audit trail, and would require
building authentication for a site that currently has none.

Rates are passed into the calculators as an argument rather than imported by them,
so alternative rate cards can be unit tested and historical submissions can be
recomputed under their original rates.

**Rejected.** Rates in MongoDB with a password-protected admin page. Rejected for
this phase because it needs an auth system, and because mutable rate rows make
historical proposals unexplainable unless snapshots are kept anyway.

**Revisit if.** Rates begin changing often enough that deploying for each change
becomes friction. The snapshot mechanism described in
[05-data-model.md](05-data-model.md) already handles the hard part, so adding an
editing UI later is incremental.

---

## ADR-005: The rate card is server-side only

**Decision.** Per-zone minute values are never sent to the browser. The live hours
estimate is produced by a server endpoint returning totals only.

**Why.** The rates are the pricing model of the business. Because the question
schema and validation rules are deliberately shared with the browser, there is an
obvious temptation to share the calculators too and compute the estimate locally,
which would publish the entire rate card in page source.

**Consequence.** The live estimate costs a debounced network request per change.
This is an accepted trade.

---

## ADR-006: MongoDB for persistence

**Decision.** Persist submissions in the existing MongoDB instance using Mongoose,
following the model pattern in `backend/models/`.

**Why.** It is already running, already connected, and already has an established
convention in this repository. Introducing a second datastore would be the wrong
call regardless of its merits.

The document model also genuinely fits the data. A submission is naturally one
document: nested answers with variable-length repeat groups, plus a variable
length line-item array. Relationally that is several tables and joins to
reassemble one proposal, or a JSON column that is a document by another name.
Schema flexibility also matches the requirement that the question set keeps
evolving, so older submissions with fewer fields coexist with newer ones without
migrations. The access pattern - insert once, read rarely, no joins, no
cross-entity transactions, no user accounts - stresses nothing Mongo is weak at.

**Acknowledged costs.** Nothing prevents malformed data at the storage layer; the
Mongoose schema and shared validation enforce shape at the application layer
instead. And if cross-submission reporting is wanted later, SQL would be more
comfortable than the aggregation pipeline.

**Rejected.** SQLite with Prisma, proposed before the existing MongoDB setup was
known. Postgres, for the same reason plus higher operational cost.

**Follow-up, done.** `backend/fpc_server.js` requires `MONGO_URI` and exits if it
is unset or empty. There is no `testdb` fallback.

---

## ADR-007: Node's built-in test runner

**Decision.** Tests use `node --test`.

**Why.** It requires no new dependency in a repository that currently has no test
tooling at all, and no configuration file. The calculators are pure functions, so
nothing more capable is needed.

**Rejected.** Jest and Vitest. Both would work; both add dependencies and
configuration to a repository whose defining characteristic is having none.

---

## ADR-008: Golden-master parity testing against the legacy system

**Decision.** Before porting any calculation, run the legacy Apps Script
calculators against the existing test fixture with `Logger` stubbed, and record
the resulting derived totals and hours as a committed JSON fixture. The ported
code is then tested against that fixture.

**Why.** The hour math is the commercially valuable part of the system and the
easiest thing to break invisibly. The legacy calculators are pure apart from
logging, which makes this cheap. A silent change to the estimates would be
discovered by customers, not by us.

**Consequence.** Known oddities in the legacy behaviour are preserved rather than
fixed as part of the port, including the per-line rounding described in
[04-calculations.md](04-calculations.md). Deliberate changes to the business rules
happen after parity is established, as separate commits with their own fixture
updates.

---

## ADR-009: Drop the Google Sheets project workbook

**Decision.** The workbook generated by the legacy pipeline is not reproduced.

**Why.** It was only partially populated - of its dynamically created tabs, only
Project Info, Rooms and Ports received data - and the PDF proposal is the artifact
that matters to dealers.

**Note.** The `xlsx` package is already a dependency of this repository, so
producing a real spreadsheet later is inexpensive. The legacy tab-selection rules
remain readable in the old repository's `getDynamicSheetNames.js` if needed.

---

## ADR-010: Transactional email over an HTTPS API, not direct SMTP

**Decision.** Send mail through a transactional provider's HTTPS API.

**Why.** DigitalOcean blocks outbound SMTP on port 25 by default, and mail
originating from a droplet IP address without established sending reputation
routinely lands in spam. A proposal that silently fails to arrive is worse than a
visible error. SPF and DKIM records for the sending domain are part of this
decision, not an optional extra.

**Rejected.** Direct SMTP from the droplet.

---

## ADR-011: Canonical /rti_proposal/ URL with an originalUrl-guarded redirect

**Decision.** Serve the form at `/rti_proposal/`. Redirect `/rti_proposal` only
when `req.originalUrl` (query stripped) is exactly that path, then `next()` to
the trailing-slash handler.

**Why.** Express has `strict routing` off by default, so `/rti_proposal` and
`/rti_proposal/` are the same route. An unguarded redirect would loop on the
canonical URL.

**Rejected.** Enabling `app.set('strict routing', true)` globally, which would
change every existing route.

**Revisit if.** The application enables strict routing for other reasons.

