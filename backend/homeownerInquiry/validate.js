import { HOMEOWNER_BRANDS, HOMEOWNER_LOCATIONS } from '../models/HomeownerInquiry.js';
import { locations } from '../homeowner/content.js';

export const LIMITS = {
  name: 100,
  email: 254,
  phone: 40,
  city: 100,
  problem: 5000,
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
 * Honeypot `website` must be absent or blank. Anything else is a bot.
 */
export function isHoneypotFilled(body) {
  const value = body && body.website;
  if (value === undefined || value === null) return false;
  return String(value).trim() !== '';
}

/**
 * Returns { ok: true, value } with trimmed, capped, whitelisted fields,
 * or { ok: false, field, error } with a message safe to show the homeowner.
 */
export function validateInquiry(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return fail(null, 'Invalid request.');
  }

  const text = {};
  for (const field of ['name', 'email', 'phone', 'city', 'problem']) {
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
  if (!text.problem) return fail('problem', 'Please describe the problem.');

  if (!Array.isArray(body.brands) || body.brands.length === 0) {
    return fail('brands', 'Please choose at least one system.');
  }
  const brands = [];
  for (const brand of body.brands) {
    if (typeof brand !== 'string' || !HOMEOWNER_BRANDS.includes(brand)) {
      return fail('brands', 'Please choose a listed system.');
    }
    if (!brands.includes(brand)) brands.push(brand);
  }

  if (body.hasFile !== 'yes' && body.hasFile !== 'no') {
    return fail('hasFile', 'Please tell me whether you have the project file.');
  }

  if (!HOMEOWNER_LOCATIONS.includes(body.pageLocation)) {
    return fail('pageLocation', 'Invalid page.');
  }
  if (!HOMEOWNER_BRANDS.includes(body.pageBrand)) {
    return fail('pageBrand', 'Invalid page.');
  }

  let sessionId = null;
  if (body.sessionId !== undefined && body.sessionId !== null) {
    if (typeof body.sessionId !== 'string') return fail('sessionId', 'Invalid session.');
    sessionId = body.sessionId.trim().slice(0, LIMITS.sessionId) || null;
  }

  return {
    ok: true,
    value: {
      name: text.name,
      email: text.email,
      // Phone is optional. The form doesn't ask for city; it comes from the page.
      phone: text.phone,
      city: text.city || locations[body.pageLocation].city,
      brands,
      problem: text.problem,
      hasFile: body.hasFile,
      pageLocation: body.pageLocation,
      pageBrand: body.pageBrand,
      sessionId
    }
  };
}
