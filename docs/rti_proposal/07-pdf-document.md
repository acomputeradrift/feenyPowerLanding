# 07 - Proposal Document

Specification for the generated PDF, built with `pdfmake` (ADR-003) in
`backend/proposal/pdf/proposalDocument.js`.

## Source of truth

The legacy Google Docs template used `{{PLACEHOLDER}}` merge fields replaced by
`processFormDataForOutput.js`. The new document is built from structured data
instead, so there are no placeholders and no merge step. The template's *structure*
is reproduced; its mechanism is not.

The template text is reproduced verbatim in Appendix B of the planning document at
`~/.cursor/plans/rti_proposal_web_app_a87770fa.plan.md`.

**Visual reference.** Layout, colours and logo placement are taken from a
production Google Docs export (Dave Marshall / OFFICE, 2026-08-14). US Letter,
centred type, Feeny logo then RTI logo on the cover.

| Page | Band | Colour |
|---|---|---|
| 1 Cover | lower third | charcoal `#575759`, white type |
| 2 System Integration Scope | body | gold `#f1b353`, black type |
| 3 RTI Equipment Scope | equipment block | steel `#a7a9ac`, black type |

Additional Info sits on page 3 below the equipment block, matching the live
export. The earlier four-page split was inferred from a text dump and was
wrong: production is three pages. Copyright is on every page; the year is
derived, not hardcoded 2025.

Do not put per-zone rates in this document.

## Structure

Three pages, matching the production Google Docs export.

### Page 1 - Cover

- Heading: "Unlock Seamless Smart Home Integration With Remote System Programming"
- "Prepared for:" followed by contractor name and contractor email
- Project client name, project PO, project location, project timeline
- Total programming hours

The heading deliberately echoes the site's own headline treatment on
`/consultation`, which reads "Unlock Seamless AV Integration With Remote
Programming".

### Page 2 - System Integration Scope

Intro line: "The following is a summary of the electronic systems that will be
controlled by RTI."

Then, in order: Lighting/Shading, Audio/Video, Climate, Security, Pool/Pumps. Each
is a heading carrying its hours suffix, followed by that section's item list.

### Page 3 - RTI Equipment Scope

Intro line: "The following is a summary of the RTI controllers that have been
specified for the job, plus any inputs or outputs."

Then Controllers, then Inputs/Outputs, in the same heading-plus-list form.

The split across pages 2 and 3 matters: the seven scope sections are **two groups**,
not one flat list. Systems being controlled are separated from the RTI hardware
doing the controlling.

Additional Info follows on the same page: the project site summary, optional
room names, then the dealer's notes.

### Additional Info

- The project site summary sentence
- The dealer's additional info
- Copyright line

## Formatting rules

Reproduced from `processFormDataForOutput.js`. These produce the dealer-visible
wording and must be preserved.

### Hours suffix

Appended to each section heading:

- Zero hours renders as an empty string, so the heading reads simply "Climate"
- One hour renders as " (1 hr)"
- Otherwise " (N hrs)", where N is `ceil(sectionHours)`

The leading space is deliberate so headings read "Climate (2 hrs)".

### Count lines

A count of zero produces no line at all. Otherwise the line is the count followed by
a correctly singularised label: "1 Lighting Zone" versus "3 Lighting Zones".

### Empty sections

A section with no lines renders the literal text "None Included." rather than being
omitted. A dealer should be able to see that climate control was considered and
excluded, not wonder whether it was forgotten.

### Section contents

- **Lighting/Shading** - Lighting Zones, Shading Zones, Keypad Zones
- **Audio/Video** - Audio Zones, Audio Sources, AV Receiver Zones, Video Zones,
  Video Sources, Display Zones. Note this uses the combined discrete-plus-cloned
  totals, not the separate counts the calculation uses.
- **Climate** - Thermostat Zones, Heater Zones, Fan Zones, then a sentence when
  timers apply: "N climate timers have been added", or "1 climate timer has been
  added"
- **Security** - Alarm Zones, Access Zones, Camera Zones
- **Pool/Pumps** - Pool Zones, Pump Zones, then the equivalent timer sentence: "N
  pool and pump timers have been added"
- **Controllers** - Global Controllers, Floorplan Add-Ons, Room Controllers
- **Inputs/Outputs** - Input Zones (Sense), Output Zones (Relays)

### Project site summary

Assembled as: "This project covers {areas} across {floors}." followed by an exterior
sentence.

- Areas: "1 integrated area" or "N integrated areas"
- Floors: "a single floor" or "N floors"
- Exterior, when zero: " No exterior areas are included."
- Exterior, when one: " 1 exterior zone is included."
- Otherwise: " N exterior zones are included."

