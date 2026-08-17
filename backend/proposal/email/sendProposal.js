import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultOutboxDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'outbox');

export function isProposalEmailEnabled(env = process.env) {
  return env.PROPOSAL_EMAIL_ENABLED === 'true';
}

export async function sendProposalEmail({ submission, pdfBuffer, pdfFilename }, options = {}) {
  const env = options.env || process.env;
  const outboxDir = options.outboxDir || defaultOutboxDir;

  if (isProposalEmailEnabled(env)) {
    throw new Error('Transactional email provider is not configured');
  }

  await mkdir(outboxDir, { recursive: true });
  const jsonPath = path.join(outboxDir, `${submission.reference}.json`);
  const payload = {
    to: submission.contractorEmail,
    bcc: env.PROPOSAL_EMAIL_BCC || null,
    from: env.PROPOSAL_EMAIL_FROM || null,
    subject: `RTI Proposal ${submission.reference}`,
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
