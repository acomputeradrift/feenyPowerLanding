import assert from 'node:assert/strict';
import express from 'express';
import { after, before, describe, it } from 'node:test';

import { createAnalyticsDashboardHandler, createAnalyticsRouter } from './analytics.js';
import { FALLBACK } from '../analytics/pages.js';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15';

describe('analytics routes', () => {
  let server;
  let baseUrl;
  let token = 'secret-token';
  const saved = [];

  before(async () => {
    const app = express();
    app.use(express.json());
    const getToken = () => token;
    app.use('/api/analytics', createAnalyticsRouter({
      getToken,
      loadPages: async () => ({ ...FALLBACK, pages: FALLBACK.pages.map((p) => ({ ...p, path: `/${p.location}/${p.brand}` })) }),
      saveEvent: async (doc) => { saved.push(doc); },
      visitorFor: async () => 'hash',
      buildSummary: async ({ range }) => ({ ok: true, range }),
      allowHit: () => true
    }));
    app.get('/analytics', createAnalyticsDashboardHandler({ getToken }));
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  it('stores a text/plain beacon pageview with a visitor hash', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'User-Agent': UA },
      body: JSON.stringify({ n: 'pageview', sid: 'abcdef0123456789', loc: 'vancouver', brand: 'rti', sw: 1400 })
    });
    assert.equal(res.status, 204);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(saved.at(-1).visitor, 'hash');
    assert.equal(saved.at(-1).device, 'desktop');
  });

  it('drops events from bots and DNT browsers without saving', async () => {
    const count = saved.length;
    const bot = await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'User-Agent': 'Googlebot/2.1' },
      body: JSON.stringify({ n: 'pageview', sid: 'abcdef0123456789', loc: 'vancouver', brand: 'rti' })
    });
    const dnt = await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'User-Agent': UA, DNT: '1' },
      body: JSON.stringify({ n: 'pageview', sid: 'abcdef0123456789', loc: 'vancouver', brand: 'rti' })
    });
    assert.equal(bot.status, 204);
    assert.equal(dnt.status, 204);
    assert.equal(saved.length, count);
  });

  it('rejects invalid pages', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'User-Agent': UA },
      body: JSON.stringify({ n: 'pageview', sid: 'abcdef0123456789', loc: 'los-gatos', brand: 'vantage' })
    });
    assert.equal(res.status, 400);
  });

  it('hides the dashboard and summary without a token', async () => {
    assert.equal((await fetch(`${baseUrl}/analytics`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/analytics?token=wrong`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/api/analytics/summary`)).status, 404);
  });

  it('sets an HttpOnly cookie from ?token and redirects to the clean URL', async () => {
    const res = await fetch(`${baseUrl}/analytics?token=secret-token&range=7`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/analytics?range=7');
    const cookie = res.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
    const pair = cookie.split(';')[0];
    const summary = await fetch(`${baseUrl}/api/analytics/summary?range=7`, { headers: { Cookie: pair } });
    assert.equal(summary.status, 200);
    assert.deepEqual(await summary.json(), { ok: true, range: '7' });
  });

  it('404s everything when the token env is unset', async () => {
    token = '';
    assert.equal((await fetch(`${baseUrl}/analytics?token=secret-token`)).status, 404);
    token = 'secret-token';
  });
});
