import assert from 'node:assert/strict';
import express from 'express';
import { describe, it, before, after } from 'node:test';

import proposalRoutes from './proposal.js';

describe('POST /api/proposal/estimate', () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/proposal', proposalRoutes);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('returns 200 with section totals only', async () => {
    const response = await fetch(`${baseUrl}/api/proposal/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { lightingZones: 10, audioZones: 8 } })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.totalProjectHours, 8);
    assert.equal(body.sectionHours.poolAndPumps, 0);
    assert.equal(body.lineItems, undefined);
    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes('26.4'), false);
    assert.equal(serialized.includes('minutesPerUnit'), false);
  });

  it('does not 400 on incomplete or junk input', async () => {
    const response = await fetch(`${baseUrl}/api/proposal/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { lightingZones: '1' } })
    });
    assert.equal(response.status, 200);
  });
});
