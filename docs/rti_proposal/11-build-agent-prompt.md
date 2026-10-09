# Build agent prompt - Effort model (rate card 2026.3)

Copy everything below the line into a new agent.

---

You are implementing a new hours model for the RTI proposal calculator in this
repository (feenyPowerLanding). The model is fully decided. Your job is to
build it exactly as specified, prove it with tests, and stop before committing.

## Read first, in this order

1. `continuity.md` and `deployment.md` (repository rules).
2. `docs/rti_proposal/README.md` and `docs/rti_proposal/agent_brief.md`.
3. `docs/rti_proposal/09-effort-model.md` - the locked model. Every minute
   value comes from its tables. Do not change any number.
4. `docs/rti_proposal/10-effort-model-implementation-plan.md` - the step
   plan. Follow its steps in order. Where this prompt and the plan differ, the
   plan wins on structure and 09 wins on numbers.
5. The current code: `backend/proposal/calc/` (systemData, hoursData, rates,
   parity test), `backend/proposal/estimate.js`, `submit.js`, `audit.js`,
   `backend/proposal/pdf/formatProposalV2.js`, `proposalDocumentV2.js`,
   `backend/proposal/shared/schema.js`, `validate.js`,
   `backend/models/ProposalSubmission.js`.

## Decisions (already made by Jamie, the owner)

- PDF Project Summary shows three lines - Overhead, Programming, Graphics -
  then the total. No per-zone rates or line items anywhere in the PDF.
- Total label: "Total Hours". The three lines are whole hours that add up to
  the billed total (largest remainder). Billed total = ceil(exact hours).
- Global controller type select becomes: Phone, Tablet, Large Touchscreen,
  Small Touchscreen. The first of each type is discrete (first one overall is
  the First Discrete, the rest Additional Discrete); a repeat of a type is a
  clone (0 minutes, still listed). Legacy answers map iPhone -> Phone,
  iPad -> Tablet; legacy "Touchscreen" or untyped units each count as
  discrete.
- Room controllers: a single type with no select (no form change). Each is
  discrete and covers one room.
- Controller Overview page keeps today's wording; clones are not called out.
- Rooms for overhead, floorplan and room share = rooms + exteriorZones.
- Per-room overhead is tiered: the first room at full rate (30 / 30 / 27),
  each additional room at half (15 / 15 / 13.5).
- Displays (TVs and projectors) are always discrete devices, never cloned.
  Sources, receivers and lifts keep the first-of-type discrete, repeats
  cloned rule.
- No per-line rounding. Sum exact minutes.
- New rate card version `2026.3`. Keep the 2026.2 calculator in
  `backend/proposal/calc/legacy/` for `parity.test.js`, the v1 preview, and
  old stored submissions (never recalculate stored submissions).

## Acceptance tests (must pass exactly, within 1 minute)

Small theater: rooms 1, floors 1, exteriorZones 0, one video source
(Media Player), one audio source (Streamer), 1 AV receiver, 1 display (TV),
no global controllers, 1 room controller. Expected 359.4 min (5.99 h, billed 6).

Deer Park (counts only; no contractor details):

- rooms 10, floors 1, exteriorZones 1
- lightingZones 100, keypadZones 26, shadingZones 0
- audioZones 7, videoZones 0
- audio sources: 2 x type Streamer (1 discrete, 1 cloned)
- video sources: 4 x type Media Player (1 discrete, 3 cloned)
- avReceiverDiscreteZones 4 (1 discrete, 3 cloned)
- displays: 5 x type TV (all 5 discrete; displays are never cloned)
- global controllers: Phone, Large Touchscreen (2 discrete). The same result
  must come from legacy answers iPhone + "Touchscreen".
- floorplanAddOnCount 0, roomControllerCount 4
- everything else 0

That is 8 discrete and 7 cloned devices. Expected 2,982.1 min (49.70 h,
billed 50; PDF lines Overhead 13, Programming 15, Graphics 22). Sections:
overhead 764.2, lighting 760.3, keypads 425.7, audio video 1,031.8. The
worked-example table in 09 gives the per-controller split; match it.

- Deer Park with lightingZones 0 and keypadZones 0: 1,796.1 min (29.94 h,
  billed 30).
- Deer Park with floorplanAddOnCount 1: 2,982.1 + 1,909 min.
- Deer Park as quoted: rooms 18, exteriorZones 2, keypadZones 0,
  audioZones 11, everything else as above. Expected 2,969.3 min (49.49 h,
  billed 50; PDF lines 19 / 14 / 17). Sections: overhead 1,155.7,
  lighting 694.0, audio video 1,119.6.

Also add rule tests listed in step 10 of the plan.

## Constraints

- The rate card never reaches the browser; the estimate endpoint returns
  totals only.
- Never send real email. Use the local preview to check PDFs.
- Do not hand-edit `frontend/sentinel_lite/`. Do not edit the sibling
  `RTI AutoProposal` repository.
- Do not commit, push or deploy. Leave changes uncommitted for Jamie.
- Leave unrelated uncommitted files alone.
- User rule: write commands in cmd.exe syntax when showing them to Jamie; the
  actual machine is macOS zsh.

## When you finish

1. Run the full backend test suite and report results.
2. Generate local v2 preview PDFs for Deer Park and the small theater and
   show them (screenshots or file paths).
3. Update the docs listed in step 11 of the plan.
4. Report: what changed (by file), test results, the two PDF totals, and
   anything in 09 or 10 that turned out to be ambiguous and how you resolved
   it. If a number in 09 cannot be reproduced, stop and report rather than
   adjusting rates.
