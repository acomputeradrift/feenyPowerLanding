import express from 'express';

import { processRetailEnquiry } from '../retail/enquiry.js';
import { renderEnquiryResultPage, resultBackLink, resultMessage } from '../retail/resultPage.js';
import { DELIVERY_MESSAGES } from '../retail/messages.js';

export const MAX_ENQUIRY_BYTES = 20 * 1024;
const WINDOW_MS = 15 * 60_000;
const MAX_PER_WINDOW = 5;

export function createAllowSubmit({ windowMs = WINDOW_MS, max = MAX_PER_WINDOW } = {}) {
  const hits = new Map();
  return function allowSubmit(ip) {
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now - entry.startedAt >= windowMs) {
      hits.set(ip, { startedAt: now, count: 1 });
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
  };
}

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function wantsHtml(req) {
  if (req.is('application/json') || req.is('json')) return false;
  const accept = req.get('accept') || '';
  return accept.includes('text/html');
}

function respond(req, res, result) {
  res.set('Cache-Control', 'no-store');
  if (!wantsHtml(req)) {
    res.status(result.status).json(result.body);
    return;
  }
  const sent = result.body?.delivered === true && result.body?.ok === true;
  const message = resultMessage(result);
  res.status(result.status);
  res.set('X-Robots-Tag', 'noindex');
  res.type('html').send(renderEnquiryResultPage({
    sent,
    message,
    back: resultBackLink(req.body),
  }));
}

export function createRetailEnquiryRouter(deps = {}) {
  const router = express.Router();
  router.use(express.urlencoded({ extended: false, limit: MAX_ENQUIRY_BYTES }));
  const allow = deps.allowSubmit || createAllowSubmit();
  const process = deps.processRetailEnquiry || processRetailEnquiry;

  router.post('/', async (req, res) => {
    if (!allow(clientIp(req))) {
      respond(req, res, {
        status: 429,
        body: { error: 'rate_limited', delivered: false },
      });
      return;
    }

    const headerLength = Number(req.headers['content-length']);
    if (Number.isFinite(headerLength) && headerLength > MAX_ENQUIRY_BYTES) {
      respond(req, res, {
        status: 413,
        body: { error: 'payload_too_large', delivered: false },
      });
      return;
    }

    try {
      if (Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8') > MAX_ENQUIRY_BYTES) {
        respond(req, res, {
          status: 413,
          body: { error: 'payload_too_large', delivered: false },
        });
        return;
      }
    } catch {
      respond(req, res, {
        status: 400,
        body: { error: 'validation_failed', delivered: false, message: DELIVERY_MESSAGES.validationIntro },
      });
      return;
    }

    try {
      const result = await process(req.body, deps);
      respond(req, res, result);
    } catch {
      respond(req, res, {
        status: 502,
        body: { error: 'delivery_failed', delivered: false },
      });
    }
  });

  router.use((err, req, res, next) => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      respond(req, res, {
        status: 413,
        body: { error: 'payload_too_large', delivered: false },
      });
      return;
    }
    next(err);
  });

  return router;
}

export default createRetailEnquiryRouter();
