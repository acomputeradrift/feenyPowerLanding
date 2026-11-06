import { areaBySlug } from './areas.js';
import { isEmail, isPhone } from './contact.js';
import { ENQUIRY_MESSAGES } from './messages.js';
import { sendRetailEnquiryEmail } from './sendEnquiry.js';

export const PROJECT_TYPES = {
  new_build: 'New build',
  renovation: 'Renovation',
  existing_system: 'Existing system',
};

const ALLOWED = new Set([
  'area',
  'sourcePath',
  'propertyLocation',
  'projectType',
  'goals',
  'name',
  'contact',
  'honeypot',
]);

function checkLength(name, value, errors, min, max, shortMessage, longMessage) {
  if (typeof value !== 'string') {
    errors[name] = shortMessage;
    return '';
  }
  const trimmed = value.trim();
  if (trimmed.length < min) errors[name] = shortMessage;
  else if (trimmed.length > max) errors[name] = longMessage;
  return trimmed;
}

export function isHoneypotFilled(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  return body.honeypot != null && String(body.honeypot).trim() !== '';
}

export function validateRetailEnquiry(body) {
  const errors = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.area = ENQUIRY_MESSAGES.area;
    return errors;
  }

  for (const key of Object.keys(body)) {
    if (!ALLOWED.has(key)) errors[key] = ENQUIRY_MESSAGES.unknown;
  }
  if (Object.keys(errors).length > 0) return errors;

  const area = areaBySlug(typeof body.area === 'string' ? body.area : '');
  if (!area) errors.area = ENQUIRY_MESSAGES.area;
  else if (body.sourcePath !== area.path) errors.sourcePath = ENQUIRY_MESSAGES.sourcePath;

  checkLength(
    'propertyLocation',
    body.propertyLocation,
    errors,
    2,
    200,
    ENQUIRY_MESSAGES.propertyLocation,
    ENQUIRY_MESSAGES.propertyLocationLong,
  );

  if (typeof body.projectType !== 'string' || !Object.prototype.hasOwnProperty.call(PROJECT_TYPES, body.projectType)) {
    errors.projectType = ENQUIRY_MESSAGES.projectType;
  }

  checkLength('goals', body.goals, errors, 10, 2000, ENQUIRY_MESSAGES.goals, ENQUIRY_MESSAGES.goalsLong);

  const name = checkLength('name', body.name, errors, 1, 120, ENQUIRY_MESSAGES.name, ENQUIRY_MESSAGES.nameLong);
  if (name && !/\p{L}/u.test(name)) errors.name = ENQUIRY_MESSAGES.name;

  const contact = checkLength(
    'contact',
    body.contact,
    errors,
    1,
    200,
    ENQUIRY_MESSAGES.contact,
    ENQUIRY_MESSAGES.contactLong,
  );
  if (contact && contact.length <= 200 && !isEmail(contact) && !isPhone(contact)) {
    errors.contact = ENQUIRY_MESSAGES.contact;
  }

  return errors;
}

export function normalizeRetailEnquiry(body) {
  const area = areaBySlug(body.area);
  return {
    area: area.slug,
    areaLabel: area.label,
    sourcePath: area.path,
    propertyLocation: body.propertyLocation.trim(),
    projectType: body.projectType,
    projectTypeLabel: PROJECT_TYPES[body.projectType],
    goals: body.goals.trim(),
    name: body.name.trim(),
    contact: body.contact.trim(),
  };
}

export async function processRetailEnquiry(body, deps = {}) {
  if (isHoneypotFilled(body)) {
    return { status: 200, discarded: true, body: { ok: true, delivered: true } };
  }

  const fieldErrors = validateRetailEnquiry(body);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: 400,
      body: { error: 'validation_failed', fieldErrors, delivered: false },
    };
  }

  const enquiry = normalizeRetailEnquiry(body);
  const send = deps.sendEmail || sendRetailEnquiryEmail;
  try {
    const result = await send(enquiry, deps);
    if (result && result.delivered === true) {
      return { status: 200, body: { ok: true, delivered: true } };
    }
    const notConfigured = !result || result.method === 'not_configured';
    return {
      status: notConfigured ? 503 : 502,
      body: {
        error: notConfigured ? 'delivery_not_configured' : 'delivery_failed',
        delivered: false,
      },
    };
  } catch {
    return { status: 502, body: { error: 'delivery_failed', delivered: false } };
  }
}
