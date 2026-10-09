# RTI Proposal - Effort Model Implementation Plan

Plan for implementing the locked model in [09-effort-model.md](09-effort-model.md),
written 2026-10-07 for work on 2026-10-08. Nothing here is built yet.

## Decisions already made

- **PDF:** the Project Summary shows Overhead, Programming and Graphics hours,
  then the total. No per-zone rates, no line items (FR-19 still applies).
- **Global controllers:** the type select becomes Phone, Tablet, Large
  Touchscreen, Small Touchscreen. Each type is its own resolution; a repeat of
  a type is a clone (0 minutes, still listed).
- **Room controllers:** a single type, no form change. Every room controller
  is discrete and covers one room.
- **Total label** "Total Hours"; the three summary lines are whole hours that
  add up to the billed total (largest remainder); the Controller Overview keeps
  today's wording with no clone callout.
- **Rates:** use the minutes in 09-effort-model.md exactly as written (the
  worked examples were computed from those rounded values).
- **Overhead per room is tiered** (2026-10-08): the first room at full rate,
  each additional room at half.
- **Displays are always discrete** (2026-10-08): every TV or projector is
  priced at the discrete device rate. Sources, receivers and lifts keep the
  first-of-type-discrete, repeats-cloned rule. No form change.

## Steps

### 1. Keep the old calculator for old submissions

- Move the current `backend/proposal/calc/hoursData.js`, `rates.js` and the
  legacy parts of `systemData.js` into `backend/proposal/calc/legacy/`
  (rate card 2026.2). `parity.test.js` and the v1 preview
  (`GET /rti_proposal/preview.pdf?v=1`) keep using them unchanged.
- Old stored submissions are never recalculated; the audit view renders what
  was stored.

### 2. New rate card (`calc/rates.js`, version 2026.3)

- `RATE_CARD_VERSION = '2026.3'`.
- One table per line with six numbers: First Discrete prog / graphics,
  Additional Discrete prog / graphics, Room Controller prog / graphics
  (from the 09 tables): lighting, shading, keypad, audio zone, video zone,
  discrete device, cloned device, custom device, thermostat, heater / fan /
  pump, timer, alarm zone, alarm panel, access, camera, pool, relay, sense.
- Overhead: fixed (49 / 24 / 22), first room (30 / 30 / 27), each
  additional room (15 / 15 / 13.5), per room controller (36.8).
- Floorplan: per zone shown, per room, artwork per floor and per room (120,
  90% on additional floorplan controllers).
- The rate card stays server-side only (unchanged rule).

### 3. System data (`calc/systemData.js`)

Add, keeping existing fields where the PDF still uses them:

- `overheadRooms = rooms + exteriorZones` (a patio is always a room). Drives
  overhead, the floorplan room count and the room controller share.
- Global controllers from `globalControllerDetails` by type:
  `firstDiscreteGlobal` (0 or 1), `additionalDiscreteGlobals`,
  `clonedGlobals`. Legacy answers map iPhone -> Phone and iPad -> Tablet;
  legacy "Touchscreen" or untyped units each count as discrete.
- `roomControllerShare = roomControllerCount / overheadRooms` (each remote
  covers one room).
- No global controller: the first room controller becomes the First Discrete
  for programming and takes the fixed and per-room First Discrete overhead;
  its graphics stay at the room rate.
- `timerZones = heaterZones + fanZones + pumpZones` (no pool timer).
- `alarmPanel = alarmZones > 0 ? 1 : 0`.
- AV devices: keep the discrete / cloned / custom split per type
  (`splitByType`) for sources, and the uniform split for receivers and lifts,
  but every display is discrete (`displayDiscreteZones = displays`,
  `displayClonedZones = 0` for 2026.3; the legacy calculator keeps its split).
  Drop the device double count from zone totals; the double graphics weight
  now lives in the device rates.
- Floorplan: `floorplanControllers = min(floorplanAddOnCount, discrete
  globals)`; `floorplanZonesShown = lighting + shading + thermostat + heater
  + fan + alarm + access + pool + pump`; `floors`.

### 4. Hours (`calc/hoursData.js`)

- For each line, separately for programming and graphics:
  minutes = count x (first + additional x additionalDiscreteGlobals
  + room x roomControllerCount / overheadRooms).
  The room rate is 0 for cameras, alarm zones and the alarm panel.
- No global controller: the first room controller replaces the First
  Discrete. Programming uses the First Discrete rate (no room assignment for
  that controller); graphics use the room rate x 1 / overheadRooms; overhead
  takes fixed prog 49 + fixed graphics 24, first room prog 30 + graphics 30,
  each additional room prog 15 + graphics 15, plus its own 36.8. Any further
  room controllers are priced normally.
- Overhead: 49 + 24 + 22 x A + (30 + 30 + 27 x A)
  + (overheadRooms - 1) x (15 + 15 + 13.5 x A) + 36.8 x roomControllerCount,
  where A = additionalDiscreteGlobals.
