import express from 'express';
import { estimateHours } from '../proposal/estimate.js';

const router = express.Router();

const ESTIMATE_WINDOW_MS = 60_000;
const ESTIMATE_MAX_PER_WINDOW = 120;
const estimateHits = new Map();

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function allowEstimate(ip) {
  const now = Date.now();
  const entry = estimateHits.get(ip);
  if (!entry || now - entry.startedAt >= ESTIMATE_WINDOW_MS) {
    estimateHits.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= ESTIMATE_MAX_PER_WINDOW;
}

router.post('/estimate', (req, res) => {
  if (!allowEstimate(clientIp(req))) {
    res.status(429).json({ error: 'rate_limited' });
    return;
  }
  const answers = req.body && req.body.answers;
  res.json(estimateHours(answers));
});

export default router;
export { allowEstimate, ESTIMATE_MAX_PER_WINDOW };
