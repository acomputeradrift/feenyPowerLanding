# RTI Proposal - Effort Model (Overhead, Programming, Graphics)

Status: **locked 2026-10-07, updated 2026-10-08** (tiered per-room overhead;
displays are always discrete). Implemented as `RATE_CARD_VERSION` `2026.3`.
The 2026.2 calculator remains in `backend/proposal/calc/legacy/`.

## Model

Project hours are split three ways:

1. **Overhead** - file setup, shared macros, home page, navigation and shared
   pages. A fixed amount per project, plus the first room, plus each
   additional room at half the first, plus per room controller.
2. **Programming** - tags, macros, variables and events. Scales by zone count.
   A tag is programmed once on the first controller; each additional discrete
   controller only needs the existing tags assigned to its buttons.
3. **Graphics** - pages and buttons. Paid per controller resolution.

## Controllers

Controllers are priced by unique resolution, not by device count.

- **First Discrete Global Controller** - the first resolution. Full programming
  and graphics.
- **Additional Discrete Global Controllers** - each further resolution.
  Programming at 20% of the first (tag assignment), graphics at 90%.
- **Discrete Room Controllers** - priced on the zones in their own room only.
  Room controllers in different rooms are always discrete.
- **Cloned Controllers** (global or room) - another device at a resolution that
  is already built, or (rarely) a second identical room controller in the same
  room. A few clicks to create: **0 minutes**, but listed on the proposal.
- **No global controller:** the first discrete room controller is priced as the
  First Discrete for programming and carries the fixed and per-room First
  Discrete overhead; its line graphics stay at the room rate.

Global controller types are Phone, Tablet, Large Touchscreen and Small
Touchscreen; each type is one resolution. Room controllers are a single type.

Example: 2 Phones, a Large Touchscreen and a Small Touchscreen are 4
controllers: 1 first discrete, 2 additional discrete, 1 cloned.

## Approved minutes per unit

| Category | First Discrete Global prog | First Discrete Global graphics | Each Additional Discrete Global prog | Each Additional Discrete Global graphics | Each Discrete Room Controller prog | Each Discrete Room Controller graphics | Each Cloned |
|---|---|---|---|---|---|---|---|
| Lighting, per load | 2.26 | 1.80 | 0.45 | 1.62 | 0.45 | 3.6 | 0 |
| Shading, per shade | 2.26 | 1.80 | 0.45 | 1.62 | 0.45 | 3.6 | 0 |
| Keypads, per keypad | 5.43 | 3.60 | 1.09 | 3.24 | 1.09 | 7.2 | 0 |
| Audio zone | 20.9 | 7.5 | 4.17 | 6.75 | 4.17 | 15.0 | 0 |
| Video zone | 17.4 | 7.5 | 3.48 | 6.75 | 3.48 | 15.0 | 0 |
| Discrete device (source, display, receiver, lift) | 17.4 | 15.0 | 3.48 | 13.5 | 3.48 | 30.0 | 0 |
| Cloned device | 8.7 | 7.5 | 1.74 | 6.75 | 1.74 | 15.0 | 0 |
| Custom device | 26.1 | 15.0 | 5.22 | 13.5 | 5.22 | 30.0 | 0 |
| Pool | 13.5 | 24.0 | 2.7 | 21.6 | 2.7 | 48.0 | 0 |
| Camera, per camera | 7.7 | 7.2 | 1.5 | 6.5 | 0 | 0 | 0 |
| Thermostat, per zone | 9.04 | 9.00 | 1.81 | 8.10 | 1.81 | 18.0 | 0 |
| Heater / Fan / Pump, per zone | 1.36 | 1.80 | 0.27 | 1.62 | 0.27 | 3.6 | 0 |
| Timer, per heater, fan or pump | 3.62 | 2.40 | 0.72 | 2.16 | 0.72 | 4.8 | 0 |
| Alarm zone, per zone | 0.90 | 1.20 | 0.18 | 1.08 | 0 | 0 | 0 |
| Alarm panel, once per system with alarm zones | 10.8 | 9.0 | 2.16 | 8.1 | 0 | 0 | 0 |
| Access point, per point | 5.85 | 4.8 | 1.17 | 4.32 | 1.17 | 9.6 | 0 |
| Output (relay), per point | 0.90 | 1.20 | 0.18 | 1.08 | 0.18 | 2.4 | 0 |
| Input (sense), per point | 0.90 | 1.20 | 0.18 | 1.08 | 0.18 | 2.4 | 0 |

Displays (TVs and projectors) are always discrete devices: each one is priced
at the discrete device rate, never as a clone, even when several share a type.
Sources, AV receivers and lifts keep the rule that the first of a type is
discrete and repeats are cloned.

Room controller rates apply per zone in that controller's room. Room remotes
generally do not get cameras or alarm, so cameras, alarm zones and the alarm
panel carry no room controller time.

Pool is priced from item counts like every other line, with no base cost.

Timers attach to heaters, fans and pumps only. The pool has no timer: 2026.2
adds one per pool zone (`poolAndPumpsTimerZones = poolZones + pumpZones`), and
the new model drops it.

### Overhead

