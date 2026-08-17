import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { RATE_CARD_VERSION, rates } from './rates.js';
import { calculateSystemData } from './systemData.js';
import { calculateHoursData } from './hoursData.js';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/legacy-golden-master.json', import.meta.url), 'utf8')
);

// Legacy Google Form titles → schema ids. Table from docs/rti_proposal/03-form-schema.md.
const LEGACY_TITLE_TO_ID = {
  'Contractor Name': 'contractorName',
  'Contractor Email': 'contractorEmail',
  'Project Client Name': 'projectClientName',
  'Project PO Name': 'projectPoName',
  'Project Address': 'projectAddress',
  'Project Timeline': 'projectTimeline',
  'Number of Rooms': 'rooms',
  'Number of Floors': 'floors',
  'Number of Exterior Zones': 'exteriorZones',
  'Lighting Zones': 'lightingZones',
  'Shading Zones': 'shadingZones',
  'Keypad Zones (Lighting or Shading)': 'keypadZones',
  'Distributed Audio Zones': 'audioZones',
  'Discrete Audio Sources': 'audioDiscreteSourceZones',
  'Cloned Audio Sources': 'audioClonedSourceZones',
  'Distributed Video Zones': 'videoZones',
  'Discrete Video Sources': 'videoDiscreteSourceZones',
  'Cloned Video Sources': 'videoClonedSourceZones',
  'Discrete AV Receiver Zones': 'avReceiverDiscreteZones',
  'Cloned AV Receiver Zones': 'avReceiverClonedZones',
  'Discrete Display Zones': 'displayDiscreteZones',
  'Cloned Display Zones': 'displayClonedZones',
  'Thermostat Zones': 'thermostatZones',
  'Heater Zones': 'heaterZones',
  'Fan Zones': 'fanZones',
  'Alarm Zones': 'alarmZones',
  'Access Zones': 'accessZones',
  'Camera Zones': 'cameraZones',
  'Pool Zones': 'poolZones',
  'Pump Zones': 'pumpZones',
  'Input Zones (Sense)': 'inputSenseZones',
  'Output Zones (Relays)': 'outputRelayZones',
  'Discrete Global Controllers': 'globalControllerCount',
  'Floorplan Add On for Global Controllers': 'floorplanAddOnCount',
  'Single Room Controllers': 'roomControllerCount',
  'Additional Info': 'additionalInfo'
};

function answersFromFormData(formData) {
  const answers = {};
  for (const [title, value] of Object.entries(formData)) {
    const id = LEGACY_TITLE_TO_ID[title];
    if (!id) {
      throw new Error(`Unmapped legacy form title: ${title}`);
    }
    answers[id] = value;
  }
  return answers;
}

function byId(lineItems) {
  return Object.fromEntries(lineItems.map((item) => [item.id, item]));
}

function toLegacyHoursData(result) {
  const line = byId(result.lineItems);
  return {
    lightingZoneHours: line.lightingZones.hours,
    shadingZoneHours: line.shadingZones.hours,
    keypadZoneHours: line.keypadZones.hours,
    totalLightingShadingHours: result.sectionHours.lightingShading,
    audioZoneHours: line.audioZones.hours,
    videoZoneHours: line.videoZones.hours,
    deviceZoneHours: line.totalDiscreteDeviceZones.hours + line.totalClonedDeviceZones.hours,
    totalAudioVideoHours: result.sectionHours.audioVideo,
    thermostatZoneHours: line.thermostatZones.hours,
    heaterZoneHours: line.heaterZones.hours,
    fanZoneHours: line.fanZones.hours,
    climateTimerZoneHours: line.climateTimerZones.hours,
    totalClimateHours: result.sectionHours.climate,
    alarmZoneHours: line.alarmZones.hours,
    accessZoneHours: line.accessZones.hours,
    cameraZoneHours: line.cameraZones.hours,
    totalSecurityHours: result.sectionHours.security,
    poolZoneHours: line.poolZones.hours,
    pumpZoneHours: line.pumpZones.hours,
    poolAndPumpsTimerZoneHours: line.poolAndPumpsTimerZones.hours,
    totalPoolAndPumpsHours: result.sectionHours.poolAndPumps,
    outputRelayZoneHours: line.outputRelayZones.hours,
    inputSenseZoneHours: line.inputSenseZones.hours,
    totalInputOutputHours: result.sectionHours.inputOutput,
    globalControllerHours: line.globalController.hours,
    roomControllerHours: line.roomController.hours,
    floorplanAddOnHours: line.floorplanAddOn.hours,
    totalControllerHours: result.sectionHours.controllers,
    totalProjectHours: result.totalProjectHours
  };
}

