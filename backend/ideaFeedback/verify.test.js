import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { signFeedback, toVotePayload, verifyFeedback, verifyVotesList } from './verify.js';

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

  it('keeps a reason and treats the old comment field as the note', () => {
    const signature = signFeedback(secret, valid);
    const verified = verifyFeedback({
      ...valid,
      s: signature,
      reason: 'fits-how-i-work',
      c: 'Sales / Email Outreach',
      action: 'vote'
    }, secret);
    assert.equal(verified.reason, 'fits-how-i-work');
    assert.equal(verified.note, 'Keep the thumbs.');
    assert.equal(verified.category, 'Sales / Email Outreach');
  });

  it('signs the votes list with the literal date and title', () => {
    const signature = signFeedback(secret, { business: 'fpc', date: 'votes', title: 'list' });
    assert.deepEqual(verifyVotesList({ b: 'fpc', s: signature }, secret), { business: 'fpc' });
    assert.equal(verifyVotesList({ b: 'fpc', s: 'nope' }, secret), null);
  });

  it('drops a bare thumb that has no reason from the votes list', () => {
    assert.equal(toVotePayload({
      date: '2026-09-02',
      title: valid.title,
      vote: 'up',
      category: 'Sales / Email Outreach'
    }), null);
    assert.deepEqual(toVotePayload({
      date: '2026-09-02',
      title: valid.title,
      vote: 'down',
      reason: 'sparked',
      category: 'Sales / Offer & Packaging',
      note: 'led me somewhere else'
    }).reason, 'sparked');
  });
});
