# 04 - Calculations

The hour estimate is the commercially valuable output of this system. This document
is the authoritative specification of how it is produced.

Read the parity contract at the end before changing anything here.

## Structure

Three modules under `backend/proposal/calc/`:

- **`rates.js`** - every minute-per-unit value and a version identifier. No logic.
- **`systemData.js`** - derives zone rollups and equipment counts from answers.
- **`hoursData.js`** - applies rates to derived zones, producing line items.

Rates are **passed as an argument** to `hoursData`, never imported by it (ADR-004).
This allows historical submissions to be recomputed under their original rates and
alternative rate cards to be unit tested.

All three are pure functions. No database, network, filesystem or clock access
(NFR-9). None of them is ever served to the browser (ADR-005).

## Rate card

Minutes per unit. These are the values currently in production and must be
reproduced exactly.

| Rate key | Minutes | Applies to |
|---|---|---|
| `lightingZone` | 26.4 | each lighting zone |
| `shadingZone` | 22 | each shading zone |
| `keypadZone` | 26.4 | each keypad zone |
| `audioZone` | 26.4 | each distributed audio zone |
| `videoZone` | 22 | each distributed video zone |
| `deviceDiscreteZone` | 22 | each discrete device zone |
| `deviceClonedZone` | 11 | each cloned device zone |
| `thermostatZone` | 22 | each thermostat |
| `heaterZone` | 13.2 | each heater |
| `fanZone` | 13.2 | each fan |
| `alarmZone` | 13.2 | each alarm zone |
| `accessZone` | 17.6 | each access zone |
| `cameraZone` | 26.4 | each camera |
| `poolZone` | 60 | each pool, hot tub or sauna |
| `pumpZone` | 13.2 | each pump |
| `timerZone` | 13.2 | each timer zone, climate and pool alike |
| `outputRelayZone` | 17.6 | each relay output |
| `inputSenseZone` | 17.6 | each sense input |
| `globalController` | 10 | per total project zone, per global controller |
| `roomController` | 20 | see the controllers formula |
| `floorplanAddOn` | 7 | see the controllers formula |

Cloned devices are charged at exactly half the discrete rate. That relationship is
intentional and is the reason the schema separates discrete from cloned counts.

### Unused rates

The legacy code also defines `mainProcessor` (1), `auxProcessor` (15) and
`expansionModule` (5). Processor hours are computed but **commented out of the
total**. Carry these values forward for completeness, clearly marked as not
currently contributing to any total. Do not silently start including them; that is
a pricing change.

### Changing a rate

Edit the value in `rates.js`, bump `RATE_CARD_VERSION`, and write a commit message
explaining the business reason. Git history is the audit log (ADR-004). Existing
submissions are unaffected because each stores its own snapshot.

## Derived system data

Computed from answers before any rate is applied.

### Simple rollups

```
climateTimerZones        = heaterZones + fanZones
poolAndPumpsTimerZones   = poolZones + pumpZones
totalAudioSourceZones    = audioDiscreteSourceZones + audioClonedSourceZones
totalVideoSourceZones    = videoDiscreteSourceZones + videoClonedSourceZones
totalAvReceiverZones     = avReceiverDiscreteZones + avReceiverClonedZones
totalDisplayZones        = displayDiscreteZones + displayClonedZones
totalProjectRooms        = rooms + exteriorZones
```

### Device zones

Device zones aggregate sources, displays and receivers. This is the only place
those counts are charged; they are **not** billed again individually.

```
totalDiscreteDeviceZones = displayDiscreteZones
                         + avReceiverDiscreteZones
                         + audioDiscreteSourceZones
                         + videoDiscreteSourceZones

totalClonedDeviceZones   = displayClonedZones
                         + avReceiverClonedZones
                         + audioClonedSourceZones
                         + videoClonedSourceZones

totalDeviceZones         = totalDiscreteDeviceZones + totalClonedDeviceZones
```

### Total project zones

Drives controller hours and processor counts.

```
totalProjectZones = sum of:
    lightingZones, shadingZones, keypadZones,
    audioZones, videoZones, totalDeviceZones,
    thermostatZones, heaterZones, fanZones, climateTimerZones,
    alarmZones, accessZones, cameraZones,
    poolZones, pumpZones, poolAndPumpsTimerZones,
    outputRelayZones, inputSenseZones
```

Two properties of this sum are surprising enough to state explicitly.

**Timer zones are double counted.** `climateTimerZones` is `heaterZones +
fanZones`, and heaters and fans also appear individually in the list. The same
applies to pools and pumps. A project with 1 heater and 2 fans contributes 3 for
the individual counts plus 3 more for the timer rollup, totalling 6. This inflates
`totalProjectZones`, which in turn inflates controller hours and processor counts.
This is preserved for parity, but it is a candidate for a deliberate business
decision later.

**The zero filter is decorative.** The legacy implementation filters out values
greater than zero before summing. Since zero contributes nothing to a sum and
validation forbids negatives, the filter cannot affect the result. Do not treat it
as load-bearing logic.

Note also that distributed audio and video **zones** are counted here, while audio
and video **sources** reach the total only through `totalDeviceZones`. An earlier
version of the legacy code included source counts both ways, double counting them;
that was fixed in commit `df0afbc` of the legacy repository. The corrected
behaviour is what the golden fixture must capture.

### Processor counts

Computed but not currently charged.