### Total hours

"Total Programming Hours: N" where N is `ceil(totalProjectHours)`.

Be aware this can appear inconsistent with the section headings, which are each
independently rounded up. See the known inconsistency in
[04-calculations.md](04-calculations.md).

## Changes from the legacy template

Four deliberate departures.

**Drop three dead merge fields.** `{{NUMBER_ROOMS}}`, `{{NUMBER_FLOORS}}` and
`{{NUMBER_EXT_ZONES}}` are computed by the legacy code but appear nowhere in the
template. Room and floor counts reach the reader only through the site summary
sentence. Do not reintroduce them without a reason.

**Derive the copyright year.** The template hardcodes "© 2025 Feeny Power and
Control Ltd. All Rights Reserved." Use the current year.

**Fix the trailing period.** The template places a literal period after the
additional-info placeholder, so the "No Additional Info" fallback renders as a
sentence while real dealer prose gets a stray period appended. Punctuate the
fallback text itself instead.

**Add named items.** This is the payoff for the whole project (FR-18). Where the
dealer supplied names, list them instead of bare counts. "3 Audio Sources" becomes a
list of "Sonos Port", "Apple TV", "Turntable"; rooms carry real names rather than the
"Room 1" through "Room N" the legacy workbook generated.

Names are optional, so both forms must render correctly. When names are absent, fall
back to the count line exactly as the legacy template produced it.

## What the document must not contain

The PDF shows **section totals only** (FR-19). It must never include per-zone minute
rates, line items, or `minutesPerUnit`. The breakdown is internal and belongs in the
audit view (ADR-005).

## Filename

`{reference} {contractorName} {projectPoName} RTI Proposal.pdf`, with characters
outside `[A-Za-z0-9]` replaced by underscores in the name components.

The legacy filename led with a date; leading with the reference makes the file
directly traceable to its stored submission.

## Generation contract

- Pure function of `(submission, systemData, hoursData)` returning a buffer or
  stream. No database access, no email sending, no filesystem writes.
- Deterministic apart from the copyright year, so it can be snapshot tested.
- Must not require a headless browser or any system-level dependency (NFR-8).

## v2 (live email)

Emailed submissions use the five-page v2 document from `proposalDocumentV2.js`.
The three-page v1 document above remains in `proposalDocument.js` for
`GET /rti_proposal/preview.pdf?v=1`. Local preview defaults to v2.

v2 pages:

1. Cover — white top unchanged. Orange band (`#fcb040`) is sized to its three
   identification lines, with the copy vertically centered in the band and the
   band vertically centered on the page (`absolutePosition`, `y = (792 - height) / 2`).
   The RTI logo is larger (480×76) and centered in the white space below the
   orange band. Project PO, Project Client Name, and Project Location, 16pt.
   No timeline or hours on the cover.
2. Project Overview — title stays at the top. Dark grey band (`#575759`) is
   sized to the generated paragraph, copy vertically centered in the band, band
   vertically centered on the page. Body text is left-aligned: rooms and names,
   included systems, controller summary, additional info, commissioning date.
3. Controlled Systems Overview — title stays at the top. Green band (`#39b54a`)
   lists every category (Lighting/Shading, Audio/Video, Climate, Security,
   Pool/Pumps, Inputs/Outputs) with `N x` zone and device lines inside each.
   Empty categories print `None Included`.
4. Controller Overview — title stays at the top. Light grey band (`#a7a9ac`)
   sized to the `N x` iPhone/iPad/Touchscreen Global Controller and
   `N x ISR-4 Room Controller` lines.
5. Project Time Budget — title at the top. Orange band again (color cycle
   repeats) contains only `Total Programming Hours: N`. Acceptance copy is
   left-aligned: "I approve this budget and understand that work will commence
   when Feeny Power and Control Ltd has received a 50% deposit." Client
   signature, print name, and date sit below in a centered 516pt block
   (48pt side margins) with left-aligned labels and a shared line start and end.

Band colors follow the Feeny logo: orange, dark grey, green, light grey, then
repeat. Band body text is the same 16pt Roboto as the cover Project PO lines.
Every band is full-bleed, padded equally above and below its copy, and centered
on the page without covering the page title. Band height is the painted table
height (measured), then `y = (792 - height) / 2`. Colour is the table `fillColor` only
— do not add a pdfmake `background` canvas (it overdraws page 3). Category titles
are underlined. Signature lines are cell bottom borders only (no text underline).

Do not put per-zone rates in v2 either.
