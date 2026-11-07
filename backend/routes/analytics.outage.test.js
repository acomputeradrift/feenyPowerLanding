import assert from 'node:assert/strict';
import express from 'express';
import { after, before, describe, it } from 'node:test';

import { DataUnavailableError } from '../analytics/db.js';
import { fetchLeads } from '../analytics/leads.js';
import { FALLBACK } from '../analytics/pages.js';
import { buildSummary } from '../analytics/summary.js';
import { createAnalyticsRouter } from './analytics.js';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15';
const pagesInfo = { ...FALLBACK, pages: FALLBACK.pages.map((p) => ({ ...p, path: `/${p.location}/${p.brand}` })) };

function bufferingModel() {
  // Mimics Mongoose with no connection: the query rejects after a buffering timeout.
  return {
    find() {
      return {
        sort() {
          return {
            lean: () => new Promise((_, reject) => setTimeout(() => reject(new Error('Operation `homeownerinquiries.find()` buffering timed out after 10000ms')), 5))
          };
        }
      };
    }
  };
}

describe('analytics during a MongoDB outage', () => {
  let server;
  let baseUrl;
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);

  before(async () => {
    process.on('unhandledRejection', onUnhandled);
    const app = express();
    app.use(express.json());
    app.use('/api/analytics', createAnalyticsRouter({
      getToken: () => 'tok',
      loadPages: async () => pagesInfo,
      visitorFor: async () => { throw new DataUnavailableError(); },
      saveEvent: async () => { throw new Error('should not be reached'); },
      buildSummary: (opts) => buildSummary({
        ...opts,
        deps: {
          pagesInfo,
          fetchEvents: async () => { throw new DataUnavailableError(); },
          fetchLeads: (s, e, f) => fetchLeads(s, e, f, { Model: bufferingModel(), isDbReady: () => true })
        }
      }),
      allowHit: () => true
    }));
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    process.off('unhandledRejection', onUnhandled);
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  it('fetchLeads fails fast when the DB is not connected', async () => {
    await assert.rejects(
      fetchLeads(new Date(0), new Date(), {}, { Model: bufferingModel(), isDbReady: () => false }),
      DataUnavailableError
    );
  });

  it('fetchLeads surfaces a buffering timeout as a normal rejection', async () => {
    await assert.rejects(
      fetchLeads(new Date(0), new Date(), {}, { Model: bufferingModel(), isDbReady: () => true }),
      /buffering timed out/
    );
  });

  it('summary returns 503 JSON instead of crashing', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/summary?range=28`, { headers: { 'x-analytics-token': 'tok' } });
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: 'data_unavailable' });
  });

  it('event ingest still answers 204 and only logs', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'User-Agent': UA },
      body: JSON.stringify({ n: 'pageview', sid: 'abcdef0123456789', loc: 'vancouver', brand: 'lutron' })
    });
    assert.equal(res.status, 204);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(unhandled.length, 0);
  });
});
