import express from 'express';
import { estimateHours } from '../proposal/estimate.js';
import { processSubmission } from '../proposal/submit.js';
import { createAuditHandler, handleProposalAudit } from '../proposal/audit.js';

const ESTIMATE_WINDOW_MS = 60_000;
const ESTIMATE_MAX_PER_WINDOW = 120;
const SUBMIT_WINDOW_MS = 15 * 60_000;
const SUBMIT_MAX_PER_WINDOW = 10;
const MAX_SUBMIT_BYTES = 100 * 1024;

const estimateHits = new Map();
const submitHits = new Map();

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function allowWithinWindow(store, ip, windowMs, max) {
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry || now - entry.startedAt >= windowMs) {
    store.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

function allowEstimate(ip) {
  return allowWithinWindow(estimateHits, ip, ESTIMATE_WINDOW_MS, ESTIMATE_MAX_PER_WINDOW);
}

function allowSubmit(ip) {
  return allowWithinWindow(submitHits, ip, SUBMIT_WINDOW_MS, SUBMIT_MAX_PER_WINDOW);
}

function payloadTooLarge(req) {
  const headerLength = Number(req.headers['content-length']);
  if (Number.isFinite(headerLength) && headerLength > MAX_SUBMIT_BYTES) return true;
  try {
    return Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8') > MAX_SUBMIT_BYTES;
  } catch {
    return true;
  }
}

export function createProposalRouter(submitDeps = {}) {
  const router = express.Router();

  router.post('/estimate', (req, res) => {
    if (!allowEstimate(clientIp(req))) {
      res.status(429).json({ error: 'rate_limited' });
      return;
    }
    const answers = req.body && req.body.answers;
    res.json(estimateHours(answers));
  });

  router.post('/', async (req, res) => {
    if (!allowSubmit(clientIp(req))) {
      res.status(429).json({ error: 'rate_limited' });
      return;
    }
    if (payloadTooLarge(req)) {
      res.status(413).json({ error: 'payload_too_large' });
      return;
    }
    try {
      const result = await processSubmission(req.body, {
        ip: clientIp(req),
        userAgent: req.get('user-agent')
      }, submitDeps);
      res.status(result.status).json(result.body);
    } catch {
      res.status(500).json({ error: 'submit_failed' });
    }
  });

  return router;
}

const proposalRoutes = createProposalRouter();
export default proposalRoutes;
export {
  allowEstimate,
  allowSubmit,
  ESTIMATE_MAX_PER_WINDOW,
  SUBMIT_MAX_PER_WINDOW,
  MAX_SUBMIT_BYTES,
  createAuditHandler,
  handleProposalAudit
};
