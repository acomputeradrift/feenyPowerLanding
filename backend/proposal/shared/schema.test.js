import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  SCHEMA_VERSION,
  REPEAT_GROUP_MAX,
  steps,
  findQuestion,
  getQuestions,
  isVisible
} from './schema.js';
import { validate } from './validate.js';
import { syncRepeatGroups } from './repeatGroups.js';

const fixture = JSON.parse(
  readFileSync(new URL('../calc/fixtures/legacy-golden-master.json', import.meta.url), 'utf8')
);

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

function answersFromFixture() {
  const answers = {};
  for (const [title, value] of Object.entries(fixture.formData)) {
    const id = LEGACY_TITLE_TO_ID[title];
    if (!id) throw new Error(`Unmapped legacy form title: ${title}`);
    answers[id] = value;
  }
  // Legacy mock used a US date string; the new schema is an HTML date input.
  answers.projectTimeline = '2025-12-12';
  return syncRepeatGroups(steps, answers);
}

describe('FR-2 FR-3 schema catalogue', () => {
  it('has ten steps matching the existing form pages', () => {
    assert.equal(steps.length, 10);
    assert.deepEqual(steps.map((step) => step.id), [
      'projectDetails',
      'siteDetails',
      'lightingShading',
      'audioVideo',
      'climate',
      'security',
      'poolAndPumps',
      'inputOutput',
      'controllers',
      'finalSubmit'
    ]);
  });

  it('exports a schema version identifier', () => {
    assert.equal(typeof SCHEMA_VERSION, 'string');
    assert.ok(SCHEMA_VERSION.length > 0);
  });

  it('uses camelCase ids, not Google Form titles, as keys', () => {
    const ids = getQuestions(steps).map((question) => question.id);
    assert.ok(ids.includes('audioDiscreteSourceZones'));
    assert.equal(ids.includes('Discrete Audio Sources'), false);
    assert.equal(ids.includes('audioSources'), false);
  });

  it('FR-10 preserves quoted help text verbatim', () => {
    assert.equal(
      findQuestion('contractorEmail').help,
      'Please enter a valid email below and a proposal will be emailed to you.'
    );
    assert.equal(
      findQuestion('rooms').help,
      'Include all interior rooms that have some sort of control. Usually audio zones or lighting zones are the determining factor for inclusion. Exterior areas are entered later.'
    );
    assert.equal(
      findQuestion('additionalInfo').help,
      'Please include any additional information that will help me put together a budget for your project.'
    );
  });

  it('attaches repeat groups to the named-detail counts only', () => {
    const repeats = getQuestions(steps).filter((question) => question.kind === 'repeat');
    assert.deepEqual(
      repeats.map((question) => [question.id, question.repeatFor]),
      [
        ['roomDetails', 'rooms'],
        ['audioSourceDetails', 'audioDiscreteSourceZones'],
        ['videoSourceDetails', 'videoDiscreteSourceZones'],
        ['displayDetails', 'displayDiscreteZones'],
        ['avReceiverDetails', 'avReceiverDiscreteZones'],
        ['cameraDetails', 'cameraZones']
      ]
    );
    for (const question of repeats) {
      assert.equal(question.max, REPEAT_GROUP_MAX);
    }
  });

  it('places room name fields immediately after the rooms count', () => {
    const ids = steps.find((step) => step.id === 'siteDetails').questions.map((question) => question.id);
    assert.deepEqual(ids.slice(0, 2), ['rooms', 'roomDetails']);
  });
});

describe('FR-4 conditional visibility', () => {
  it('hides floorplan add-on when there are no global controllers', () => {
    const question = findQuestion('floorplanAddOnCount');
    assert.equal(isVisible(question, { globalControllerCount: 0 }), false);
    assert.equal(isVisible(question, { globalControllerCount: 2 }), true);
  });
});

