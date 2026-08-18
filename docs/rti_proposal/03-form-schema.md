# 03 - Form Schema

Defines the question definition format and catalogues every question.

## Location and sharing

The schema and its validation rules live under `backend/proposal/shared/` and are
**imported by both the server and the browser**. They must therefore be plain ES
modules using no Node built-ins, no `require`, and no filesystem or network access.

`backend/fpc_server.js` serves that directory statically so the browser can import
the same files the server uses:

```javascript
app.use('/scripts/proposal/shared',
    express.static(path.join(__dirname, 'proposal/shared')));
```

This is the mechanism that guarantees client and server cannot disagree about
what a question is or what counts as valid input (FR-8).

Calculation code does **not** live in `shared/`. See
[02-decisions.md](02-decisions.md) ADR-005.

## Answer shape

Answers are a single flat object keyed by question id, with repeat groups stored as
arrays of objects:

```javascript
{
  contractorName: "John Smith",
  contractorEmail: "john@example.com",
  audioDiscreteSourceZones: 2,
  audioSourceDetails: [
    { name: "Sonos Port", type: "Streamer" },
    { name: "Rega Planar", type: "Turntable" }
  ],
  audioZones: 8
}
```

This object is the sole source of truth for the renderer. Inputs write to it on
change, and a section re-renders from it. Nothing is read back out of the DOM.

Question ids are stable camelCase identifiers. They are **not** the human labels.
The legacy system keyed answers by Google Form question title, which meant
rewording a question broke the calculations; ids exist specifically to break that
coupling.

## Structure

```javascript
export const steps = [
  {
    id: "projectDetails",
    title: "Project Details",
    description: "Optional intro text for the step.",
    questions: [ /* ... */ ]
  }
];
```

Steps map one-to-one onto the wizard pages (FR-3).

## Question kinds

Every question has `kind`, `id` and `label`. Other properties depend on the kind.

| kind | Renders as | Extra properties |
|---|---|---|
| `text` | single-line text input | `maxLength` |
| `email` | email input | - |
| `date` | date input | - |
| `paragraph` | textarea | `maxLength` |
| `count` | non-negative integer input | `min` (default 0), `max` |
| `select` | dropdown | `options` |
| `repeat` | repeated group of fields | `repeatFor`, `itemLabel`, `fields`, `max` |

`count` is a distinct kind rather than a generic number, because counts drive
repeat groups and carry the same validation everywhere (FR-7). All legacy count
fields were free-text, which is how `NaN` entered the calculations.

## Shared properties

- **`help`** - help text shown beneath the label. Preserve legacy wording verbatim
  (FR-10).
- **`required`** - whether an answer is mandatory. Only enforced when the question
  is visible.
- **`visibleIf(answers)`** - optional predicate. Returning false means the question
  is not rendered, not validated, and omitted from the payload (FR-4).

## Conditional visibility

```javascript
{
  kind: "count",
  id: "floorplanAddOnCount",
  label: "Floorplan Add On for Global Controllers",
  visibleIf: (answers) => answers.globalControllerCount > 0
}
```

Rules:

- Predicates must be pure functions of `answers` with no side effects.
- Predicates are re-evaluated after every answer change.
- When a question becomes hidden, its value is **retained** in the answers object
  but excluded from validation and from the submitted payload. Retaining it means
  that toggling a condition back and forth does not destroy typed input.
- Do not chain visibility more than one level deep. If a question depends on a
  question that is itself conditional, express the full condition explicitly
  rather than relying on transitive hiding.

## Repeat groups

The feature that motivated the whole project (FR-5).

```javascript
{
  kind: "repeat",
  id: "audioSourceDetails",
  repeatFor: "audioDiscreteSourceZones",
  itemLabel: (index) => `Audio Source ${index + 1}`,
  max: 40,
  fields: [
    { kind: "text", id: "name", label: "Source name", required: false },
    { kind: "select", id: "type", label: "Type", required: true,
      options: ["Streamer", "Tuner", "Turntable", "Custom"] }
  ]
}
```

Rules:

- `repeatFor` names a `count` question in the same step. The group renders exactly
  that many instances. Zero renders nothing at all, including no heading.
- Instances are stored as an array at the group's `id`, index-aligned with the
  count.
- **Reducing the count truncates from the end** and preserves surviving instances
  (FR-6). Going from 5 to 3 discards indices 3 and 4 and leaves 0 through 2
  untouched. Never re-key or reorder on resize.
- `max` caps instances defensively so a mistyped count such as 9999 cannot render
  an unusable page. Enforce on both sides.
- Repeat groups do not nest. If nesting ever seems necessary, revisit the schema
  design rather than extending the renderer.
- Fields within a group support the same kinds as top-level questions, excluding
  `repeat`.

### Which counts get repeat groups

