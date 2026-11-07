// Weekly analytics email. Mirrors the proposal email's Resend pattern and
// shares its credentials and on/off switch (PROPOSAL_EMAIL_ENABLED); the
// proposal module itself is not touched.
const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

export const DEFAULT_REPORT_TO = 'feeny.jamie@gmail.com';

export function isAnalyticsEmailEnabled(env = process.env) {
  return env.PROPOSAL_EMAIL_ENABLED === 'true' && env.ANALYTICS_REPORT_ENABLED !== 'false';
}

export function reportRecipients(env = process.env) {
  const raw = env.ANALYTICS_REPORT_TO || DEFAULT_REPORT_TO;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function formatFromAddress(from) {
  const address = String(from || '').trim();
  if (!address) return null;
  if (/<[^>]+@[^>]+>/.test(address)) return address;
  return `FPC Analytics <${address}>`;
}

export async function sendReportEmail({ subject, html, text }, { env = process.env, fetchImpl = fetch } = {}) {
  const apiKey = env.PROPOSAL_EMAIL_API_KEY;
  if (!apiKey) throw new Error('PROPOSAL_EMAIL_API_KEY is not set');
  if (!env.PROPOSAL_EMAIL_FROM) throw new Error('PROPOSAL_EMAIL_FROM is not set');

  const response = await fetchImpl(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: formatFromAddress(env.PROPOSAL_EMAIL_FROM),
      to: reportRecipients(env),
      subject,
      html,
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
