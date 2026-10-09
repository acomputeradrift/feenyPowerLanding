import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateHoursData, summaryHoursFromBreakdown } from './hoursData.js';
import { rates } from './rates.js';
import { calculateSystemData, classifyGlobalControllers } from './systemData.js';

function minutesOf(answers) {
  const result = calculateHoursData(calculateSystemData(answers), rates);
  const minutes = result.lineItems.reduce((sum, line) => sum + line.minutes, 0);
  return { ...result, minutes };
}

function near(actual, expected, label) {
  assert.ok(
    Math.abs(actual - expected) <= 1,
    `${label}: ${actual} is not within 1 of ${expected}`
  );
}

function deerPark(overrides = {}) {
  return {
    rooms: 10,
    floors: 1,
    exteriorZones: 1,
    lightingZones: 100,
    keypadZones: 26,
    shadingZones: 0,
    audioZones: 7,
    videoZones: 0,
    audioDiscreteSourceZones: 2,
    audioSourceDetails: [{ type: 'Streamer' }, { type: 'Streamer' }],
    videoDiscreteSourceZones: 4,
    videoSourceDetails: [
      { type: 'Media Player' },
      { type: 'Media Player' },
      { type: 'Media Player' },
      { type: 'Media Player' }
    ],
    avReceiverDiscreteZones: 4,
    displayDiscreteZones: 5,
    displayDetails: [
      { type: 'TV' },
      { type: 'TV' },
      { type: 'TV' },
      { type: 'TV' },
      { type: 'TV' }
    ],
    globalControllerCount: 2,
    globalControllerDetails: [{ type: 'Phone' }, { type: 'Large Touchscreen' }],
    floorplanAddOnCount: 0,
    roomControllerCount: 4,
    ...overrides
  };
}

function smallTheater() {
  return {
    rooms: 1,
    floors: 1,
    exteriorZones: 0,
    audioDiscreteSourceZones: 1,
    audioSourceDetails: [{ type: 'Streamer' }],
    videoDiscreteSourceZones: 1,
    videoSourceDetails: [{ type: 'Media Player' }],
    avReceiverDiscreteZones: 1,
    displayDiscreteZones: 1,
    displayDetails: [{ type: 'TV' }],
    globalControllerCount: 0,
    roomControllerCount: 1
  };
}

describe('rate card 2026.3 golden cases', () => {
  it('prices the small theater at 359.4 minutes, billed 6', () => {
    const result = minutesOf(smallTheater());
    near(result.minutes, 359.4, 'small theater minutes');
    assert.equal(result.summaryHours.total, 6);
    const data = calculateSystemData(smallTheater());
    assert.equal(data.totalDiscreteDeviceZones, 4);
    assert.equal(data.totalClonedDeviceZones, 0);
    assert.equal(data.firstDiscreteGlobal, 0);
  });

  it('prices Deer Park at 2982.1 minutes with PDF lines 13 / 15 / 22', () => {
    const result = minutesOf(deerPark());
    near(result.minutes, 2982.1, 'deer park minutes');
    assert.equal(result.summaryHours.total, 50);
    assert.deepEqual(
      [result.summaryHours.overhead, result.summaryHours.programming, result.summaryHours.graphics],
      [13, 15, 22]
    );
    near(result.sectionHours.overhead * 60, 764.2, 'overhead');
    near(result.sectionHours.lightingShading * 60, 760.3, 'lighting');
    near(result.sectionHours.keypads * 60, 425.7, 'keypads');
    near(result.sectionHours.audioVideo * 60, 1031.8, 'audio video');
    const data = calculateSystemData(deerPark());
    assert.equal(data.totalDiscreteDeviceZones, 8);
    assert.equal(data.totalClonedDeviceZones, 7);
    assert.equal(data.overheadRooms, 11);
  });

  it('matches Deer Park from legacy iPhone and Touchscreen answers', () => {
    const modern = minutesOf(deerPark());
    const legacy = minutesOf(deerPark({
      globalControllerDetails: [{ type: 'iPhone' }, { type: 'Touchscreen' }]
    }));
    assert.equal(legacy.minutes, modern.minutes);
  });

  it('prices Deer Park without lighting or keypads at 1796.1 minutes', () => {
    const result = minutesOf(deerPark({ lightingZones: 0, keypadZones: 0 }));
    near(result.minutes, 1796.1, 'deer park without lighting');
    assert.equal(result.summaryHours.total, 30);
  });

  it('adds 1909 floorplan minutes for one Deer Park floorplan controller', () => {
    const base = minutesOf(deerPark());
    const withPlan = minutesOf(deerPark({ floorplanAddOnCount: 1 }));
    near(withPlan.minutes - base.minutes, 1909, 'floorplan add-on');
    near(withPlan.sectionHours.floorplan * 60, 1909, 'floorplan section');
  });

  it('prices Deer Park as quoted at 2969.3 minutes with PDF lines 19 / 14 / 17', () => {
    const result = minutesOf(deerPark({
      rooms: 18,
      exteriorZones: 2,
      keypadZones: 0,
      audioZones: 11
    }));
    near(result.minutes, 2969.3, 'quoted deer park');
    assert.equal(result.summaryHours.total, 50);
    assert.deepEqual(
      [result.summaryHours.overhead, result.summaryHours.programming, result.summaryHours.graphics],
      [19, 14, 17]
    );
    near(result.sectionHours.overhead * 60, 1155.7, 'quoted overhead');
    near(result.sectionHours.lightingShading * 60, 694.0, 'quoted lighting');
    near(result.sectionHours.audioVideo * 60, 1119.6, 'quoted audio video');
  });
});

