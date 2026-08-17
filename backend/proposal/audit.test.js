import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it, before, after } from 'node:test';
import express from 'express';

import {
  tokensEqual,
  presentedAuditToken,
  renderAuditHtml,
  createAuditHandler
} from './audit.js';

const TOKEN = 'audit-secret-token';

function sampleSubmission(overrides = {}) {
  return {
    reference: 'RTI-20260817-K3M9QP',
    submittedAt: new Date('2026-08-17T18:00:00.000Z'),
    rateCardVersion: '2026.1',
    schemaVersion: '2026.1',
    lineItems: [
      {
        section: 'lightingShading',
        id: 'lightingZones',
        label: 'Lighting Zones',
        count: 10,
        minutesPerUnit: 26.4,
        rawHours: 4.4,
        hours: 4.4
      },
      {
        section: 'lightingShading',
        id: 'keypadZones',
        label: 'Keypad Zones',
        count: 1,
        minutesPerUnit: 26.4,
        rawHours: 0.44,
        hours: 0.5
      },
      {
        section: 'audioVideo',
        id: 'audioZones',
        label: 'Distributed Audio Zones',
        count: 8,
        minutesPerUnit: 26.4,
        rawHours: 3.52,
        hours: 3.6
      }
    ],
    sectionHours: {
      lightingShading: 4.9,
      audioVideo: 3.6
    },
    totalProjectHours: 8.5,
    ...overrides
  };
}

function appWithAudit(deps) {
  const app = express();
  app.get('/rti_proposal/audit/:reference', createAuditHandler(deps));
  return app;
}

async function listen(app) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

describe('FR-21 audit token compare', () => {
  it('matches equal tokens and rejects different values without throwing on length mismatch', () => {
    assert.equal(tokensEqual('secret-token', 'secret-token'), true);
    assert.equal(tokensEqual('secret-token', 'secret-tokem'), false);
    assert.equal(tokensEqual('short', 'much-longer-secret'), false);
    assert.equal(tokensEqual(undefined, 'secret'), false);
    assert.equal(tokensEqual('secret', ''), false);
  });

  it('reads the token from the query parameter or the header', () => {
    assert.equal(
      presentedAuditToken({ query: { token: 'from-query' }, get: () => undefined }),
      'from-query'
    );
    assert.equal(
      presentedAuditToken({
        query: { token: 'from-query' },
        get: (name) => (name.toLowerCase() === 'x-proposal-audit-token' ? 'from-header' : undefined)
      }),
      'from-header'
    );
  });
});

describe('FR-20 audit HTML', () => {
  it('groups line items by section and shows count, rate, rawHours, hours, subtotals and total', () => {
    const html = renderAuditHtml(sampleSubmission());

    assert.match(html, /Lighting\/Shading/);
    assert.match(html, /Audio\/Video/);
    assert.match(html, /data-line-id="lightingZones"/);
    assert.match(html, /data-line-id="keypadZones"/);
    assert.match(html, /data-field="count">10</);
    assert.match(html, /data-field="minutesPerUnit">26\.4</);
    assert.match(html, /data-field="rawHours">0\.44</);
    assert.match(html, /data-field="hours">0\.5</);
    assert.match(html, /data-section="lightingShading"/);
    assert.match(html, /data-field="sectionHours">4\.9</);
    assert.match(html, /data-field="totalProjectHours">8\.5</);
    assert.match(html, /2026\.1/);
    assert.match(html, /2026-08-17T18:00:00.000Z/);
    assert.match(html, /RTI-20260817-K3M9QP/);
    assert.match(html, /name="robots" content="noindex"/);
  });

  it('escapes values that would otherwise inject markup', () => {
    const html = renderAuditHtml(sampleSubmission({
      reference: 'RTI-<script>alert(1)</script>',
      lineItems: [{
        section: 'lightingShading',
        id: 'lightingZones',
        label: '</td><script>alert(1)</script>',
        count: 1,
        minutesPerUnit: 26.4,
        rawHours: 0.44,
        hours: 0.5
      }]
    }));
    assert.equal(html.includes('<script>'), false);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  });
});