- Floorplan lines as in 09.
- Output:
  - `lineItems`: `{ section, id, label, count, programmingMinutes,
    graphicsMinutes, minutes, hours }`.
  - `sectionHours` per section (overhead, lightingShading, keypads,
    audioVideo, climate, security, poolAndPumps, inputOutput, floorplan).
  - `breakdownHours`: `{ overhead, programming, graphics }`, where
    programming and graphics exclude overhead.
  - `totalProjectHours`: exact sum, no per-line rounding. Billed hours stay
    `ceil(totalProjectHours)`.

### 5. Data model (`backend/models/ProposalSubmission.js`)

- `LineItemSchema`: add optional `programmingMinutes`, `graphicsMinutes`,
  `minutes`; make `minutesPerUnit` and `rawHours` optional so 2026.2 and
  2026.3 line items both validate.
- Add optional `breakdownHours` (Mixed).
- Bump `schemaVersion` when the form changes (step 6).

### 6. Form (`backend/proposal/shared/schema.js`, `validate.js`)

- Global controller `type` select: Phone, Tablet, Large Touchscreen, Small
  Touchscreen.
- Floorplan help text: "Touchscreens and Apple devices only." Validation
  stays: floorplans cannot exceed global controllers.
- Rooms help text: count only rooms with something controlled (usually
  lighting, then audio). Exterior zones help text: each counts as a room.
- Update `formController.test.js` and `schema.test.js`.

### 7. Live estimate (`backend/proposal/estimate.js`)

- Return the new `sectionHours`, `breakdownHours` and `totalProjectHours`.
  Still totals only, never line items or minutes per unit.

### 8. PDF v2 (`pdf/formatProposalV2.js`, `pdf/proposalDocumentV2.js`)

- Project Summary band: three lines (Overhead, Programming, Graphics) in whole
  hours that add up to the billed total, then "Total Hours: N".
- Controlled Systems page: remove the pool timer sentence; climate timers now
  include pump timers (wording "N timers have been added" under Climate, or
  split, decided while building and shown to Jamie).
- Controller Overview: list types from `globalControllerDetails`
  (`N x Global Controller (Large Touchscreen)`), floorplan add-ons, room
  controllers. Clones are not called out.
- Keep the band layout rules in 07-pdf-document.md; the summary band grows
  by three lines and stays vertically centred.
- Existing layout bugs seen on the Deer Park preview (fix while here):
  the Controlled Systems band runs up into the page title when the list is
  long, and the Project Overview sentence does not mention exterior zones
  (Front Patio, Back Patio) even though they count as rooms.

### 9. Audit view (`backend/proposal/audit.js`)

- 2026.3 submissions: per line show count, programming minutes, graphics
  minutes, hours; then the three-way breakdown and the total.
- 2026.2 submissions: render exactly as today.

### 10. Tests

- New golden cases (exact minutes, within 1 minute; billed = ceil(hours)):
  - Small theater: 1 room, no exterior, Apple TV (video source), Sonos (audio
    source), 1 receiver, 1 TV, 1 room controller, no global = 359.4 min
    (5.99 h, billed 6).
  - Deer Park (RTI-20261007-10UQCP answers, 10 rooms + 1 exterior) =
    2,982.1 min (49.70 h, billed 50; PDF lines 13 / 15 / 22). Sections:
    overhead 764.2, lighting 760.3, keypads 425.7, audio video 1,031.8.
  - Deer Park without lighting and keypads = 1,796.1 min (29.94 h, billed 30).
  - Deer Park with 1 floorplan add-on (iPhone) = 2,982.1 + 1,909 min
    (floorplan: 100 zones x 2.25 + 11 rooms x 22.2 + 120 floor art + 11 x 120
    room art).
  - Deer Park as quoted (18 rooms + 2 exterior, keypads 0, audio zones 11) =
    2,969.3 min (49.49 h, billed 50; PDF lines 19 / 14 / 17). Sections:
    overhead 1,155.7, lighting 694.0, audio video 1,119.6.
- Rule tests: clones cost 0; repeated model is a clone, different models are
  discrete; displays are always discrete; no-global rule; cameras / alarm get
  no room time; timers on heaters, fans and pumps only; alarm panel added once
  when alarm zones > 0; exterior zones count as rooms; first room full
  overhead, later rooms half; no per-line rounding.
- Update `systemData.test.js`, `estimate.test.js`, `formatProposalV2.test.js`,
  `audit.test.js`, `submit.test.js`, `preview.test.js`.
- `parity.test.js` keeps testing the legacy calculator only.

### 11. Docs

- `04-calculations.md`: mark 2026.2 as legacy and point to 09 for 2026.3.
- `02-decisions.md`: ADR for the effort model (why: per-zone rates
  over-priced lighting-heavy jobs; Deer Park 138.4 vs 49.7).
- `07-pdf-document.md`: new Project Summary content.
- `03-form-schema.md`: controller model list, help text.
- `agent_brief.md` and `continuity.md`: recent change entry.

### 12. Verify and ship

- Run the full backend test suite.
- Local preview of the Deer Park PDF (v2) and the small theater.
- Email the Deer Park PDF to feeny.jamie@gmail.com only, for review.
- Commit, push and deploy per `deployment.md` only when Jamie says so.

## Rules to keep

- The rate card never reaches the browser.
- Never send real email during development (Jamie-only review sends are
  explicit).
- Do not hand-edit `frontend/sentinel_lite/`.
- `.apex` files are never uploaded or committed.
