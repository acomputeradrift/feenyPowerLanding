import { PROPOSAL_NOTIFY_TO } from '../proposal/email/sendProposal.js';
import { isEmail } from './contact.js';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

export const RETAIL_ENQUIRY_TO = PROPOSAL_NOTIFY_TO;

function oneLine(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function bareEmail(from) {
  if (!from) return null;
  const address = String(from).trim();
  const wrapped = address.match(/<([^>]+)>/);
  const email = (wrapped ? wrapped[1] : address).trim();
  return isEmail(email) ? email : null;
}

function retailFrom(from) {
  const email = bareEmail(from);
  if (!email) return null;
  return `Feeny Power and Control <${email}>`;
}

export function retailEnquiryText(enquiry) {
  const goals = String(enquiry.goals).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return [
    'Retail homeowner enquiry',
    `Area: ${oneLine(enquiry.areaLabel)}`,
    `Page: ${enquiry.sourcePath}`,
    `Name: ${oneLine(enquiry.name)}`,
    `Contact: ${oneLine(enquiry.contact)}`,
    `Property location: ${oneLine(enquiry.propertyLocation)}`,
    `Project type: ${enquiry.projectTypeLabel}`,
    '',
    'Goals:',
    goals,
    '',
    'This is a consulting enquiry. It is not an installation quote, and consulting scope is not agreed yet.',
    'Consulting, design, and specification are paid services.',
  ].join('\n');
}

function buildMessage(enquiry, env) {
  const message = {
    from: retailFrom(env.PROPOSAL_EMAIL_FROM),
    to: [RETAIL_ENQUIRY_TO],
    subject: `Retail enquiry (${oneLine(enquiry.areaLabel)}): ${oneLine(enquiry.name).slice(0, 80)}`,
    text: retailEnquiryText(enquiry),
  };
  if (isEmail(enquiry.contact.trim())) message.reply_to = enquiry.contact.trim();
  return message;
}

export async function sendRetailEnquiryEmail(enquiry, options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || fetch;

  if (env.PROPOSAL_EMAIL_ENABLED !== 'true' || !env.PROPOSAL_EMAIL_API_KEY || !bareEmail(env.PROPOSAL_EMAIL_FROM)) {
    return { delivered: false, method: 'not_configured' };
  }

  const response = await fetchImpl(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PROPOSAL_EMAIL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildMessage(enquiry, env)),
    signal: options.signal || AbortSignal.timeout(10000),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { delivered: false, method: 'resend_error', status: response.status };
  }
  return { delivered: true, method: 'resend', id: payload.id || null };
}
