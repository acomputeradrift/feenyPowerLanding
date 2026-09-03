import { createHmac, timingSafeEqual } from 'node:crypto';

export const HMAC_ENV = 'IDEA_FEEDBACK_HMAC';
export const ALLOWED_VOTES = new Set(['up', 'down']);
export const MAX_COMMENT_CHARS = 2000;

export function signFeedback(secret, { business, date, title }) {
  return createHmac('sha256', secret)
    .update(`${business}\n${date}\n${title}`, 'utf8')
    .digest('hex');
}

export function parseFeedbackInput(input = {}) {
  return {
    business: String(input.b ?? input.business ?? '').trim(),
    date: String(input.d ?? input.date ?? '').trim(),
    title: String(input.t ?? input.title ?? ''),
    vote: String(input.v ?? input.vote ?? '').trim(),
    signature: String(input.s ?? input.signature ?? '').trim(),
    comment: String(input.comment ?? '').trim().slice(0, MAX_COMMENT_CHARS)
  };
}

export function verifyFeedback(input, secret) {
  if (!secret) return null;
  const parsed = parseFeedbackInput(input);
  if (!parsed.business || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) return null;
  if (!ALLOWED_VOTES.has(parsed.vote)) return null;
  const expected = signFeedback(secret, parsed);
  const got = parsed.signature;
  if (!got || expected.length !== got.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(got, 'utf8'))) {
      return null;
    }
  } catch {
    return null;
  }
  return parsed;
}