Named detail is collected where a name or type is useful in the proposal, and is
**optional to fill in** - a dealer in a hurry can leave names blank and still
submit. Attach groups to: audio sources, video sources, displays, rooms,
exterior zones, cameras, and global controllers. Each group renders
immediately below its driving count.

Do not attach groups to abstract quantities where a per-item name carries no
meaning, such as relay outputs, sense inputs, timer counts, or AV receivers.

## Validation

`backend/proposal/shared/validate.js` exports a function taking the schema and an
answers object and returning a list of errors keyed by question id, including
repeat-group paths such as `audioSourceDetails[1].name`.

Rules:

- Visible required questions must have a non-empty value.
- `count` values must be integers, at least `min`, and at most `max` where set.
- `email` must be structurally valid. The email address is the delivery mechanism
  for the proposal, so an invalid one means the dealer gets nothing.
- Hidden questions are skipped entirely.
- Unknown keys in a submitted payload are rejected rather than ignored, so a
  schema mismatch surfaces immediately instead of silently dropping answers.

The server runs this same function on submission and does not trust the client
(FR-8, NFR-6).

## Question catalogue

Captured from the published Google Form on 2026-08-17. Help text is quoted exactly
and must be preserved.

Every count question below is `kind: "count"` with `min: 0`, except `rooms` and
`floors` (`min: 1`). Zero rooms or zero floors is invalid. Zero global controllers
is allowed and zero room controllers is allowed, but the two together must be
at least 1.

### Step 1 - Project Details

| id | kind | label | required |
|---|---|---|---|
| `contractorName` | text | Your Name | yes |
| `contractorEmail` | email | Your Email | yes |
| `projectClientName` | text | Project Client Name | no, default `Private Client` |
| `projectPoName` | text | Project PO Name | yes |
| `projectAddress` | text | Project Location | yes, default `Private Location` |
| `projectTimeline` | date | Project Timeline | yes |

Help text:

- Contractor Email - "Please enter a valid email below and a proposal will be
  emailed to you."
- Project PO Name - "Include this for invoicing."
- Project Location - "A city is fine."
- Project Timeline - "Include expected install date."

### Step 2 - Site Details

All required.

- `rooms` - Number of Rooms, **min 1**. "Include all interior rooms that have some sort of
  control. Usually audio zones or lighting zones are the determining factor for
  inclusion. Exterior areas are entered later."

Repeat group: `roomDetails` over `rooms`, item label `Room {n}`, one optional
`name` text field. These name fields render immediately below the rooms count
and default to "Room 1" through "Room N". Real names remain optional.

- `floors` - Number of Floors, **min 1**. "Include this for calculating the cost of a floor
  plan based UI."
- `exteriorZones` - Number of Exterior Zones. "Include all exterior areas that
  have some sort of control. Usually audio zones or lighting zones are the
  determining factor for inclusion. Examples would be front yard, back yard, side
  yard etc."

Repeat group: `exteriorZoneDetails` over `exteriorZones`, item label
`Exterior Zone {n}`, one optional `name` text field. Defaults to
"Exterior Zone 1" through "Exterior Zone N". Renders immediately below the
exterior count.

### Step 3 - Lighting/Shading Control

All required.

- `lightingZones` - Lighting Zones. "Include the number of lighting zones that you
  want to control in RTI."
- `shadingZones` - Shading Zones. "Include the number of shading zones that you
  want to control in RTI."
- `keypadZones` - Keypad Zones (Lighting or Shading). "Include the number of
  lighting or shading keypads that you want to control in RTI."

### Step 4 - Audio/Video Control

All required. The live form does not ask dealers to distinguish discrete from
cloned devices. Count every unit, collect a type on each source and display, and
let `systemData` derive the split used by the calculator: the first of each type
is discrete, later units of the same type are cloned. `Custom` is the exception:
every Custom item is discrete and is never cloned. AV receivers have no type;
the first unit is discrete and the rest are cloned. Cloned devices are still
charged at half the discrete rate. See [04-calculations.md](04-calculations.md).

- `audioZones` - Distributed Audio Zones
- `audioDiscreteSourceZones` - Audio Sources. "Include any streamers,
  turntables or other audio only sources (distributed and local)."
- `videoZones` - Distributed Video Zones
- `videoDiscreteSourceZones` - Video Sources. "Include any media players,
  cable/sat boxes or other video sources (distributed and local)."
- `avReceiverDiscreteZones` - AV Receiver Zones. "Include theatres,
  cinemas and other rooms with a surround sound receiver."
- `displayDiscreteZones` - Display Zones. "Include any TVs or projectors
  to be controlled."

Repeat groups, each immediately below its count. New name fields default
to the item label (`Audio Source 1`, `Video Source 1`, `Display 1`). Source type
`Other` is `Custom`.

- `audioSourceDetails` over `audioDiscreteSourceZones` - name (optional), type
  (required: Streamer / Tuner / Turntable / Custom)
- `videoSourceDetails` over `videoDiscreteSourceZones` - name (optional), type
  (required: Media Player / Cable or Satellite / Games Console / Custom)
