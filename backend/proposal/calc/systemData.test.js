import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateHoursData } from './hoursData.js';
import { rates } from './rates.js';
import {
  calculateSystemData,
  classifyGlobalControllers,
  splitByType,
  splitUniformCount
} from './systemData.js';

function minutes(answers, id) {
  const result = calculateHoursData(calculateSystemData(answers), rates);
  return result.lineItems.find((line) => line.id === id).minutes;
}

describe('device and controller classification', () => {
  it('splits typed items with the first of each type discrete', () => {
    assert.deepEqual(
      splitByType([{ type: 'Streamer' }, { type: 'Streamer' }, { type: 'Turntable' }]),
      { discrete: 2, cloned: 1, custom: 0 }
    );
    assert.deepEqual(
      splitByType([{ type: 'Custom' }, { type: 'Custom' }, { type: 'Streamer' }]),
      { discrete: 1, cloned: 0, custom: 2 }
    );
    assert.deepEqual(splitUniformCount(3), { discrete: 1, cloned: 2 });
    assert.deepEqual(splitUniformCount(0), { discrete: 0, cloned: 0 });
  });

  it('derives source splits from types and keeps every display discrete', () => {
    const data = calculateSystemData({
      audioDiscreteSourceZones: 3,
      audioSourceDetails: [
        { type: 'Streamer' },
        { type: 'Streamer' },
        { type: 'Turntable' }
      ],
      videoDiscreteSourceZones: 2,
      videoSourceDetails: [
        { type: 'Media Player' },
        { type: 'Media Player' }
      ],
      displayDiscreteZones: 2,
      displayDetails: [{ type: 'TV' }, { type: 'TV' }]
    });
    assert.equal(data.audioDiscreteSourceZones, 2);
    assert.equal(data.audioClonedSourceZones, 1);
    assert.equal(data.videoDiscreteSourceZones, 1);
    assert.equal(data.videoClonedSourceZones, 1);
    assert.equal(data.displayDiscreteZones, 2);
    assert.equal(data.displayClonedZones, 0);
    assert.equal(data.totalDiscreteDeviceZones, 2 + 1 + 2);
  });

  it('never treats Custom as a cloned type', () => {
    const data = calculateSystemData({
      audioDiscreteSourceZones: 2,
      audioSourceDetails: [{ type: 'Custom' }, { type: 'Custom' }]
    });
    assert.equal(data.audioDiscreteSourceZones, 0);
    assert.equal(data.audioClonedSourceZones, 0);
    assert.equal(data.audioCustomSourceZones, 2);
    assert.equal(data.totalCustomDeviceZones, 2);
  });

  it('bills two different video source types above one type plus a clone', () => {
    const mixed = {
      rooms: 1,
      globalControllerCount: 1,
      globalControllerDetails: [{ type: 'Phone' }],
      videoDiscreteSourceZones: 2,
      videoSourceDetails: [{ type: 'Box' }, { type: 'Blu-ray Player' }]
    };
    const twoBoxes = {
      ...mixed,
      videoSourceDetails: [{ type: 'Box' }, { type: 'Box' }]
    };
    assert.equal(calculateSystemData(mixed).videoDiscreteSourceZones, 2);
    assert.ok(minutes(mixed, 'totalDiscreteDeviceZones') > minutes(twoBoxes, 'totalDiscreteDeviceZones'));
    assert.equal(minutes(twoBoxes, 'totalClonedDeviceZones') > 0, true);
  });

  it('treats AV receivers and lifts as one type: first discrete, rest cloned', () => {
    const data = calculateSystemData({
      avReceiverDiscreteZones: 3,
      motorizedLiftZones: 2
    });
    assert.equal(data.avReceiverDiscreteZones, 1);
    assert.equal(data.avReceiverClonedZones, 2);
    assert.equal(data.motorizedLiftDiscreteZones, 1);
    assert.equal(data.motorizedLiftClonedZones, 1);
  });

  it('keeps legacy discrete and cloned counts when cloned fields are present', () => {
    const data = calculateSystemData({
      audioDiscreteSourceZones: 1,
      audioClonedSourceZones: 3,
      audioSourceDetails: [{ type: 'Streamer' }],
      avReceiverDiscreteZones: 1,
      avReceiverClonedZones: 1,
      displayDiscreteZones: 1,
      displayClonedZones: 2
    });
    assert.equal(data.audioDiscreteSourceZones, 1);
    assert.equal(data.audioClonedSourceZones, 3);
    assert.equal(data.avReceiverDiscreteZones, 1);
    assert.equal(data.avReceiverClonedZones, 1);
    assert.equal(data.displayDiscreteZones, 3);
    assert.equal(data.displayClonedZones, 0);
  });

  it('maps legacy global answers and clones only a repeated resolution', () => {
    assert.deepEqual(
      classifyGlobalControllers([{ type: 'iPhone' }, { type: 'iPad' }], 2),
      { firstDiscreteGlobal: 1, additionalDiscreteGlobals: 1, clonedGlobals: 0 }
    );
    assert.deepEqual(
      classifyGlobalControllers([{ type: 'Phone' }, { type: 'Phone' }, { type: 'Tablet' }], 3),
      { firstDiscreteGlobal: 1, additionalDiscreteGlobals: 1, clonedGlobals: 1 }
    );
    const twoPhones = {
      lightingZones: 10,
      globalControllerCount: 2,
      globalControllerDetails: [{ type: 'Phone' }, { type: 'Phone' }]
    };
    const phoneAndTablet = {
      lightingZones: 10,
      globalControllerCount: 2,
      globalControllerDetails: [{ type: 'Phone' }, { type: 'Tablet' }]
    };
    assert.equal(calculateSystemData(twoPhones).clonedGlobals, 1);
    assert.equal(calculateSystemData(phoneAndTablet).additionalDiscreteGlobals, 1);
    assert.ok(minutes(phoneAndTablet, 'lightingZones') > minutes(twoPhones, 'lightingZones'));
  });

  it('does not double-count devices inside a project-zone rollup', () => {
    const data = calculateSystemData({
      rooms: 1,
      displayDiscreteZones: 1,
      displayDetails: [{ type: 'TV' }],
      avReceiverDiscreteZones: 1,
      audioDiscreteSourceZones: 1,
      audioSourceDetails: [{ type: 'Streamer' }]
    });
    assert.equal(data.totalDeviceZones, 3);
    assert.equal(Object.hasOwn(data, 'totalProjectZones'), false);
  });
});
