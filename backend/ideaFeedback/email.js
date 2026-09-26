import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultOutboxDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'outbox');
const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
export const FEEDBACK_NOTIFY_TO = 'feeny.jamie@gmail.com';

export function isFeedbackEmailEnabled(env = process.env) {
  return env.PROPOSAL_EMAIL_ENABLED === 'true';
}

function formatFromAddress(from) {
  if (!from) return null;
  const address = String(from).trim();
  if (!address) return null;
  if (/<[^>]+@[^>]+>/.test(address)) return address;
  return `Growth Ideas <${address}>`;
}

export function feedbackEmailCopy(feedback) {
  let label = feedback.vote === 'up' ? 'useful' : 'not useful';
  if (feedback.done) label = 'done';
  else if (feedback.saved) label = 'saved for later';
  const reason = feedback.reason ? `\nReason: ${feedback.reason}` : '';
  const note = feedback.note || feedback.comment;
  const comment = note ? `\n\n${note}` : '';
  return {
    subject: `Idea feedback: ${label} — ${feedback.date}`,
    text: `${feedback.date} (${feedback.business})\n${feedback.title}\n\nVote: ${label}${reason}${comment}\n`
  };
}

async function sendViaResend(feedback, env, fetchImpl) {
  const apiKey = env.PROPOSAL_EMAIL_API_KEY;
  if (!apiKey) throw new Error('PROPOSAL_EMAIL_API_KEY is not set');
  if (!env.PROPOSAL_EMAIL_FROM) throw new Error('PROPOSAL_EMAIL_FROM is not set');
  const { subject, text } = feedbackEmailCopy(feedback);
  const response = await fetchImpl(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: formatFromAddress(env.PROPOSAL_EMAIL_FROM),
      to: [FEEDBACK_NOTIFY_TO],
      subject,
      text
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || payload.error || `HTTP ${response.status}`;
    throw new Error(`Resend send failed: ${detail}`);
  }
  return { delivered: true, method: 'resend', id: payload.id };
}

export async function sendFeedbackEmail(feedback, options = {}) {
  const env = options.env || process.env;
  const outboxDir = options.outboxDir || defaultOutboxDir;
  const fetchImpl = options.fetchImpl || fetch;

  if (isFeedbackEmailEnabled(env)) {
    return sendViaResend(feedback, env, fetchImpl);
  }

  await mkdir(outboxDir, { recursive: true });
  const jsonPath = path.join(outboxDir, `${feedback.business}-${feedback.date}.json`);
  const { subject, text } = feedbackEmailCopy(feedback);
  await writeFile(jsonPath, `${JSON.stringify({
    to: FEEDBACK_NOTIFY_TO,
    from: formatFromAddress(env.PROPOSAL_EMAIL_FROM),
    subject,
    text,
    note: 'PROPOSAL_EMAIL_ENABLED is not true; this file is the development outbox. Mail was not sent.'
  }, null, 2)}\n`, 'utf8');
  return { delivered: false, method: 'outbox', path: jsonPath };
}
