import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { estimateHours } from './estimate.js';
import { calculateSystemData } from './calc/systemData.js';
import { calculateHoursData } from './calc/hoursData.js';
import { rates } from './calc/rates.js';

const fixture = JSON.parse(
  readFileSync(new URL('./calc/fixtures/legacy-golden-master.json', import.meta.url), 'utf8')
);

const LEGACY_TITLE_TO_ID = {
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
  'Single Room Controllers': 'roomControllerCount'
};

function countAnswersFromFixture() {
  const answers = {};
  for (const [title, id] of Object.entries(LEGACY_TITLE_TO_ID)) {
    answers[id] = fixture.formData[title];
  }
  return answers;
}

describe('FR-9 ADR-005 live estimate', () => {
  it('matches golden-master section totals and project total', () => {
    const result = estimateHours(countAnswersFromFixture());
    const expected = calculateHoursData(calculateSystemData(countAnswersFromFixture()), rates);
    assert.deepEqual(result.sectionHours, expected.sectionHours);
    assert.equal(result.totalProjectHours, fixture.hoursData.totalProjectHours);
    assert.equal(result.totalProjectHours, 62.3);
  });

  it('treats missing fields as zero and accepts partial answers', () => {
    const result = estimateHours({ lightingZones: 10, audioZones: 8 });
    assert.equal(result.sectionHours.lightingShading, 4.4);
    assert.equal(result.sectionHours.audioVideo, 3.6);
    assert.equal(result.sectionHours.climate, 0);
    assert.equal(result.sectionHours.controllers, 0);
    assert.equal(result.totalProjectHours, 8);
  });

  it('treats unparseable values as zero rather than erroring', () => {
    const result = estimateHours({ lightingZones: 'twelve', shadingZones: '', keypadZones: null });
    assert.equal(result.sectionHours.lightingShading, 0);
    assert.equal(result.totalProjectHours, 0);
  });

  it('never returns line items, rates, or anything a caller could divide to recover minutes', () => {
    const result = estimateHours({ lightingZones: 10 });
    const serialized = JSON.stringify(result);
    assert.equal(Object.hasOwn(result, 'lineItems'), false);
    assert.equal(serialized.includes('minutesPerUnit'), false);
    assert.equal(serialized.includes('26.4'), false);
    assert.equal(serialized.includes('rawHours'), false);
    assert.deepEqual(Object.keys(result).sort(), ['sectionHours', 'totalProjectHours']);
  });
});
