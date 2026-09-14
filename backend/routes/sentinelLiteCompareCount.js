import express from 'express';

import {
  incrementCompareCount,
  readCompareCount,
} from '../sentinelLite/compareCount.js';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const hits = new Map();

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function allowHit(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    hits.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_PER_WINDOW;
}

function sendCount(res, count) {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ count });
}

/**
 * Count-only Compare beacon for Sentinel Lite.
 * GET  → current total
 * POST → +1, return new total
 * Body is ignored. Never accepts files, names, paths, or changelog bodies.
 */
export function createSentinelLiteCompareCountRouter(deps = {}) {
  const router = express.Router();
  const read = deps.read || readCompareCount;
  const increment = deps.increment || incrementCompareCount;
  const allow = deps.allowHit || allowHit;

  router.get('/', async (_req, res) => {
    try {
      sendCount(res, await read());
    } catch (error) {
      console.error('sentinel_lite compare-count GET failed', error);
      res.status(500).json({ error: 'count unavailable' });
    }
  });

  router.post('/', async (req, res) => {
    if (!allow(clientIp(req))) {
      res.status(429).json({ error: 'too many requests' });
      return;
    }
    try {
      sendCount(res, await increment());
    } catch (error) {
      console.error('sentinel_lite compare-count POST failed', error);
      res.status(500).json({ error: 'count unavailable' });
    }
  });

  return router;
}

const sentinelLiteCompareCountRoutes = createSentinelLiteCompareCountRouter();
export default sentinelLiteCompareCountRoutes;
