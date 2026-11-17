import assert from 'node:assert/strict';
import express from 'express';
import { describe, it, before, after, beforeEach } from 'node:test';

import { createDealerInquiryRouter } from './dealerInquiry.js';
import { buildDealerInquiryEmail } from '../dealerInquiry/email.js';
import { validateDealerInquiry } from '../dealerInquiry/validate.js';

const valid = {
  name: '  Sam Integrator ',
  company: 'Example AV',
  email: 'sam@example.com',
  phone: '',
  platforms: ['rti', 'lutron', 'rti'],
  need: 'stuck',
  details: 'XP-8 job, commissioning next week, scenes not firing.',
  sessionId: 'abc123',
  website: ''
};

describe('dealer inquiry validation', () => {
  it('trims, de-duplicates and keeps only known fields', () => {
    const r = validateDealerInquiry({ ...valid, extra: 'x' });
    assert.equal(r.ok, true);
    assert.equal(r.value.name, 'Sam Integrator');
    assert.deepEqual(r.value.platforms, ['rti', 'lutron']);
    assert.equal(r.value.extra, undefined);
  });
  it('requires name, email, a platform, a need and details', () => {
    assert.equal(validateDealerInquiry({ ...valid, name: '' }).field, 'name');
    assert.equal(validateDealerInquiry({ ...valid, email: 'nope' }).field, 'email');
    assert.equal(validateDealerInquiry({ ...valid, platforms: [] }).field, 'platforms');
    assert.equal(validateDealerInquiry({ ...valid, platforms: ['crestron'] }).field, 'platforms');
    assert.equal(validateDealerInquiry({ ...valid, need: 'x' }).field, 'need');
    assert.equal(validateDealerInquiry({ ...valid, details: ' ' }).field, 'details');
  });
  it('company and phone are optional', () => {
    assert.equal(validateDealerInquiry({ ...valid, company: undefined, phone: undefined }).ok, true);
  });
});

describe('dealer inquiry route', () => {
  let server; let baseUrl; let saved; let emailed; let allowed; let owner = false;
  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/dealer-inquiry', createDealerInquiryRouter({
      allowHit: () => allowed,
      isOwner: () => owner,
      async save(value) { saved.push(value); return { ...value, createdAt: new Date() }; },
      async sendEmail(inquiry) { emailed.push(inquiry); return { delivered: false }; },
      async markEmail() {}
    }));
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/dealer-inquiry`;
  });
  after(() => server.close());
  beforeEach(() => { saved = []; emailed = []; allowed = true; owner = false; });

  const post = (body) => fetch(baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  it('saves and emails a valid lead', async () => {
    const res = await post(valid);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(saved.length, 1);
    assert.equal(emailed.length, 1);
    assert.equal(saved[0].test, undefined);
  });
  it('returns the field for a bad request', async () => {
    const res = await post({ ...valid, need: '' });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).field, 'need');
  });
  it('quietly drops honeypot bots and rate-limits', async () => {
    assert.equal((await post({ ...valid, website: 'spam.example' })).status, 200);
    assert.equal(saved.length, 0);
    allowed = false;
    assert.equal((await post(valid)).status, 429);
  });
  it('marks leads from Jamie’s own devices as test', async () => {
    owner = true;
    await post(valid);
    assert.equal(saved[0].test, true);
  });
});

describe('dealer inquiry email', () => {
  it('names the need, company and platforms, and escapes HTML', () => {
    const { subject, text, html } = buildDealerInquiryEmail({ ...validateDealerInquiry(valid).value, details: '<b>hi</b>', createdAt: new Date('2026-11-17T18:00:00Z') });
    assert.match(subject, /New dealer lead — Help with a stuck job — Sam Integrator, Example AV/);
    assert.match(text, /Platforms: RTI, Lutron/);
    assert.ok(html.includes('&lt;b&gt;hi&lt;/b&gt;'));
  });
});
