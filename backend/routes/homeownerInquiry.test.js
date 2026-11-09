import assert from 'node:assert/strict';
import express from 'express';
import { describe, it, before, after, beforeEach } from 'node:test';

import { createHomeownerInquiryRouter } from './homeownerInquiry.js';
import { buildInquiryEmail, sendInquiryEmail } from '../homeownerInquiry/email.js';

const valid = {
  name: '  Pat Homeowner ',
  email: 'pat@example.com',
  phone: '604-555-0100',
  city: 'West Vancouver',
  brands: ['lutron', 'rti', 'lutron'],
  problem: 'Keypads stopped working after a new router.',
  hasFile: 'no',
  pageLocation: 'vancouver',
  pageBrand: 'lutron',
  sessionId: 'abc123',
  website: ''
};

describe('homeowner inquiry route', () => {
  let server;
  let baseUrl;
  let saved;
  let emailed;
  let allowed;
  let owner = false;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/homeowner-inquiry', createHomeownerInquiryRouter({
      allowHit: () => allowed,
      isOwner: () => owner,
      async save(value) {
        saved.push(value);
        return { ...value, createdAt: new Date() };
      },
      async sendEmail(inquiry) {
        emailed.push(inquiry);
        return { delivered: false };
      },
      async markEmail() {}
    }));
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/homeowner-inquiry`;
  });

  after(async () => {
    await new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  });

  beforeEach(() => {
    saved = [];
    emailed = [];
    allowed = true;
  });

  const post = (body) => fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  it('saves a valid inquiry trimmed and deduped', async () => {
    const res = await post(valid);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(saved.length, 1);
    assert.equal(saved[0].name, 'Pat Homeowner');
    assert.deepEqual(saved[0].brands, ['lutron', 'rti']);
    assert.equal('website' in saved[0], false);
    assert.equal(saved[0].test, undefined);
    await new Promise((r) => setImmediate(r));
    assert.equal(emailed.length, 1);
  });

  it('flags an inquiry from the dashboard owner as test and still emails it', async () => {
    owner = true;
    try {
      assert.equal((await post(valid)).status, 200);
    } finally {
      owner = false;
    }
    assert.equal(saved[0].test, true);
    await new Promise((r) => setImmediate(r));
    assert.equal(emailed.length, 1);
    assert.match(buildInquiryEmail({ ...emailed[0], createdAt: new Date() }).subject, /^\[TEST\] New Lutron lead/);
  });

  it('rejects missing fields, bad email, bad brand, bad page', async () => {
    for (const body of [
      { ...valid, name: '' },
      { ...valid, problem: undefined },
      { ...valid, email: 'not-an-email' },
      { ...valid, brands: ['nest'] },
      { ...valid, brands: [] },
      { ...valid, hasFile: 'maybe' },
      { ...valid, pageLocation: 'toronto' },
      { ...valid, name: 'x'.repeat(101) }
    ]) {
      const res = await post(body);
      assert.equal(res.status, 400);
      assert.ok((await res.json()).error);
    }
    assert.equal(saved.length, 0);
  });

  it('takes city from the page when phone and city are left out', async () => {
    const { phone, city, ...rest } = valid;
    const res = await post({ ...rest, pageLocation: 'kelowna' });
    assert.equal(res.status, 200);
    assert.equal(saved[0].phone, '');
    assert.equal(saved[0].city, 'Kelowna');
  });

  it('caps an optional phone at 40 characters', async () => {
    const long = await post({ ...valid, phone: '1'.repeat(41) });
    assert.equal(long.status, 400);
    assert.equal((await long.json()).field, 'phone');
    assert.equal(saved.length, 0);
  });

  it('pretends success for a filled honeypot without saving', async () => {
    const res = await post({ ...valid, website: 'http://spam.example' });
    assert.equal(res.status, 200);
    assert.equal(saved.length, 0);
    assert.equal(emailed.length, 0);
  });

  it('returns 429 when rate limited', async () => {
    allowed = false;
    const res = await post(valid);
    assert.equal(res.status, 429);
    assert.equal(saved.length, 0);
  });
});

describe('homeowner inquiry email', () => {
  const inquiry = {
    ...valid,
    name: '<script>alert(1)</script>',
    problem: 'a & b <b>bold</b>',
    brands: ['lutron'],
    createdAt: new Date('2026-11-07T18:00:00Z')
  };

  it('escapes user input in HTML and builds the subject', () => {
    const { subject, html, text } = buildInquiryEmail(inquiry);
    assert.match(subject, /^New Lutron lead — Greater Vancouver — /);
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('a &amp; b &lt;b&gt;'));
    assert.ok(text.includes('https://www.feenypowerandcontrol.com/vancouver/lutron'));
  });

  it('does not call Resend when disabled', async () => {
    let called = false;
    const result = await sendInquiryEmail(inquiry, {
      env: { PROPOSAL_EMAIL_ENABLED: 'false' },
      fetchImpl: () => { called = true; },
      log: () => {}
    });
    assert.equal(called, false);
    assert.equal(result.delivered, false);
  });

  it('sends via Resend with reply_to when enabled', async () => {
    let sent;
    const result = await sendInquiryEmail(inquiry, {
      env: {
        PROPOSAL_EMAIL_ENABLED: 'true',
        PROPOSAL_EMAIL_API_KEY: 'k',
        PROPOSAL_EMAIL_FROM: 'RTI Proposals <leads@example.com>'
      },
      fetchImpl: async (url, init) => {
        sent = JSON.parse(init.body);
        return { ok: true, json: async () => ({ id: 'e1' }) };
      }
    });
    assert.equal(result.delivered, true);
    assert.equal(sent.reply_to, 'pat@example.com');
    assert.deepEqual(sent.to, ['feeny.jamie@gmail.com']);
    assert.equal(sent.from, 'FPC Homeowner Leads <leads@example.com>');
    assert.ok(sent.html && sent.text);
  });
});
