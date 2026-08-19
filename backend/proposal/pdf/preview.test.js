import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import express from 'express';
import { describe, it, before, after } from 'node:test';

import { handleProposalPdfPreview, isLocalPreviewHost } from './preview.js';

function hostReq(hostname) {
  return { hostname };
}

function requestPreview(port, host) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/rti_proposal/preview.pdf',
      headers: { Host: host }
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks)
      }));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('local PDF preview host gate', () => {
  it('allows loopback hosts and rejects the public site host', () => {
    assert.equal(isLocalPreviewHost(hostReq('localhost')), true);
    assert.equal(isLocalPreviewHost(hostReq('127.0.0.1')), true);
    assert.equal(isLocalPreviewHost(hostReq('::1')), true);
    assert.equal(isLocalPreviewHost(hostReq('www.feenypowerandcontrol.com')), false);
    assert.equal(isLocalPreviewHost(hostReq('feenypowerandcontrol.com')), false);
  });
});

describe('GET /rti_proposal/preview.pdf', () => {
  let server;
  let port;

  before(async () => {
    const app = express();
    app.get('/rti_proposal/preview.pdf', handleProposalPdfPreview);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    port = server.address().port;
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('returns the real PDF inline with no-store on loopback', async () => {
    const response = await requestPreview(port, '127.0.0.1');
    assert.equal(response.status, 200);
    assert.equal(response.headers['content-type'], 'application/pdf');
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.match(response.headers['content-disposition'] || '', /inline/);
    assert.equal(response.body.subarray(0, 5).toString('utf8'), '%PDF-');
    assert.ok(response.body.length > 1000);
  });

  it('returns 404 when the Host is the public site', async () => {
    const response = await requestPreview(port, 'www.feenypowerandcontrol.com');
    assert.equal(response.status, 404);
  });
});

describe('PDF preview is not linked from public pages', () => {
  it('does not appear in the proposal form HTML or renderer', () => {
    const html = readFileSync(new URL('../../../frontend/rti_proposal.html', import.meta.url), 'utf8');
    const renderer = readFileSync(new URL('../../../frontend/scripts/proposal/rti_proposal.js', import.meta.url), 'utf8');
    assert.equal(html.includes('/rti_proposal/preview'), false);
    assert.equal(renderer.includes('/rti_proposal/preview'), false);
  });
});
