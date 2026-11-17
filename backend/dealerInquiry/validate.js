import { DEALER_NEEDS, DEALER_PLATFORMS } from '../models/DealerInquiry.js';

export { isHoneypotFilled } from '../homeownerInquiry/validate.js';

export const LIMITS = {
  name: 100,
  company: 120,
  email: 254,
  phone: 40,
  details: 5000,
  sessionId: 100
};

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;

function fail(field, error) {
  return { ok: false, field, error };
}

function optionalString(value) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return null;
  return value.trim();
}

/**
 * Returns { ok: true, value } with trimmed, capped, whitelisted fields,
 * or { ok: false, field, error } with a message safe to show the dealer.
 */
export function validateDealerInquiry(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return fail(null, 'Invalid request.');
  }

  const text = {};
  for (const field of ['name', 'company', 'email', 'phone', 'details']) {
    const value = optionalString(body[field]);
    if (value === null) return fail(field, `Invalid ${field}.`);
    if (value.length > LIMITS[field]) {
      return fail(field, `Please keep ${field} under ${LIMITS[field]} characters.`);
    }
    text[field] = value;
  }

  if (!text.name) return fail('name', 'Please enter your name.');
  if (!text.email) return fail('email', 'Please enter your email.');
  if (!EMAIL_RE.test(text.email)) return fail('email', 'Please enter a valid email address.');

  if (!Array.isArray(body.platforms) || body.platforms.length === 0) {
    return fail('platforms', 'Please choose at least one platform.');
  }
  const platforms = [];
  for (const p of body.platforms) {
    if (typeof p !== 'string' || !DEALER_PLATFORMS.includes(p)) {
      return fail('platforms', 'Please choose a listed platform.');
    }
    if (!platforms.includes(p)) platforms.push(p);
  }

  if (!DEALER_NEEDS.includes(body.need)) {
    return fail('need', 'Please tell me what you need.');
  }
  if (!text.details) return fail('details', 'Please tell me a little about the project.');

  let sessionId = null;
  if (body.sessionId !== undefined && body.sessionId !== null) {
    if (typeof body.sessionId !== 'string') return fail('sessionId', 'Invalid session.');
    sessionId = body.sessionId.trim().slice(0, LIMITS.sessionId) || null;
  }

  return {
    ok: true,
    value: {
      name: text.name,
      company: text.company,
      email: text.email,
      phone: text.phone,
      platforms,
      need: body.need,
      details: text.details,
      sessionId
    }
  };
}