describe('FR-6 repeat group resize', () => {
  it('truncates from the end and preserves surviving instances', () => {
    const started = syncRepeatGroups(steps, {
      rooms: 5,
      roomDetails: [
        { name: 'Kitchen' },
        { name: 'Lounge' },
        { name: 'Office' },
        { name: 'Gym' },
        { name: 'Theatre' }
      ]
    });
    const reduced = syncRepeatGroups(steps, { ...started, rooms: 3 });
    assert.deepEqual(reduced.roomDetails, [
      { name: 'Kitchen' },
      { name: 'Lounge' },
      { name: 'Office' }
    ]);
  });

  it('appends labelled name fields when the count grows', () => {
    const started = syncRepeatGroups(steps, {
      rooms: 1,
      roomDetails: [{ name: 'Kitchen' }]
    });
    const grown = syncRepeatGroups(steps, { ...started, rooms: 3 });
    assert.deepEqual(grown.roomDetails, [
      { name: 'Kitchen' },
      { name: 'Room 2' },
      { name: 'Room 3' }
    ]);
  });

  it('renders no instances when the count is zero', () => {
    const result = syncRepeatGroups(steps, { rooms: 0, roomDetails: [{ name: 'Kitchen' }] });
    assert.deepEqual(result.roomDetails, []);
  });
});

describe('FR-8 validation', () => {
  it('accepts the golden-master answers with optional names left blank', () => {
    const errors = validate(steps, answersFromFixture());
    assert.deepEqual(errors, {});
  });

  it('requires visible fields and a structurally valid email', () => {
    const errors = validate(steps, {
      contractorName: '',
      contractorEmail: 'not-an-email',
      projectPoName: 'LAKE HOUSE',
      projectAddress: '123 Main St',
      rooms: 0,
      floors: 1,
      exteriorZones: 0,
      lightingZones: 0,
      shadingZones: 0,
      keypadZones: 0,
      audioZones: 0,
      audioDiscreteSourceZones: 0,
      audioClonedSourceZones: 0,
      videoZones: 0,
      videoDiscreteSourceZones: 0,
      videoClonedSourceZones: 0,
      avReceiverDiscreteZones: 0,
      avReceiverClonedZones: 0,
      displayDiscreteZones: 0,
      displayClonedZones: 0,
      thermostatZones: 0,
      heaterZones: 0,
      fanZones: 0,
      alarmZones: 0,
      accessZones: 0,
      cameraZones: 0,
      poolZones: 0,
      pumpZones: 0,
      inputSenseZones: 0,
      outputRelayZones: 0,
      globalControllerCount: 0,
      roomControllerCount: 0
    });
    assert.equal(errors.contractorName, 'Contractor Name is required');
    assert.equal(errors.contractorEmail, 'A valid email address is required');
  });

  it('FR-7 rejects non-integer and negative counts', () => {
    const base = answersFromFixture();
    assert.equal(validate(steps, { ...base, lightingZones: 1.5 }).lightingZones, 'Lighting Zones must be a whole number');
    assert.equal(validate(steps, { ...base, lightingZones: -1 }).lightingZones, 'Lighting Zones must be at least 0');
  });

  it('skips hidden questions rather than validating them', () => {
    const answers = { ...answersFromFixture(), globalControllerCount: 0 };
    delete answers.floorplanAddOnCount;
    const errors = validate(steps, answers);
    assert.equal(errors.floorplanAddOnCount, undefined);
  });

  it('rejects a floorplan add-on count above the global controller count', () => {
    const answers = { ...answersFromFixture(), globalControllerCount: 2, floorplanAddOnCount: 3 };
    assert.equal(
      validate(steps, answers).floorplanAddOnCount,
      'Floorplan add-ons cannot exceed the number of global controllers'
    );
  });

  it('rejects unknown keys instead of ignoring them', () => {
    const errors = validate(steps, { ...answersFromFixture(), extraField: 1 });
    assert.equal(errors.extraField, 'Unknown field');
  });

  it('does not require names inside repeat groups', () => {
    const answers = answersFromFixture();
    assert.equal(answers.audioSourceDetails.length, 1);
    assert.equal(answers.audioSourceDetails[0].name, 'Audio Source 1');
    answers.audioSourceDetails = [{}];
    assert.equal(validate(steps, answers)['audioSourceDetails[0].name'], undefined);
  });

  it('reports repeat-field errors with indexed paths', () => {
    const answers = answersFromFixture();
    answers.audioSourceDetails = [{ type: 'Not A Type' }];
    assert.equal(
      validate(steps, answers)['audioSourceDetails[0].type'],
      'Type must be one of: Streamer, Tuner, Turntable, Other'
    );
  });
});
