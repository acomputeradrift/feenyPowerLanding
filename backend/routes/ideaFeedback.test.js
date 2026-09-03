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
      comment: 'Wrong leaf.'
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
    assert.equal(saved[0].comment, 'Wrong leaf.');
  });
});