const answers = answersFromFormData(fixture.formData);

describe('ADR-008 golden-master parity', () => {
  it('maps every fixture form title onto a schema id', () => {
    assert.deepEqual(answersFromFormData(fixture.formData).rooms, 20);
    assert.equal(Object.keys(fixture.formData).length, Object.keys(answers).length);
  });

  it('systemData matches the legacy fixture (derived totals)', () => {
    assert.deepEqual(calculateSystemData(answers), fixture.systemData);
  });

  it('every hours value matches the legacy fixture', () => {
    const result = calculateHoursData(calculateSystemData(answers), rates);
    assert.deepEqual(toLegacyHoursData(result), fixture.hoursData);
  });
});

describe('FR-12 itemised breakdown', () => {
  it('emits count, minutesPerUnit, rawHours and hours per line', () => {
    const result = calculateHoursData(calculateSystemData(answers), rates);
    const lighting = byId(result.lineItems).lightingZones;
    assert.deepEqual(lighting, {
      section: 'lightingShading',
      id: 'lightingZones',
      label: 'Lighting Zones',
      count: 10,
      minutesPerUnit: 26.4,
      rawHours: 4.4,
      hours: 4.4
    });
  });
});

describe('FR-13 section and project totals are sums of line items', () => {
  it('does not compute totals independently of line hours', () => {
    const result = calculateHoursData(calculateSystemData(answers), rates);
    const sum = (section) => result.lineItems
      .filter((line) => line.section === section)
      .reduce((total, line) => total + line.hours, 0);

    assert.equal(result.sectionHours.lightingShading, sum('lightingShading'));
    assert.equal(result.sectionHours.audioVideo, sum('audioVideo'));
    assert.equal(result.sectionHours.climate, sum('climate'));
    assert.equal(result.sectionHours.security, sum('security'));
    assert.equal(result.sectionHours.poolAndPumps, sum('poolAndPumps'));
    assert.equal(result.sectionHours.inputOutput, sum('inputOutput'));
    assert.equal(result.sectionHours.controllers, sum('controllers'));

    const sectionSum = Object.values(result.sectionHours).reduce((total, hours) => total + hours, 0);
    assert.equal(result.totalProjectHours, sectionSum);
  });
});

describe('ADR-004 rates are injected', () => {
  it('hoursData does not import rates.js', async () => {
    const source = await readFile(new URL('./hoursData.js', import.meta.url), 'utf8');
    assert.equal(source.includes('from \'./rates.js\''), false);
    assert.equal(source.includes('from "./rates.js"'), false);
  });

  it('an alternative rate card changes hours (historical recompute)', () => {
    const systemData = calculateSystemData(answers);
    const doubled = { ...rates, lightingZone: rates.lightingZone * 2 };
    const baseline = calculateHoursData(systemData, rates);
    const alternate = calculateHoursData(systemData, doubled);
    const baselineLighting = byId(baseline.lineItems).lightingZones.hours;
    const alternateLighting = byId(alternate.lineItems).lightingZones.hours;
    assert.notEqual(alternateLighting, baselineLighting);
  });
});

describe('unused processor rates', () => {
  it('keeps processor minute values on the rate card but not on any line', () => {
    assert.equal(rates.mainProcessor, 1);
    assert.equal(rates.auxProcessor, 15);
    assert.equal(rates.expansionModule, 5);
    const result = calculateHoursData(calculateSystemData(answers), rates);
    const ids = result.lineItems.map((line) => line.id);
    assert.equal(ids.includes('mainProcessor'), false);
    assert.equal(ids.includes('auxProcessor'), false);
    assert.equal(ids.includes('expansionModule'), false);
  });

  it('exports a rate card version identifier', () => {
    assert.equal(typeof RATE_CARD_VERSION, 'string');
    assert.ok(RATE_CARD_VERSION.length > 0);
  });
});
