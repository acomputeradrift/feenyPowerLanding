import { createHmac, timingSafeEqual } from 'node:crypto';

export const HMAC_ENV = 'IDEA_FEEDBACK_HMAC';
export const ALLOWED_VOTES = new Set(['up', 'down']);
export const MAX_COMMENT_CHARS = 2000;
export const UP_REASONS = new Set(['fits-how-i-work', 'new-angle', 'specific-enough']);
export const DOWN_REASONS = new Set([
  'not-how-i-work',
  'already-doing-this',
  'wrong-focus',
  'too-vague',
  'not-worth-payoff',
  'sparked'
]);
export const CATEGORIES = new Set([
  'Marketing / Landing Page SEO',
  'Marketing / Social Media Content',
  'Sales / Email Outreach',
  'Sales / Proposals',
  'Sales / Offer & Packaging',
  'CRM / Client Feedback',
  'CRM / Client Qualification',
  'CRM / Retention & Expansion',
  'Operations / Delivery Playbooks',
  'Operations / Admin Automation',
  'Operations / Unpaid-Work Prevention',
  'Operations / Invoice & Collections'
]);

export function signFeedback(secret, { business, date, title }) {
  return createHmac('sha256', secret)
    .update(`${business}\n${date}\n${title}`, 'utf8')
    .digest('hex');
}

function signaturesMatch(expected, got) {
  if (!got || expected.length !== got.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(got, 'utf8'));
  } catch {
    return false;
  }
}

function flag(value) {
  return value === true || value === 'true' || value === '1';
}

export function parseFeedbackInput(input = {}) {
  const note = String(input.note ?? input.comment ?? '').trim().slice(0, MAX_COMMENT_CHARS);
  const action = String(input.action ?? '').trim();
  return {
    business: String(input.b ?? input.business ?? '').trim(),
    date: String(input.d ?? input.date ?? '').trim(),
    title: String(input.t ?? input.title ?? ''),
    vote: String(input.v ?? input.vote ?? '').trim(),
    signature: String(input.s ?? input.signature ?? '').trim(),
    reason: String(input.reason ?? '').trim(),
    note,
    comment: note,
    category: String(input.c ?? input.category ?? '').trim(),
    saved: action === 'saved' || flag(input.saved),
    done: action === 'done' || flag(input.done)
  };
}

export function verifyFeedback(input, secret) {
  if (!secret) return null;
  const parsed = parseFeedbackInput(input);
  if (!parsed.business || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) return null;
  if (!ALLOWED_VOTES.has(parsed.vote)) return null;
  const expected = signFeedback(secret, parsed);
  if (!signaturesMatch(expected, parsed.signature)) return null;
  return parsed;
}

export function verifyVotesList(input, secret) {
  if (!secret) return null;
  const business = String(input.b ?? input.business ?? '').trim();
  const signature = String(input.s ?? input.signature ?? '').trim();
  if (!business) return null;
  const expected = signFeedback(secret, { business, date: 'votes', title: 'list' });
  if (!signaturesMatch(expected, signature)) return null;
  return { business };
}

export function reasonFits(parsed) {
  if (parsed.done || parsed.saved) return true;
  if (parsed.vote === 'up') return UP_REASONS.has(parsed.reason);
  if (parsed.vote === 'down') return DOWN_REASONS.has(parsed.reason);
  return false;
}

export function toVotePayload(doc) {
  const category = String(doc.category || '').trim();
  if (!CATEGORIES.has(category)) return null;
  const note = String(doc.note || doc.comment || '').trim();
  const base = {
    date: doc.date,
    title: doc.title || '',
    category,
    note
  };
  if (doc.done === true) return { ...base, done: true };
  if (doc.saved === true) return { ...base, saved: true };
  const reason = String(doc.reason || '').trim();
  if (doc.vote === 'up' && UP_REASONS.has(reason)) return { ...base, vote: 'up', reason };
  if (doc.vote === 'down' && DOWN_REASONS.has(reason)) return { ...base, vote: 'down', reason };
  return null;
}