describe('rate card 2026.3 rules', () => {
  it('charges nothing for a cloned controller', () => {
    const onePhone = {
      rooms: 1,
      lightingZones: 10,
      globalControllerCount: 1,
      globalControllerDetails: [{ type: 'Phone' }]
    };
    const twoPhones = {
      rooms: 1,
      lightingZones: 10,
      globalControllerCount: 2,
      globalControllerDetails: [{ type: 'Phone' }, { type: 'Phone' }]
    };
    assert.equal(minutesOf(twoPhones).minutes, minutesOf(onePhone).minutes);
    assert.equal(calculateSystemData(twoPhones).clonedGlobals, 1);
  });

  it('treats a repeated source model as a clone and a different model as discrete', () => {
    const repeated = {
      rooms: 1,
      globalControllerCount: 1,
      globalControllerDetails: [{ type: 'Phone' }],
      videoDiscreteSourceZones: 2,
      videoSourceDetails: [{ type: 'Media Player' }, { type: 'Media Player' }]
    };
    const different = {
      ...repeated,
      videoSourceDetails: [{ type: 'Media Player' }, { type: 'Cable' }]
    };
    assert.equal(calculateSystemData(repeated).videoClonedSourceZones, 1);
    assert.equal(calculateSystemData(different).videoDiscreteSourceZones, 2);
    assert.equal(calculateSystemData(different).videoClonedSourceZones, 0);
    assert.ok(minutesOf(different).minutes > minutesOf(repeated).minutes);
  });

  it('prices every display as discrete', () => {
    const data = calculateSystemData({
      displayDiscreteZones: 3,
      displayDetails: [{ type: 'TV' }, { type: 'TV' }, { type: 'Projector' }]
    });
    assert.equal(data.displayDiscreteZones, 3);
    assert.equal(data.displayClonedZones, 0);
    assert.equal(data.totalDiscreteDeviceZones, 3);
  });

  it('promotes the first room controller when there is no global controller', () => {
    const data = calculateSystemData({
      rooms: 2,
      roomControllerCount: 2,
      lightingZones: 2
    });
    assert.equal(data.firstDiscreteGlobal, 0);
    const result = minutesOf({
      rooms: 2,
      roomControllerCount: 2,
      lightingZones: 2
    });
    const lighting = result.lineItems.find((line) => line.id === 'lightingZones');
    assert.ok(lighting.programmingMinutes > 2.26);
    assert.ok(lighting.graphicsMinutes > 0);
    const overhead = result.lineItems.find((line) => line.id === 'overhead');
    assert.ok(Math.abs(overhead.programmingMinutes - (49 + 30 + 15)) < 1e-9);
  });

  it('gives cameras and alarm no room-controller time', () => {
    const base = {
      rooms: 1,
      globalControllerCount: 1,
      globalControllerDetails: [{ type: 'Phone' }],
      cameraZones: 2,
      alarmZones: 3
    };
    const alone = minutesOf(base);
    const withRooms = minutesOf({ ...base, roomControllerCount: 4, rooms: 4 });
    for (const id of ['cameraZones', 'alarmZones', 'alarmPanel']) {
      const left = alone.lineItems.find((line) => line.id === id);
      const right = withRooms.lineItems.find((line) => line.id === id);
      assert.equal(right.minutes, left.minutes, id);
    }
  });

  it('adds timers for heaters, fans and pumps, and not for the pool', () => {
    const data = calculateSystemData({
      heaterZones: 1,
      fanZones: 2,
      pumpZones: 3,
      poolZones: 4
    });
    assert.equal(data.timerZones, 6);
    assert.equal(Object.hasOwn(data, 'poolAndPumpsTimerZones'), false);
  });

  it('adds the alarm panel once when alarm zones are present', () => {
    assert.equal(calculateSystemData({ alarmZones: 0 }).alarmPanel, 0);
    assert.equal(calculateSystemData({ alarmZones: 4 }).alarmPanel, 1);
    const panel = minutesOf({
      rooms: 1,
      globalControllerCount: 1,
      globalControllerDetails: [{ type: 'Phone' }],
      alarmZones: 4
    }).lineItems.find((line) => line.id === 'alarmPanel');
    assert.equal(panel.count, 1);
    assert.ok(panel.minutes > 0);
  });

  it('counts exterior zones as rooms for overhead', () => {
    const interior = minutesOf({
      rooms: 2,
      exteriorZones: 0,
      globalControllerCount: 1,
      globalControllerDetails: [{ type: 'Phone' }]
    });
    const withPatio = minutesOf({
      rooms: 1,
      exteriorZones: 1,
      globalControllerCount: 1,
      globalControllerDetails: [{ type: 'Phone' }]
    });
    assert.equal(withPatio.minutes, interior.minutes);
    assert.equal(calculateSystemData({ rooms: 10, exteriorZones: 1 }).overheadRooms, 11);
  });

  it('charges the first room full overhead and each later room half', () => {
    const oneGlobal = {
      globalControllerCount: 1,
      globalControllerDetails: [{ type: 'Phone' }]
    };
    const one = minutesOf({ rooms: 1, ...oneGlobal })
      .lineItems.find((line) => line.id === 'overhead');
    const two = minutesOf({ rooms: 2, ...oneGlobal })
      .lineItems.find((line) => line.id === 'overhead');
    assert.ok(Math.abs((two.minutes - one.minutes) - 30) < 1e-6);

    const twoGlobals = {
      globalControllerCount: 2,
      globalControllerDetails: [{ type: 'Phone' }, { type: 'Tablet' }]
    };
    const first = minutesOf({ rooms: 1, ...twoGlobals })
      .lineItems.find((line) => line.id === 'overhead');
    const second = minutesOf({ rooms: 2, ...twoGlobals })
      .lineItems.find((line) => line.id === 'overhead');
    assert.ok(Math.abs((second.minutes - first.minutes) - (15 + 15 + 13.5)) < 1e-6);
  });

  it('does not round individual lines before the project total', () => {
    const result = minutesOf({
      rooms: 1,
      globalControllerCount: 1,
      globalControllerDetails: [{ type: 'Tablet' }],
      lightingZones: 1
    });
    const lighting = result.lineItems.find((line) => line.id === 'lightingZones');
    assert.equal(lighting.hours, lighting.minutes / 60);
    assert.notEqual(lighting.minutes, Math.round(lighting.minutes));
    const summed = result.lineItems.reduce((sum, line) => sum + line.minutes, 0);
    assert.equal(result.totalProjectHours, summed / 60);
  });

  it('keeps legacy Touchscreen units discrete from each other', () => {
    assert.deepEqual(
      classifyGlobalControllers(
        [{ type: 'Touchscreen' }, { type: 'Touchscreen' }],
        2
      ),
      { firstDiscreteGlobal: 1, additionalDiscreteGlobals: 1, clonedGlobals: 0 }
    );
    assert.deepEqual(
      classifyGlobalControllers([{ type: 'Phone' }, { type: 'Phone' }], 2),
      { firstDiscreteGlobal: 1, additionalDiscreteGlobals: 0, clonedGlobals: 1 }
    );
  });
});

describe('billed hour split', () => {
  it('uses largest remainder so the three lines add up to the billed total', () => {
    const split = summaryHoursFromBreakdown({
      overhead: 12.737,
      programming: 15.133,
      graphics: 21.833
    });
    assert.equal(split.overhead + split.programming + split.graphics, split.total);
    assert.deepEqual([split.overhead, split.programming, split.graphics, split.total], [13, 15, 22, 50]);
  });
});
