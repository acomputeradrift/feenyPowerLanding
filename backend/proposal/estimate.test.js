import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { estimateHours } from './estimate.js';
import { calculateSystemData } from './calc/systemData.js';
import { calculateHoursData } from './calc/hoursData.js';
import { rates } from './calc/rates.js';

describe('FR-9 ADR-005 live estimate', () => {
  it('matches calculator section totals, the three-way breakdown and the project total', () => {
    const answers = {
      rooms: 2,
      exteriorZones: 1,
      lightingZones: 10,
      globalControllerCount: 1,
      globalControllerDetails: [{ type: 'Phone' }],
      roomControllerCount: 1
    };
    const result = estimateHours(answers);
    const expected = calculateHoursData(calculateSystemData(answers), rates);
    assert.deepEqual(result.sectionHours, expected.sectionHours);
    assert.deepEqual(result.breakdownHours, expected.breakdownHours);
    assert.equal(result.totalProjectHours, expected.totalProjectHours);
    assert.ok(result.totalProjectHours > 0);
  });

  it('treats missing fields as zero and accepts partial answers', () => {
    const result = estimateHours({ lightingZones: 10, audioZones: 8 });
    assert.equal(result.sectionHours.lightingShading, 0);
    assert.equal(result.sectionHours.audioVideo, 0);
    assert.equal(result.sectionHours.climate, 0);
    assert.equal(result.sectionHours.keypads, 0);
    assert.ok(result.sectionHours.overhead > 0);
    assert.equal(result.totalProjectHours, result.sectionHours.overhead);
  });

  it('treats unparseable values as zero rather than erroring', () => {
    const result = estimateHours({ lightingZones: 'twelve', shadingZones: '', keypadZones: null });
    assert.equal(result.sectionHours.lightingShading, 0);
    assert.equal(result.totalProjectHours, 0);
  });

  it('never returns line items, rates, or anything a caller could divide to recover minutes', () => {
    const result = estimateHours({
      lightingZones: 10,
      rooms: 1,
      globalControllerCount: 1,
      globalControllerDetails: [{ type: 'Phone' }]
    });
    const serialized = JSON.stringify(result);
    assert.equal(Object.hasOwn(result, 'lineItems'), false);
    assert.equal(Object.hasOwn(result, 'summaryHours'), false);
    assert.equal(serialized.includes('minutesPerUnit'), false);
    assert.equal(serialized.includes('programmingMinutes'), false);
    assert.equal(serialized.includes('2.26'), false);
    assert.equal(serialized.includes('progFirst'), false);
    assert.deepEqual(Object.keys(result).sort(), ['breakdownHours', 'sectionHours', 'totalProjectHours']);
    assert.deepEqual(Object.keys(result.breakdownHours).sort(), ['graphics', 'overhead', 'programming']);
  });
});
