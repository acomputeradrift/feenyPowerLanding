import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { signFeedback, verifyFeedback } from './verify.js';

const secret = 'test-feedback-hmac';
const valid = {
  business: 'fpc',
  date: '2026-09-02',
  title: 'Cut two Shorts from each OBS module',
  vote: 'up',
  comment: 'Keep the thumbs.'
};

describe('idea feedback HMAC', () => {
  it('accepts a matching signature and ignores extra comment', () => {
    const signature = signFeedback(secret, valid);
    const verified = verifyFeedback({ ...valid, signature, b: valid.business }, secret);
    assert.equal(verified.business, 'fpc');
    assert.equal(verified.vote, 'up');
    assert.equal(verified.comment, 'Keep the thumbs.');
  });

  it('rejects a flipped title or missing secret', () => {
    const signature = signFeedback(secret, valid);
    assert.equal(verifyFeedback({ ...valid, title: 'other', s: signature }, secret), null);
    assert.equal(verifyFeedback({ ...valid, s: signature }, ''), null);
    assert.equal(verifyFeedback({ ...valid, vote: 'maybe', s: signature }, secret), null);
  });

  it('allows flipping the vote on the same signature', () => {
    const signature = signFeedback(secret, valid);
    const down = verifyFeedback({ ...valid, vote: 'down', s: signature }, secret);
    assert.equal(down.vote, 'down');
  });
});
