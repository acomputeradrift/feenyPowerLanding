import assert from 'node:assert/strict';
import express from 'express';
import { describe, it, before, after } from 'node:test';

import proposalRoutes, { createProposalRouter, MAX_SUBMIT_BYTES } from './proposal.js';
import { validAnswers } from '../proposal/fixtures/validAnswers.js';

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

describe('POST /api/proposal', () => {
  let server;
  let baseUrl;
  const docs = new Map();

  before(async () => {
    const app = express();
    app.use(express.json({ limit: '100kb' }));
    app.use('/api/proposal', createProposalRouter({
      now: () => new Date('2026-08-17T18:00:00.000Z'),
      makeReference: () => 'RTI-20260817-K3M9QP',
      ipHashSalt: 'test-salt',
      async saveSubmission(doc) {
        docs.set(doc.reference, { ...doc });
        return docs.get(doc.reference);
      },
      async updateDelivery(reference, fields) {
        const existing = docs.get(reference);
        docs.set(reference, { ...existing, ...fields });
      },
      async generatePdf() {
        return Buffer.from('pdf');
      },
      async sendEmail() {
        return { delivered: false, method: 'outbox' };
      }
    }));
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

  it('returns 201 with reference and does not leak rates', async () => {
    docs.clear();
    const response = await fetch(`${baseUrl}/api/proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: validAnswers({ lightingZones: 10 }), honeypot: '' })
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.reference, 'RTI-20260817-K3M9QP');
    assert.equal(body.emailedTo, 'john@example.com');
    assert.equal(body.delivery, 'pending');
    assert.equal(body.lineItems, undefined);
    assert.equal(JSON.stringify(body).includes('minutesPerUnit'), false);
    assert.equal(docs.get('RTI-20260817-K3M9QP').emailStatus, 'pending');
  });

  it('returns 400 for unknown keys', async () => {
    const response = await fetch(`${baseUrl}/api/proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: validAnswers({ extraField: 1 }) })
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error, 'validation_failed');
    assert.equal(body.fieldErrors.extraField, 'Unknown field');
  });

  it('discards honeypot posts with a plausible 201', async () => {
    docs.clear();
    const response = await fetch(`${baseUrl}/api/proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: validAnswers(), honeypot: 'bot' })
    });
    assert.equal(response.status, 201);
    assert.equal(docs.size, 0);
  });

  it('caps oversized payloads', async () => {
    assert.equal(MAX_SUBMIT_BYTES, 100 * 1024);
    const response = await fetch(`${baseUrl}/api/proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: validAnswers(),
        honeypot: 'x'.repeat(MAX_SUBMIT_BYTES)
      })
    });
    assert.equal(response.status, 413);
  });
});