| Overhead part | First Discrete prog | First Discrete graphics | Each Additional Discrete Global prog | Each Additional Discrete Global graphics | Each Discrete Room Controller prog | Each Discrete Room Controller graphics | Each Cloned |
|---|---|---|---|---|---|---|---|
| Fixed, once per project | 49 | 24 | 0 | 22 | 0 | 0 | 0 |
| First room | 30 | 30 | 0 | 27 | 0 | 0 | 0 |
| Each additional room | 15 | 15 | 0 | 13.5 | 0 | 0 | 0 |
| Per room controller | 0 | 0 | 0 | 0 | 0 | 36.8 | 0 |

Overhead minutes = 49 + 24 + 22 x A + (30 + 30 + 27 x A)
+ (R - 1) x (15 + 15 + 13.5 x A) + 36.8 x C, where A is the number of
Additional Discrete Global controllers, R is rooms plus exterior zones (at
least 1 when anything is controlled) and C is the number of room controllers.

- **Fixed** covers file creation, processor and network setup, driver installs,
  system variables and the home page template. None of it leaves buttons or
  macro steps in the file, so it was calibrated from a known job: a one-room
  theater (Apple TV, Sonos, receiver, TV) with one room controller is 6 hours.
- **Rooms** means rooms plus exterior zones (a patio is always a room). Only
  rooms that contain something controlled are entered, usually lighting, then
  audio. The same room count drives the room controller share.
- **Per room** covers the room menu, room select, activities, room off and
  navigation. The first room is 60 min on the First Discrete; each
  additional room is 30 min (half), because later rooms reuse the first
  room's pages and macros (Jamie's choice, 2026-10-08; flat 60 per room
  over-priced Deer Park). Fixed + first room is held at about 170 min so the
  theater stays at 6 hours.
- **Per room controller** covers home and navigation pages on that controller.
- With no global controller, the first room controller takes the fixed, first
  room and additional room First Discrete overhead.

Check jobs: small theater with 1 remote 6.0 h (4 discrete devices, no clones);
Deer Park (11 rooms, worked example below) 49.7 h; Deer Park as quoted
2026-10-08 (20 rooms, 11 audio zones, no keypads) 49.5 h.

### Floorplan add-on

Floorplans go on touchscreens and Apple devices only (never room controllers).
Every floorplan tag is created for the floorplan: Sung has 387 tags on its
floorplan pages and 374 are used nowhere else.

| Floorplan part | Items (programming / graphics) | First floorplan controller | Each additional floorplan controller |
|---|---|---|---|
| Each zone shown (lights, shades, climate, alarm, access, pool) | 1 / 3 | 0.45 prog + 1.8 graphics | 0.09 prog + 1.62 graphics |
| Each room (AV source icons, on/off text, zone volume, navigation) | 20 / 22 | 9.0 prog + 13.2 graphics | 1.8 prog + 11.9 graphics |
| Artwork, per floor | - | 120 | 108 |
| Artwork, per room | - | 120 | 108 |

Items measured on Sung (about 237 programming items and 663 elements for about
202 zones shown; about 521 programming items and 572 elements for 26 rooms).
Artwork (plan image, room cut-outs, state images) leaves nothing countable in
the file, so it is Jamie's time: 2 hours per floor and 2 hours per room, on top
of the item minutes. Each additional floorplan controller redoes 90% of the
artwork, like other graphics.

Floorplan rooms use the same room count as overhead (rooms plus exterior
zones).

Check jobs: Deer Park with a floorplan on the iPhone only (1 floor, 11 rooms,
100 lights) about 31.8 h; Sung on the iPhone and KA11 (4 floors, 26 rooms,
about 202 zones shown) about 143 h. Rate card 2026.2 gives about 20 h and 83 h.

### Rounding

Sum exact minutes across all lines, then round only the project total up to
the next whole hour (no per-line rounding).

### Per-item minutes

The approved lighting rate implies **0.45 min per programming item** (2.26 / 5)
and **0.60 min per graphic element** on the First Discrete controller
(1.80 / 3). Categories without good file data are priced by item count:

| Category | Programming items | Graphic elements | Basis |
|---|---|---|---|
| Lighting / Shading load | 5 (slider 3, toggle 2) | 3 (title, slider, toggle) | Jamie |
| Keypad | 12 (6 buttons x 2) | 6 | Jamie |
| Camera | 17 (2 tags, ~15 macro steps) | 12 (own page ~4, plus re-mapped list buttons for a typical ~8-camera job) | Sung, cameras only (excludes cameras on TV, which is an Audio Video source, and access/intercom) |
| Thermostat | 20 (modes, fan, setpoints, text variables, states) | 15 | Jamie; Sung climate checked within ~2 hours |
| Heater / Fan / Pump | 3 (on, off, state) | 3 (title, toggle or two buttons, status) | Jamie: near identical |
| Timer | 8 (start, cancel, countdown, time text, auto-off event, presets) | 4 (time text, start, cancel, adjust) | Jamie: stays a visible line |
| Alarm zone | 2 (status tag, step) | 2 (title, status) | Sung: 32 status tags, 24 steps for 27 DSC zones. Floorplan status icons belong to the floorplan add-on |
| Alarm panel | 24 (arm, disarm, stay, displays, activity) | 15 | Sung: 12 tags, 10 macros, 12 steps; 6 elements per global page, 26 on a T2i keypad. Added automatically when alarm zones > 0 |
| Access point | 13 (open, close, hold, status, select) | 8 | Sung: 4 points, 19 tags, 11 macros, 34 steps; intercom page 19, others 5 |
| Pool | 30 (~15 functions x 2: temps, setpoints, heat, spa mode, pump, status, away) | 40 (one controls page) | Between Sung (~40 / 68) and Verrier (~10 / 30) |

