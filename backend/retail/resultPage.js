import { areaBySlug } from './areas.js';
import { DELIVERY_MESSAGES, PAID_NOTICE } from './messages.js';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function resultBackLink(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const area = areaBySlug(typeof body.area === 'string' ? body.area : '');
  if (!area || body.sourcePath !== area.path) return null;
  return { path: area.path, label: area.label };
}

export function resultMessage(result) {
  if (result.body?.delivered === true && result.body?.ok === true) {
    return `${DELIVERY_MESSAGES.success} ${PAID_NOTICE}`;
  }
  if (result.body?.error === 'validation_failed') {
    const details = result.body.fieldErrors ? Object.values(result.body.fieldErrors) : [];
    return [DELIVERY_MESSAGES.validationIntro, ...details].join(' ');
  }
  return DELIVERY_MESSAGES[result.body?.error] || DELIVERY_MESSAGES.delivery_failed;
}

export function renderEnquiryResultPage({ sent, message, back }) {
  const title = sent ? 'Enquiry sent' : 'Enquiry not sent';
  const backLink = back
    ? `<p><a href="${escapeHtml(back.path)}">Back to the ${escapeHtml(back.label)} form</a></p>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | Feeny Power &amp; Control Ltd</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="/images/feeny-logo-512-circle-black-back.png" type="image/x-icon">
  <link rel="stylesheet" href="/styles/global.css">
  <link rel="stylesheet" href="/styles/retail.css">
</head>
<body>
  <header>
    <div class="logo">
      <img src="/images/feeny-logo-white.png" alt="Feeny Power and Control Logo">
    </div>
    <h1><span class="text-black">${escapeHtml(title)}</span></h1>
  </header>
  <main class="enquiry-result">
    <p>${escapeHtml(message)}</p>
    ${backLink}
  </main>
  <footer>
    <p>© 2026 Feeny Power and Control Ltd. All Rights Reserved.</p>
  </footer>
</body>
</html>
`;
}