describe('GET /rti_proposal/audit/:reference', () => {
  const docs = new Map();
  let server;
  let baseUrl;

  before(async () => {
    docs.set('RTI-20260817-K3M9QP', sampleSubmission());
    const started = await listen(appWithAudit({
      getAuditToken: () => TOKEN,
      async findByReference(reference) {
        return docs.get(reference) || null;
      }
    }));
    server = started.server;
    baseUrl = started.baseUrl;
  });

  after(async () => {
    await closeServer(server);
  });

  it('returns 200 HTML with rates when the token is supplied as a query parameter', async () => {
    const response = await fetch(
      `${baseUrl}/rti_proposal/audit/RTI-20260817-K3M9QP?token=${TOKEN}`
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const html = await response.text();
    assert.match(html, /26\.4/);
    assert.match(html, /minutes per unit/i);
    assert.match(html, /0\.44/);
  });

  it('returns 200 when the token is supplied as a header', async () => {
    const response = await fetch(`${baseUrl}/rti_proposal/audit/RTI-20260817-K3M9QP`, {
      headers: { 'X-Proposal-Audit-Token': TOKEN }
    });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Lighting Zones/);
  });

  it('returns 404, not 403, on a bad token', async () => {
    const response = await fetch(
      `${baseUrl}/rti_proposal/audit/RTI-20260817-K3M9QP?token=wrong-token`
    );
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.text();
    assert.equal(body.includes('26.4'), false);
    assert.equal(body.includes('minutesPerUnit'), false);
  });

  it('returns 404 when the token is missing', async () => {
    const response = await fetch(`${baseUrl}/rti_proposal/audit/RTI-20260817-K3M9QP`);
    assert.equal(response.status, 404);
  });

  it('returns 404 for an unknown reference even with a valid token', async () => {
    const response = await fetch(
      `${baseUrl}/rti_proposal/audit/RTI-20990101-XXXXXX?token=${TOKEN}`
    );
    assert.equal(response.status, 404);
  });
});

describe('GET /rti_proposal/audit/:reference when the secret is unset', () => {
  let server;
  let baseUrl;

  before(async () => {
    const started = await listen(appWithAudit({
      getAuditToken: () => undefined,
      async findByReference() {
        return sampleSubmission();
      }
    }));
    server = started.server;
    baseUrl = started.baseUrl;
  });

  after(async () => {
    await closeServer(server);
  });

  it('is disabled entirely and never treats unset as open', async () => {
    const withGuess = await fetch(
      `${baseUrl}/rti_proposal/audit/RTI-20260817-K3M9QP?token=anything`
    );
    const withoutToken = await fetch(
      `${baseUrl}/rti_proposal/audit/RTI-20260817-K3M9QP`
    );
    assert.equal(withGuess.status, 404);
    assert.equal(withoutToken.status, 404);
    assert.equal(withGuess.headers.get('x-robots-tag'), 'noindex');
    const html = await withGuess.text();
    assert.equal(html.includes('26.4'), false);
  });
});

describe('GET /rti_proposal/audit/:reference when the secret is empty', () => {
  let server;
  let baseUrl;

  before(async () => {
    const started = await listen(appWithAudit({
      getAuditToken: () => '',
      async findByReference() {
        return sampleSubmission();
      }
    }));
    server = started.server;
    baseUrl = started.baseUrl;
  });

  after(async () => {
    await closeServer(server);
  });

  it('treats an empty environment token as unset', async () => {
    const response = await fetch(`${baseUrl}/rti_proposal/audit/RTI-20260817-K3M9QP?token=`);
    assert.equal(response.status, 404);
  });
});

describe('audit view is not linked from public pages', () => {
  it('does not appear in the proposal form HTML or renderer', () => {
    const html = readFileSync(new URL('../../frontend/rti_proposal.html', import.meta.url), 'utf8');
    const renderer = readFileSync(new URL('../../frontend/scripts/proposal/rti_proposal.js', import.meta.url), 'utf8');
    assert.equal(html.includes('/rti_proposal/audit'), false);
    assert.equal(renderer.includes('/rti_proposal/audit'), false);
  });
});
