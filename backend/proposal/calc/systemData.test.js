import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateHoursData } from './hoursData.js';
import { rates } from './rates.js';
import { calculateSystemData, splitByType, splitUniformCount } from './systemData.js';

function lineHours(answers, id) {
  const result = calculateHoursData(calculateSystemData(answers), rates);
  return result.lineItems.find((line) => line.id === id).hours;
}

describe('first-of-type discrete, later same type cloned', () => {
  it('splits typed items with the first of each type discrete', () => {
    assert.deepEqual(
      splitByType([{ type: 'Streamer' }, { type: 'Streamer' }, { type: 'Turntable' }]),
      { discrete: 2, cloned: 1 }
    );
    assert.deepEqual(
      splitByType([{ type: 'Custom' }, { type: 'Custom' }, { type: 'Streamer' }]),
      { discrete: 3, cloned: 0 }
    );
    assert.deepEqual(splitUniformCount(3), { discrete: 1, cloned: 2 });
    assert.deepEqual(splitUniformCount(0), { discrete: 0, cloned: 0 });
  });

  it('derives audio/video/display splits from types on the new form', () => {
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
      displayDetails: [{ type: 'TV' }, { type: 'Projector' }]
    });
    assert.equal(data.audioDiscreteSourceZones, 2);
    assert.equal(data.audioClonedSourceZones, 1);
    assert.equal(data.videoDiscreteSourceZones, 1);
    assert.equal(data.videoClonedSourceZones, 1);
    assert.equal(data.displayDiscreteZones, 2);
    assert.equal(data.displayClonedZones, 0);
  });

  it('never treats Custom as a cloned type', () => {
    const data = calculateSystemData({
      audioDiscreteSourceZones: 2,
      audioSourceDetails: [{ type: 'Custom' }, { type: 'Custom' }]
    });
    assert.equal(data.audioDiscreteSourceZones, 2);
    assert.equal(data.audioClonedSourceZones, 0);
  });

  it('treats AV receivers as one type: first discrete, rest cloned', () => {
    const data = calculateSystemData({ avReceiverDiscreteZones: 3 });
    assert.equal(data.avReceiverDiscreteZones, 1);
    assert.equal(data.avReceiverClonedZones, 2);
    assert.equal(data.totalAvReceiverZones, 3);
  });

  it('keeps legacy discrete and cloned counts when cloned fields are present', () => {
    const data = calculateSystemData({
      audioDiscreteSourceZones: 1,
      audioClonedSourceZones: 3,
      audioSourceDetails: [{ type: 'Streamer' }],
      avReceiverDiscreteZones: 1,
      avReceiverClonedZones: 1
    });
    assert.equal(data.audioDiscreteSourceZones, 1);
    assert.equal(data.audioClonedSourceZones, 3);
    assert.equal(data.avReceiverDiscreteZones, 1);
    assert.equal(data.avReceiverClonedZones, 1);
  });

  it('charges two identical sources at one discrete plus one cloned rate', () => {
    const twoAppleTvs = {
      videoDiscreteSourceZones: 2,
      videoSourceDetails: [{ type: 'Media Player' }, { type: 'Media Player' }]
    };
    const appleTvAndHulu = {
      videoDiscreteSourceZones: 2,
      videoSourceDetails: [{ type: 'Media Player' }, { type: 'Cable or Satellite' }]
    };
    assert.ok(
      lineHours(appleTvAndHulu, 'totalDiscreteDeviceZones')
        > lineHours(twoAppleTvs, 'totalDiscreteDeviceZones')
    );
    assert.equal(lineHours(twoAppleTvs, 'totalClonedDeviceZones') > 0, true);
    assert.equal(lineHours(appleTvAndHulu, 'totalClonedDeviceZones'), 0);
  });

  it('bills only the first global controller of each type', () => {
    const zones = { lightingZones: 10 };
    const twoIpads = {
      ...zones,
      globalControllerCount: 2,
      globalControllerDetails: [{ type: 'iPad' }, { type: 'iPad' }]
    };
    const ipadAndIphone = {
      ...zones,
      globalControllerCount: 2,
      globalControllerDetails: [{ type: 'iPad' }, { type: 'iPhone' }]
    };
    assert.ok(lineHours(ipadAndIphone, 'globalController') > lineHours(twoIpads, 'globalController'));
  });
});
