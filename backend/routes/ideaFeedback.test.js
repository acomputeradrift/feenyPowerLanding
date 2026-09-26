import assert from 'node:assert/strict';
import express from 'express';
import { describe, it, before, after } from 'node:test';

import { createIdeaFeedbackRouter } from './ideaFeedback.js';
import { signFeedback } from '../ideaFeedback/verify.js';

const secret = 'test-feedback-hmac';
const title = 'Cut two Shorts from each OBS module';
const query = new URLSearchParams({
  v: 'up',
  b: 'fpc',
  d: '2026-09-02',
  t: title,
  s: signFeedback(secret, { business: 'fpc', date: '2026-09-02', title })
});

describe('idea feedback routes', () => {
  let server;
  let baseUrl;
  const saved = [];

  before(async () => {
    const app = express();
    app.use('/idea-feedback', createIdeaFeedbackRouter({
      secret,
      async upsert(doc) {
        saved.push(doc);
      },
      async list() {
        return saved;
      },
      async sendEmail() {
        return { delivered: false, method: 'outbox' };
      }
    }));
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('reports whether the process has an HMAC without verifying a link', async () => {
    const yes = await fetch(`${baseUrl}/idea-feedback/diag`);
    assert.equal(yes.status, 200);
    assert.equal((await yes.text()).trim(), 'configured: yes');
  });

  it('does not record a vote on GET and 404s a bad signature', async () => {
    const ok = await fetch(`${baseUrl}/idea-feedback/?${query}`);
    assert.equal(ok.status, 200);
    assert.equal(saved.length, 0);
    const bad = await fetch(`${baseUrl}/idea-feedback/?${query}&s=deadbeef`);
    assert.equal(bad.status, 404);
  });

  it('stores the flipped vote only on POST', async () => {
    const body = new URLSearchParams({
      v: 'down',
      b: 'fpc',
      d: '2026-09-02',
      t: title,
      s: query.get('s'),
      c: 'Marketing / Social Media Content',
      reason: 'too-vague',
      note: 'Wrong leaf.',
      action: 'vote'
    });
    const response = await fetch(`${baseUrl}/idea-feedback/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      redirect: 'manual'
    });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), '/idea-feedback/thanks');
    assert.equal(saved.length, 1);
    assert.equal(saved[0].vote, 'down');
    assert.equal(saved[0].reason, 'too-vague');
    assert.equal(saved[0].note, 'Wrong leaf.');
  });

  it('refuses a thumb that has no reason', async () => {
    const body = new URLSearchParams({
      v: 'up',
      b: 'fpc',
      d: '2026-09-02',
      t: title,
      s: query.get('s'),
      c: 'Marketing / Social Media Content',
      action: 'vote'
    });
    const response = await fetch(`${baseUrl}/idea-feedback/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      redirect: 'manual'
    });
    assert.equal(response.status, 400);
    assert.equal(saved.length, 1);
  });

  it('lists signed votes and accepts save-for-later without a reason', async () => {
    const save = new URLSearchParams({
      v: 'up',
      b: 'fpc',
      d: '2026-09-03',
      t: 'A later card',
      s: signFeedback(secret, { business: 'fpc', date: '2026-09-03', title: 'A later card' }),
      c: 'Sales / Email Outreach',
      note: 'Hold for the next dealer block.',
      action: 'saved'
    });
    const posted = await fetch(`${baseUrl}/idea-feedback/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: save,
      redirect: 'manual'
    });
    assert.equal(posted.status, 303);
    const listSig = signFeedback(secret, { business: 'fpc', date: 'votes', title: 'list' });
    const listed = await fetch(`${baseUrl}/idea-feedback/votes?b=fpc&s=${listSig}`);
    assert.equal(listed.status, 200);
    const payload = await listed.json();
    const savedRow = payload.votes.find((row) => row.date === '2026-09-03');
    assert.equal(savedRow.saved, true);
    assert.equal(savedRow.note, 'Hold for the next dealer block.');
    assert.equal(savedRow.category, 'Sales / Email Outreach');
    const bad = await fetch(`${baseUrl}/idea-feedback/votes?b=fpc&s=deadbeef`);
    assert.equal(bad.status, 404);
  });
});
