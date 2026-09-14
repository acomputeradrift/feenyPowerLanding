import assert from 'node:assert/strict';
import express from 'express';
import { describe, it, before, after } from 'node:test';

import { createSentinelLiteCompareCountRouter } from './sentinelLiteCompareCount.js';

describe('sentinel lite compare-count routes', () => {
  let server;
  let baseUrl;
  let count = 7;

  before(async () => {
    const app = express();
    app.use(
      '/api/sentinel_lite/compare-count',
      createSentinelLiteCompareCountRouter({
        async read() {
          return count;
        },
        async increment() {
          count += 1;
          return count;
        },
        allowHit() {
          return true;
        },
      }),
    );
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('GET returns the current count only', async () => {
    const response = await fetch(`${baseUrl}/api/sentinel_lite/compare-count`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { count: 7 });
  });

  it('POST increments and returns the new count', async () => {
    const response = await fetch(`${baseUrl}/api/sentinel_lite/compare-count`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { count: 8 });
  });

  it('ignores a POST body (count-only — no file metadata)', async () => {
    const response = await fetch(`${baseUrl}/api/sentinel_lite/compare-count`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: 'secret.apex', line: 'should not land' }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { count: 9 });
  });
});