Audio Video lines: programming is the 2026.2 rate less 21% overhead (x 0.79);
graphics is 10 min per controller zone less 25% overhead (7.5), and devices
carry double graphics weight (15) because the controller formula counts each
device twice, which keeps one-room theaters priced correctly. In item terms a
device page is about 25 elements (nav pad, menu, transport, power, inputs,
title) against about 12 for a zone page (volume, mute, source, power, title).
Cloned devices (repeats of a model already built) get 50% graphics, matching
their 50% programming: the page is copied and re-pointed. Displays are never
cloned (see above).

## How the minutes were derived

- **Anchor:** the 2026.2 Audio Video rates, the most-used and most-trusted
  numbers. Programming averages 17.9 min per Audio Video zone; graphics is
  10 min per zone per global controller and 20 per room-zone per room controller.
- **Ratios:** measured from 14 real `.apex` files (read-only), counting
  programming items (macro steps, variables, events) and graphics items
  (buttons, excluding hard keys) per category, divided by zone counts taken from
  driver configs (Lutron IDs, C-Bus groups, AD/AMP zones and so on).
  - Lighting vs Audio Video: 0.16 programming, 0.24 graphics (Sung, Verrier,
    Carlos O'Bryans).
  - Shading: identical to lighting (Jamie's decision; only one file had
    shade programming).
  - Keypads: not present in the files. Taken as 2.4x lighting programming
    (12 items vs 5 per load) and 2x lighting graphics (6 buttons vs 3 elements).
- **Overhead:** 21% of programming and 25% of graphics, measured from the same
  files, carved out of the category minutes. Restructured as fixed + per room +
  per room controller (see Overhead above).
- **Additional resolutions:** programming 20%, graphics 90% (Jamie's estimate).

## Worked example: Deer Park (RTI-20261007-10UQCP)

10 rooms + Patio, 100 lighting loads, 26 keypads, 7 audio zones, iPhone +
touchscreen (2 discrete global), 4 discrete room controllers. Devices: 8
discrete (5 TVs, 1 streamer, 1 media player, 1 receiver) and 7 cloned (1
streamer, 3 media players, 3 receivers).

| Category | First Discrete prog | First Discrete graphics | Additional Discrete prog | Additional Discrete graphics | Room x4 prog | Room x4 graphics | Total min |
|---|---|---|---|---|---|---|---|
| Overhead | 229 | 204 | 0 | 184 | 0 | 147 | 764 |
| Lighting | 226 | 180 | 45 | 162 | 16 | 131 | 760 |
| Keypads | 141 | 94 | 28 | 84 | 10 | 68 | 426 |
| Audio Video | 346 | 225 | 69 | 203 | 25 | 164 | 1,032 |
| **Total** | **943** | **703** | **143** | **633** | **52** | **510** | **2,982** |

Cells are rounded; totals are exact sums. 2,982.1 min = 49.70 hours (50 on the
PDF: Overhead 13, Programming 15, Graphics 22), against 138.4 under rate card
2026.2. 11 rooms (10 rooms plus the Patio). Overhead: fixed 49 + 24 + 22,
first room 30 + 30 + 27, 10 additional rooms x (15 + 15 + 13.5), room
controllers 4 x 36.8. Without lighting or keypads: 1,796.1 min = 29.9 hours
(30 on the PDF).

Deer Park as quoted on 2026-10-08 (18 rooms + 2 exterior zones, 100 lighting
loads, no keypads, 11 audio zones, same devices and controllers): 2,969.3 min
= 49.49 hours (50 on the PDF: Overhead 19, Programming 14, Graphics 17).
Overhead 1,155.7, lighting 694.0, audio video 1,119.6.

## Review notes

- Lighting feels light to Jamie (Deer Park: about 12.7 h for 100 loads, against
  his own 4-day estimate), but he is comfortable with the approach. If lighting
  is revisited, adjust the lighting item counts (5 programming / 3 graphic per
  load) rather than the per-item minutes, because every item-priced category
  uses those minutes.

## Before implementation

Built on 2026-10-08 as rate card 2026.3, following
[10-effort-model-implementation-plan.md](10-effort-model-implementation-plan.md).
Room controllers stayed a single type with no form change.

- Form changes: discrete vs cloned room controllers; room controllers that
  cover several rooms (Sung's T4x covers 4) are currently assumed to cover one.
- Bump `RATE_CARD_VERSION`, replace the parity golden master, and record the
  decision in [02-decisions.md](02-decisions.md).