```
raw                  = (totalProjectZones + totalProjectRooms) / 100
mainProcessorCount   = (totalProjectZones + totalProjectRooms) > 350 ? 2 : 1
auxProcessorCount    = max(ceil(raw) - 1, 0)
expansionModuleCount = ceil(raw)
```

## Hours

### The rounding rule

Every line item is rounded the same way:

```
hours = ceil((count * minutesPerUnit) / 60 * 10) / 10
```

That is: convert to hours, then **round up to one decimal place**.

Rounding is applied **per line, before summing**. Section totals are sums of
already-rounded lines, and the project total is the sum of section totals. This
means totals sit slightly above the raw arithmetic. That is existing production
behaviour and is preserved deliberately, but it is the single most likely thing to
be "corrected" by accident during the port. Do not.

### Line items

Every charge is emitted as an explicit line (FR-12):

```javascript
{
  section: "lightingShading",
  id: "lightingZones",
  label: "Lighting Zones",
  count: 10,
  minutesPerUnit: 26.4,
  rawHours: 4.4,
  hours: 4.4
}
```

`rawHours` is the value before rounding, retained so the audit view can show the
effect of rounding. Section and project totals are computed by summing `hours`
across lines (FR-13), never independently.

### Sections

**Lighting/Shading** - lines for `lightingZones`, `shadingZones`, `keypadZones` at
their respective rates.

**Audio/Video** - lines for:

- `audioZones` at `audioZone`
- `videoZones` at `videoZone`
- `totalDiscreteDeviceZones` at `deviceDiscreteZone`
- `totalClonedDeviceZones` at `deviceClonedZone`

**Climate** - `thermostatZones`, `heaterZones`, `fanZones` at their rates, plus
`climateTimerZones` at `timerZone`.

**Security** - `alarmZones`, `accessZones`, `cameraZones`.

**Pool/Pumps** - `poolZones`, `pumpZones`, plus `poolAndPumpsTimerZones` at
`timerZone`.

**Inputs/Outputs** - `outputRelayZones`, `inputSenseZones`.

**Controllers** - three lines that do not follow the simple count-times-rate
pattern:

```
globalControllerHours = ceil(
    (totalProjectZones * globalController * globalControllerCount) / 60 * 10
) / 10

floorplanAddOnHours = ceil(
    ((totalProjectZones + totalProjectRooms + floors)
     * floorplanAddOn * floorplanAddOnCount) / 60 * 10
) / 10

roomControllerHours = ceil(
    (totalProjectZones / safeRooms) * roomController * roomControllerCount / 60 * 10
) / 10
```

where `safeRooms = rooms > 0 ? rooms : 1`, guarding against division by zero.

Controller effort scales with overall project size rather than with a unit count,
because a global controller must present every zone in the project. For these
lines, record the driving quantity in `count` and note the formula in the label so
the audit view remains meaningful.

### Project total

```
totalProjectHours = totalLightingShadingHours
                  + totalAudioVideoHours
                  + totalClimateHours
                  + totalSecurityHours
                  + totalPoolAndPumpsHours
                  + totalInputOutputHours
                  + totalControllerHours
```

Processor hours are excluded.

### Numeric guards

The legacy code coerces several values defensively before use:
`totalProjectZones`, `totalDiscreteDeviceZones` and `totalClonedDeviceZones` are
each passed through `Number(x) || 0`, and `rooms` through the `safeRooms` guard
above. These guards exist because the legacy form accepted free text. Validation
now prevents non-numeric input, but keep the guards: they cost nothing and they are
part of the behaviour being reproduced.

## Presentation rounding

The proposal document rounds again for display, using `ceil` to a whole number:

- Each section heading shows `ceil(sectionTotal)` hours.
- The total line shows `ceil(totalProjectHours)`.
- A section with zero hours shows no hours at all, so the heading stays clean.
- One hour renders as "1 hr", anything else as "N hrs".

**Known inconsistency.** Because sections and the total are each independently
rounded up, the displayed section figures can sum to more than the displayed total.
Sections of 4.4 and 3.3 display as 5 and 4, summing to 9, while the total of 7.7
displays as 8. A dealer who adds up the sections will not reach the printed total.

This is existing production behaviour. Preserve it for parity, then decide
separately whether to fix it - the honest fix is to display one decimal place
rather than whole hours.

## Parity contract

**The ported calculators must produce output identical to the legacy Apps Script
system.** This is the acceptance criterion for the port, and it is verified by
test, not by inspection.

Procedure (ADR-008):

1. In the legacy repository, stub `global.Logger` with a no-op `log` method. The
   calculators are otherwise pure.
2. Load `calculateSystemData.js`, `calculateTotalDeviceZones.js`,
   `calculateTotalProjectRooms.js`, `calculateProcessorCounts.js` and
   `calculateHoursData.js`.
3. Run them against the mock answer set embedded in `testOnFormSubmit()` in
   `onFormSubmit.js`, which covers every field with non-zero values.
4. Serialise the resulting `systemData` and `hoursData` and commit them as a JSON
   fixture in this repository.
5. Test the ported modules against that fixture, asserting deep equality of the
   derived totals and of every hours value.

Once parity is proven:

- Any change to a rate or formula requires a deliberate fixture update in the same
  commit, with the business reason in the message.
- The preserved oddities - per-line rounding, timer double counting, the
  section-versus-total display mismatch, excluded processor hours - are **not**
  defects to fix during the port. Each is a separate business decision.

Do not proceed to build the form UI until parity tests pass. A form that collects
answers beautifully and prices them differently than yesterday is worse than no
form at all.
