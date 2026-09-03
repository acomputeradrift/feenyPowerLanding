import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { FEEDBACK_NOTIFY_TO, sendFeedbackEmail } from './email.js';

const feedback = {
  business: 'fpc',
  date: '2026-09-02',
  title: 'Cut two Shorts from each OBS module',
  vote: 'down',
  comment: 'Wrong leaf.'
};

describe('idea feedback email', () => {
  it('writes the outbox when sending is not enabled', async () => {
    const outboxDir = await mkdtemp(path.join(os.tmpdir(), 'idea-feedback-outbox-'));
    const result = await sendFeedbackEmail(feedback, {
      env: { PROPOSAL_EMAIL_ENABLED: 'false' },
      outboxDir
    });
    assert.equal(result.delivered, false);
    assert.equal(result.method, 'outbox');
    const written = JSON.parse(await readFile(result.path, 'utf8'));
    assert.equal(written.to, FEEDBACK_NOTIFY_TO);
    assert.match(written.subject, /not useful/);
    assert.match(written.text, /Wrong leaf/);
  });

  it('sends through Resend to Jamie only', async () => {
    const calls = [];
    const result = await sendFeedbackEmail(feedback, {
      env: {
        PROPOSAL_EMAIL_ENABLED: 'true',
        PROPOSAL_EMAIL_API_KEY: 're_test',
        PROPOSAL_EMAIL_FROM: 'growth_ideas@feenypowerandcontrol.com'
      },
      async fetchImpl(url, init) {
        calls.push({ url, init });
        return { ok: true, status: 200, async json() { return { id: 'msg_1' }; } };
      }
    });
    assert.equal(result.delivered, true);
    const body = JSON.parse(calls[0].init.body);
    assert.deepEqual(body.to, [FEEDBACK_NOTIFY_TO]);
    assert.equal(body.from, 'Growth Ideas <growth_ideas@feenypowerandcontrol.com>');
    assert.match(body.subject, /not useful/);
  });
});
