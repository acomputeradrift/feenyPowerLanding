import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultOutboxDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'outbox');
const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

export function isProposalEmailEnabled(env = process.env) {
  return env.PROPOSAL_EMAIL_ENABLED === 'true';
}

function billedProjectHours(hours) {
  return Math.ceil(Number(hours) || 0);
}

function billedHoursLabel(hours) {
  const n = billedProjectHours(hours);
  return n === 1 ? '1 hour' : `${n} hours`;
}

function proposalEmailCopy(submission) {
  const hours = billedHoursLabel(submission.totalProjectHours);
  return {
    subject: `RTI Proposal ${submission.reference} (${hours})`,
    text: `Your RTI programming budget is attached (${hours}). Reference ${submission.reference}.`
  };
}

function formatFromAddress(from) {
  if (!from) return from || null;
  const address = String(from).trim();
  if (!address) return null;
  if (/<[^>]+@[^>]+>/.test(address)) return address;
  return `RTI Proposals <${address}>`;
}

function buildMessage({ submission, pdfBuffer, pdfFilename }, env) {
  const from = formatFromAddress(env.PROPOSAL_EMAIL_FROM);
  const bcc = env.PROPOSAL_EMAIL_BCC;
  const { subject, text } = proposalEmailCopy(submission);
  const message = {
    from,
    to: [submission.contractorEmail],
    subject,
    text
  };
  if (bcc) {
    message.bcc = [bcc];
    message.reply_to = bcc;
  }
  if (pdfBuffer) {
    message.attachments = [{
      filename: pdfFilename || `${submission.reference}.pdf`,
      content: Buffer.from(pdfBuffer).toString('base64')
    }];
  }
  return message;
}

async function sendViaResend({ submission, pdfBuffer, pdfFilename }, env, fetchImpl) {
  const apiKey = env.PROPOSAL_EMAIL_API_KEY;
  if (!apiKey) throw new Error('PROPOSAL_EMAIL_API_KEY is not set');
  if (!env.PROPOSAL_EMAIL_FROM) throw new Error('PROPOSAL_EMAIL_FROM is not set');

  const response = await fetchImpl(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(buildMessage({ submission, pdfBuffer, pdfFilename }, env))
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || payload.error || `HTTP ${response.status}`;
    throw new Error(`Resend send failed: ${detail}`);
  }
  return { delivered: true, method: 'resend', id: payload.id };
}

export async function sendProposalEmail({ submission, pdfBuffer, pdfFilename }, options = {}) {
  const env = options.env || process.env;
  const outboxDir = options.outboxDir || defaultOutboxDir;
  const fetchImpl = options.fetchImpl || fetch;

  if (isProposalEmailEnabled(env)) {
    return sendViaResend({ submission, pdfBuffer, pdfFilename }, env, fetchImpl);
  }

  await mkdir(outboxDir, { recursive: true });
  const jsonPath = path.join(outboxDir, `${submission.reference}.json`);
  const { subject } = proposalEmailCopy(submission);
  const payload = {
    to: submission.contractorEmail,
    bcc: env.PROPOSAL_EMAIL_BCC || null,
    from: formatFromAddress(env.PROPOSAL_EMAIL_FROM),
    subject,
    reference: submission.reference,
    pdfFilename,
    totalProjectHours: submission.totalProjectHours,
    note: 'PROPOSAL_EMAIL_ENABLED is not true; this file is the development outbox. Mail was not sent.'
  };
  await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  if (pdfBuffer) {
    const pdfPath = path.join(outboxDir, pdfFilename || `${submission.reference}.pdf`);
    await writeFile(pdfPath, pdfBuffer);
  }

  return { delivered: false, method: 'outbox', path: jsonPath };
}