- `displayDetails` over `displayDiscreteZones` - name (optional), type (required:
  TV / Projector)

AV receivers have a count only — no name or type fields. There are no cloned
count questions on the live form. The `*Cloned*` ids remain on the calculator
output and on legacy answers for golden-master parity.

### Step 5 - Climate Control

All required.

- `thermostatZones` - Thermostat Zones. "Include the number of thermostats."
- `heaterZones` - Heater Zones. "Include outdoor heaters, garage heaters or
  fireplaces. These are usually controlled with a timer as well."
- `fanZones` - Fan Zones. "Include bathroom fans, exercise room fans, circulating
  fans etc. These are usually controlled with a timer as well."

### Step 6 - Security Control

All required.

- `alarmZones` - Alarm Zones. "Include this if we are integrating with an alarm
  system in RTI."
- `accessZones` - Access Zones. "Include gates, garage doors or other controlled
  doors."
- `cameraZones` - Camera Zones

Repeat group: `cameraDetails` over `cameraZones`, optional `name` and `location`.
New camera names default to `Camera 1`, `Camera 2`, and so on.

### Step 7 - Pool and Pump Control

All required.

- `poolZones` - Pool Zones. "Include pools, hot tubs and saunas."
- `pumpZones` - Pump Zones. "Include any other pumps, water features etc that will
  be controlled."

### Step 8 - Input and Output Zones

All required. No repeat groups.

- `inputSenseZones` - Input Zones (Sense). "Include this for any sense inputs.
  Examples could be gate closure contacts, pressure sensors etc."
- `outputRelayZones` - Output Zones (Relays). "Include this for any misc. relay
  controlled devices."

### Step 9 - Controllers

- `globalControllerCount` - Global Controllers, required. "iPhone, iPad,
  Touchscreens (controls all rooms, all sources)"

Repeat group: `globalControllerDetails` over `globalControllerCount`, immediately
below the count. Type select is required: iPhone / iPad / Touchscreen.

- `floorplanAddOnCount` - Floorplan Add On for Global Controllers, optional.
  "Include this for each Global Controller (iPad, Touchscreens) that you would
  like a floorplan interface."
- `roomControllerCount` - Single Room Controllers, required. "Handheld Remotes,
  Touchscreens (controls single room, local sources)"

Either controller count may be 0, but not both. `floorplanAddOnCount` is
logically bounded by `globalControllerCount`. Add
`visibleIf: (a) => a.globalControllerCount > 0` and validate that it does not
exceed the global controller count.

### Step 10 - Final Submit

- `additionalInfo` - paragraph, optional. "Please include any additional
  information that will help me put together a budget for your project."

## Legacy id mapping

The calculators consume camelCase ids. Legacy Google Form titles map as follows;
this table exists so the golden-master fixture can be built from the legacy mock
data. See [04-calculations.md](04-calculations.md). The live form no longer uses
the Discrete/Cloned labels, but the ids and this mapping stay for parity.

| Legacy form title | Schema id |
|---|---|
| Contractor Name | `contractorName` |
| Contractor Email | `contractorEmail` |
| Project Client Name | `projectClientName` |
| Project PO Name | `projectPoName` |
| Project Address | `projectAddress` |
| Project Timeline | `projectTimeline` |
| Number of Rooms | `rooms` |
| Number of Floors | `floors` |
| Number of Exterior Zones | `exteriorZones` |
| Lighting Zones | `lightingZones` |
| Shading Zones | `shadingZones` |
| Keypad Zones (Lighting or Shading) | `keypadZones` |
| Distributed Audio Zones | `audioZones` |
| Discrete Audio Sources | `audioDiscreteSourceZones` |
| Cloned Audio Sources | `audioClonedSourceZones` |
| Distributed Video Zones | `videoZones` |
| Discrete Video Sources | `videoDiscreteSourceZones` |
| Cloned Video Sources | `videoClonedSourceZones` |
| Discrete AV Receiver Zones | `avReceiverDiscreteZones` |
| Cloned AV Receiver Zones | `avReceiverClonedZones` |
| Discrete Display Zones | `displayDiscreteZones` |
| Cloned Display Zones | `displayClonedZones` |
| Thermostat Zones | `thermostatZones` |
| Heater Zones | `heaterZones` |
| Fan Zones | `fanZones` |
| Alarm Zones | `alarmZones` |
| Access Zones | `accessZones` |
| Camera Zones | `cameraZones` |
| Pool Zones | `poolZones` |
| Pump Zones | `pumpZones` |
| Input Zones (Sense) | `inputSenseZones` |
| Output Zones (Relays) | `outputRelayZones` |
| Discrete Global Controllers | `globalControllerCount` |
| Floorplan Add On for Global Controllers | `floorplanAddOnCount` |
| Single Room Controllers | `roomControllerCount` |
| Additional Info | `additionalInfo` |
