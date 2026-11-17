import {
  PROPOSAL_NOTIFY_TO,
  isProposalEmailEnabled
} from '../proposal/email/sendProposal.js';
import { escapeHtml } from '../homeownerInquiry/email.js';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const PAGE_URL = 'https://www.feenypowerandcontrol.com/consultation';

export const PLATFORM_LABELS = {
  rti: 'RTI',
  lutron: 'Lutron',
  vantage: 'Vantage',
  'clipsal-c-bus': 'Clipsal C-Bus'
};

export const NEED_LABELS = {
  stuck: 'Help with a stuck job',
  new: 'Programming for a new project',
  other: 'Something else'
};

function formatFromAddress(from) {
  const address = String(from || '').trim();
  if (!address) return null;
  const match = address.match(/<([^>]+@[^>]+)>/);
  return `FPC Dealer Leads <${match ? match[1] : address}>`;
}

function formatTimestamp(date) {
  const local = date.toLocaleString('en-CA', {
    timeZone: 'America/Vancouver',
    dateStyle: 'full',
    timeStyle: 'short'
  });
  return `${local} (Pacific)`;
}

export function buildDealerInquiryEmail(inquiry) {
  const createdAt = inquiry.createdAt ? new Date(inquiry.createdAt) : new Date();
  const who = [inquiry.name, inquiry.company].filter(Boolean).join(', ').replace(/[\r\n]+/g, ' ').slice(0, 100);
  const platforms = inquiry.platforms.map((p) => PLATFORM_LABELS[p] || p).join(', ');
  const need = NEED_LABELS[inquiry.need] || inquiry.need;

  const rows = [
    ['Name', inquiry.name],
    ['Company', inquiry.company || '—'],
    ['Email', inquiry.email],
    ['Phone', inquiry.phone || '—'],
    ['Platforms', platforms],
    ['Needs', need],
    ['Page URL', PAGE_URL],
    ['Received', formatTimestamp(createdAt)],
    ['Session', inquiry.sessionId || '—']
  ];

  const subject = `${inquiry.test ? '[TEST] ' : ''}New dealer lead — ${need} — ${who}`;

  const text = [
    `New dealer lead from ${PAGE_URL}`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'Project:',
    inquiry.details,
    '',
    'Reply to this email to answer the dealer directly.'
  ].join('\n');

  const cell = 'padding:8px 12px;border-bottom:1px solid #e4e4e7;vertical-align:top;';
  const htmlRows = rows.map(([label, value]) => {
    let content = escapeHtml(value);
    if (label === 'Email') {
      content = `<a href="mailto:${escapeHtml(value)}" style="color:#333;">${content}</a>`;
    } else if (label === 'Page URL') {
      content = `<a href="${escapeHtml(value)}" style="color:#333;">${content}</a>`;
    }
    return `<tr><th align="left" style="${cell}color:#575759;font-weight:500;width:160px;">${escapeHtml(label)}</th>`
      + `<td style="${cell}color:#333;">${content}</td></tr>`;
  }).join('');

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:Rubik,Arial,Helvetica,sans-serif;color:#333;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:8px;border-top:4px solid #fcb040;">
<tr><td style="padding:24px 24px 8px;">
<h1 style="margin:0 0 4px;font-size:20px;font-weight:500;color:#000;">New dealer lead</h1>
<p style="margin:0;color:#575759;font-size:14px;">${escapeHtml(need)} · ${escapeHtml(platforms)}</p>
</td></tr>
<tr><td style="padding:16px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;">${htmlRows}</table>
</td></tr>
<tr><td style="padding:0 24px 24px;">
<h2 style="margin:8px 0;font-size:16px;font-weight:500;color:#000;">Project</h2>
<div style="white-space:pre-wrap;font-size:14px;line-height:1.5;background:#f4f4f5;border-radius:8px;padding:12px 16px;">${escapeHtml(inquiry.details)}</div>
<p style="margin:16px 0 0;font-size:12px;color:#a7a9ac;">Reply to this email to answer the dealer directly.</p>
</td></tr>
</table>
</body></html>`;

  return { subject, text, html };
}

/** Same delivery path as the homeowner leads (Resend, only when PROPOSAL_EMAIL_ENABLED is true). */
export async function sendDealerInquiryEmail(inquiry, options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || fetch;
  const log = options.log || console.log;
  const { subject, text, html } = buildDealerInquiryEmail(inquiry);

  if (!isProposalEmailEnabled(env)) {
    log(`[dealer-inquiry] email disabled (PROPOSAL_EMAIL_ENABLED is not true); not sent.\nSubject: ${subject}\n${text}`);
    return { delivered: false, method: 'log' };
  }

  const apiKey = env.PROPOSAL_EMAIL_API_KEY;
  if (!apiKey) throw new Error('PROPOSAL_EMAIL_API_KEY is not set');
  const from = formatFromAddress(env.PROPOSAL_EMAIL_FROM);
  if (!from) throw new Error('PROPOSAL_EMAIL_FROM is not set');

  const response = await fetchImpl(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [PROPOSAL_NOTIFY_TO], reply_to: inquiry.email, subject, text, html })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || payload.error || `HTTP ${response.status}`;
    throw new Error(`Resend send failed: ${detail}`);
  }
  return { delivered: true, method: 'resend', id: payload.id };
}
