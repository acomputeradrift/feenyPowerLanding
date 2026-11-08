import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { DataUnavailableError, requireDb } from '../analytics/db.js';
import { MAX_EVENT_BYTES, normalizeEvent, parseBody } from '../analytics/ingest.js';
import { loadPages } from '../analytics/pages.js';
import { buildSummary } from '../analytics/summary.js';
import { clientIp, visitorFor } from '../analytics/visitor.js';
import { tokensEqual } from '../proposal/audit.js';

const DASHBOARD_HTML = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/analytics.html');
const COOKIE_NAME = 'fpc_analytics';
const COOKIE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 120;
const hits = new Map();

const DASHBOARD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'none'",
  "frame-ancestors 'none'"
].join('; ');

function allowHit(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    if (hits.size > 10_000) hits.clear();
    hits.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_PER_WINDOW;
}

let lastSaveFailureLog = 0;

function logSaveFailure(error) {
  const now = Date.now();
  if (now - lastSaveFailureLog < 60_000) return;
  lastSaveFailureLog = now;
  console.error('[analytics] event not saved:', error?.message || error);
}

function isMongoUnavailable(error) {
  const name = error?.name || '';
  return /MongooseServerSelectionError|MongoNetworkError|MongoServerSelectionError/.test(name)
    || /buffering timed out/i.test(error?.message || '');
}

function cookieValue(token) {
  return createHash('sha256').update(`fpc-analytics|${token}`).digest('hex');
}

function readCookie(req, name) {
  const header = req.get('cookie');
  if (!header) return '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0 && part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return '';
}

function queryToken(req) {
  const q = req.query?.token;
  if (typeof q === 'string') return q;
  if (Array.isArray(q) && typeof q[0] === 'string') return q[0];
  return '';
}

function isSecure(req) {
  return req.secure || req.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production';
}

function isAuthorized(req, expected) {
  const header = req.get('x-analytics-token');
  if (typeof header === 'string' && header && tokensEqual(header, expected)) return true;
  const cookie = readCookie(req, COOKIE_NAME);
  return Boolean(cookie) && tokensEqual(cookie, cookieValue(expected));
}

function privateHeaders(res) {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
}

export function createAnalyticsDashboardHandler({ getToken = () => process.env.ANALYTICS_DASHBOARD_TOKEN } = {}) {
  return function handleAnalyticsDashboard(req, res) {
    privateHeaders(res);
    const expected = getToken();
    if (typeof expected !== 'string' || !expected) {
      res.status(404).end();
      return;
    }
    const presented = queryToken(req);
    if (presented) {
      if (!tokensEqual(presented, expected)) {
        res.status(404).end();
        return;
      }
      res.cookie(COOKIE_NAME, cookieValue(expected), {
        httpOnly: true,
        // Lax, not Strict: a token link tapped in Mail or Messages is a cross-site
        // navigation, and Strict would drop the cookie on the redirect below.
        sameSite: 'lax',
        secure: isSecure(req),
        maxAge: COOKIE_MAX_AGE_MS,
        path: '/'
      });
      const params = new URLSearchParams(req.query);
      params.delete('token');
      const qs = params.toString();
      res.redirect(302, `/analytics${qs ? `?${qs}` : ''}`);
      return;
    }
    if (!isAuthorized(req, expected)) {
      res.status(404).end();
      return;
    }
    res.set('Content-Security-Policy', DASHBOARD_CSP);
    res.sendFile(DASHBOARD_HTML);
  };
}

export function createAnalyticsRouter(deps = {}) {
  const router = express.Router();
  const getToken = deps.getToken || (() => process.env.ANALYTICS_DASHBOARD_TOKEN);
  const getPages = deps.loadPages || loadPages;
  const save = deps.saveEvent || (async (doc) => {
    requireDb();
    await AnalyticsEvent.create(doc);
  });
  const getVisitor = deps.visitorFor || visitorFor;
  const summarize = deps.buildSummary || buildSummary;
  const allow = deps.allowHit || allowHit;

  router.post('/event', express.text({ type: 'text/plain', limit: MAX_EVENT_BYTES }), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!allow(clientIp(req))) {
      res.status(429).end();
      return;
    }
    if (req.get('dnt') === '1' || req.get('sec-gpc') === '1') {
      res.status(204).end();
      return;
    }
    const payload = parseBody(req.body);
    if (!payload) {
      res.status(400).json({ error: 'invalid' });
      return;
    }
    try {
      const pagesInfo = await getPages();
      const result = normalizeEvent(payload, {
        pagesInfo,
        userAgent: req.get('user-agent') || '',
        siteHost: req.hostname || ''
      });
      if (result.ignore) {
        res.status(204).end();
        return;
      }
      if (result.error) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.status(204).end();
      persist(result.doc, req).catch(logSaveFailure);
    } catch (error) {
      logSaveFailure(error);
      if (!res.headersSent) res.status(204).end();
    }
  });

  // Runs after the 204 has gone out, so a slow or down DB never holds the beacon.
  async function persist(doc, req) {
    if (doc.name === 'pageview') doc.visitor = await getVisitor(req, doc.ts);
    await save(doc);
  }

  router.get('/summary', async (req, res) => {
    privateHeaders(res);
    const expected = getToken();
    if (typeof expected !== 'string' || !expected || !isAuthorized(req, expected)) {
      res.status(404).end();
      return;
    }
    try {
      const summary = await summarize({
        range: req.query.range,
        location: typeof req.query.location === 'string' ? req.query.location : '',
        brand: typeof req.query.brand === 'string' ? req.query.brand : ''
      });
      res.json(summary);
    } catch (error) {
      if (error instanceof DataUnavailableError || isMongoUnavailable(error)) {
        console.error('[analytics] summary unavailable:', error.message);
        res.status(503).json({ error: 'data_unavailable' });
        return;
      }
      console.error('[analytics] summary failed', error);
      res.status(500).json({ error: 'summary_failed' });
    }
  });

  return router;
}

export const handleAnalyticsDashboard = createAnalyticsDashboardHandler();
const analyticsRoutes = createAnalyticsRouter();
export default analyticsRoutes;
