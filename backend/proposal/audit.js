import { timingSafeEqual } from 'node:crypto';

import { ProposalSubmission } from '../models/ProposalSubmission.js';

const SECTION_LABELS = {
  lightingShading: 'Lighting/Shading',
  audioVideo: 'Audio/Video',
  climate: 'Climate',
  security: 'Security',
  poolAndPumps: 'Pool/Pumps',
  inputOutput: 'Inputs/Outputs',
  controllers: 'Controllers'
};

export function tokensEqual(presented, expected) {
  if (typeof presented !== 'string' || typeof expected !== 'string') {
    return false;
  }
  const presentedBuf = Buffer.from(presented, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const length = Math.max(presentedBuf.length, expectedBuf.length, 1);
  const paddedPresented = Buffer.alloc(length);
  const paddedExpected = Buffer.alloc(length);
  presentedBuf.copy(paddedPresented);
  expectedBuf.copy(paddedExpected);
  const contentEqual = timingSafeEqual(paddedPresented, paddedExpected);
  const lengthEqual = presentedBuf.length === expectedBuf.length;
  return contentEqual && lengthEqual;
}

export function presentedAuditToken(req) {
  const header = req.get?.('x-proposal-audit-token');
  if (typeof header === 'string' && header !== '') return header;
  const query = req.query?.token;
  if (typeof query === 'string') return query;
  if (Array.isArray(query) && typeof query[0] === 'string') return query[0];
  return '';
}

function isAuditTokenConfigured(token) {
  return typeof token === 'string' && token.length > 0;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatSubmittedAt(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

function formatNumber(value) {
  if (value == null || value === '') return '';
  return String(value);
}

function sectionLabel(section) {
  return SECTION_LABELS[section] || section || 'Unknown';
}

function groupLineItems(lineItems) {
  const groups = [];
  const indexBySection = new Map();
  for (const item of Array.isArray(lineItems) ? lineItems : []) {
    const section = item?.section || 'unknown';
    if (!indexBySection.has(section)) {
      indexBySection.set(section, groups.length);
      groups.push({ section, items: [] });
    }
    groups[indexBySection.get(section)].items.push(item);
  }
  return groups;
}

function roundingChanged(item) {
  return Number(item?.rawHours) !== Number(item?.hours);
}

export function renderAuditHtml(submission) {
  const reference = escapeHtml(submission.reference || '');
  const submittedAt = escapeHtml(formatSubmittedAt(submission.submittedAt));
  const rateCardVersion = escapeHtml(submission.rateCardVersion || '');
  const schemaVersion = escapeHtml(submission.schemaVersion || '');
  const groups = groupLineItems(submission.lineItems);
  const sectionHours = submission.sectionHours || {};

  const groupRows = groups.map((group) => {
    const label = escapeHtml(sectionLabel(group.section));
    const sectionId = escapeHtml(group.section);
    const itemRows = group.items.map((item) => {
      const rounded = roundingChanged(item) ? ' class="rounded"' : '';
      return `<tr data-line-id="${escapeHtml(item.id || '')}"${rounded}>
        <td>${escapeHtml(item.label || item.id || '')}</td>
        <td data-field="count">${escapeHtml(formatNumber(item.count))}</td>
        <td data-field="minutesPerUnit">${escapeHtml(formatNumber(item.minutesPerUnit))}</td>
        <td data-field="rawHours">${escapeHtml(formatNumber(item.rawHours))}</td>
        <td data-field="hours">${escapeHtml(formatNumber(item.hours))}</td>
      </tr>`;
    }).join('\n');
    const subtotal = escapeHtml(formatNumber(sectionHours[group.section]));
    return `<tr class="section-head"><th colspan="5">${label}</th></tr>
${itemRows}
<tr class="section-subtotal" data-section="${sectionId}">
  <th colspan="4">${label} subtotal</th>
  <td data-field="sectionHours">${subtotal}</td>
</tr>`;
  }).join('\n');

  const total = escapeHtml(formatNumber(submission.totalProjectHours));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>Proposal audit ${reference}</title>
  <style>
    body { font-family: Rubik, Helvetica, Arial, sans-serif; color: #333; background: #f4f4f4; margin: 0; padding: 24px; line-height: 1.5; }
    h1 { font-size: 1.4rem; margin: 0 0 12px; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 0 0 24px; }
    dt { color: #575759; }
    dd { margin: 0; }
    table { border-collapse: collapse; width: 100%; max-width: 960px; background: #fff; }
    th, td { border: 1px solid #a7a9ac; padding: 8px 10px; text-align: left; }
    td[data-field], th:last-child { text-align: right; font-variant-numeric: tabular-nums; }
    thead th { background: #575759; color: #fff; }
    .section-head th { background: #a7a9ac; color: #222; }
    .section-subtotal th, .section-subtotal td { background: #f1b353; }
    tfoot th, tfoot td { background: #575759; color: #fff; }
    tr.rounded td[data-field="rawHours"], tr.rounded td[data-field="hours"] { font-weight: 700; }
  </style>
</head>
<body>
  <h1>Proposal audit</h1>
  <dl>
    <dt>Reference</dt><dd>${reference}</dd>
    <dt>Submitted</dt><dd>${submittedAt}</dd>
    <dt>Rate card</dt><dd>${rateCardVersion}</dd>
    <dt>Schema</dt><dd>${schemaVersion}</dd>
  </dl>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Count</th>
        <th>Minutes per unit</th>
        <th>Raw hours</th>
        <th>Hours</th>
      </tr>
    </thead>
    <tbody>
${groupRows}
    </tbody>
    <tfoot>
      <tr>
        <th colspan="4">Project total</th>
        <td data-field="totalProjectHours">${total}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>
`;
}

export async function findSubmissionByReference(reference) {
  return ProposalSubmission.findOne({ reference }).lean();
}

function sendAuditHeaders(res) {
  res.set('X-Robots-Tag', 'noindex');
  res.set('Cache-Control', 'no-store');
}

export function createAuditHandler(deps = {}) {
  const {
    findByReference = findSubmissionByReference,
    getAuditToken = () => process.env.PROPOSAL_AUDIT_TOKEN
  } = deps;

  return async function handleProposalAudit(req, res) {
    sendAuditHeaders(res);

    try {
      const expected = getAuditToken();
      if (!isAuditTokenConfigured(expected)) {
        res.status(404).end();
        return;
      }

      const presented = presentedAuditToken(req);
      if (!tokensEqual(presented, expected)) {
        res.status(404).end();
        return;
      }

      const submission = await findByReference(req.params.reference);
      if (!submission) {
        res.status(404).end();
        return;
      }

      res.status(200).type('html').send(renderAuditHtml(submission));
    } catch {
      if (!res.headersSent) res.status(500).end();
    }
  };
}

export const handleProposalAudit = createAuditHandler();
