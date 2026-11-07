import express from 'express';
import { HomeownerInquiry } from '../models/HomeownerInquiry.js';
import { isHoneypotFilled, validateInquiry } from '../homeownerInquiry/validate.js';
import { sendInquiryEmail } from '../homeownerInquiry/email.js';

const WINDOW_MS = 15 * 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * `trust proxy` is not enabled app-wide, so behind the local nginx every
 * request has a loopback req.ip. Only then is X-Forwarded-For trusted, and only
 * its last hop (the address nginx itself saw).
 */
function clientIp(req) {
  const remote = req.socket?.remoteAddress || req.ip || 'unknown';
  const forwarded = req.get('x-forwarded-for');
  if (LOOPBACK.has(remote) && forwarded) {
    const hops = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return remote;
}

function allowHit(ip) {
  const now = Date.now();
  if (hits.size > 10_000) {
    for (const [key, entry] of hits) {
      if (now - entry.startedAt >= WINDOW_MS) hits.delete(key);
    }
  }
  const entry = hits.get(ip);
  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    hits.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_PER_WINDOW;
}

async function saveInquiry(value) {
  return HomeownerInquiry.create(value);
}

async function markEmail(doc, status, error) {
  if (!doc || typeof doc.updateOne !== 'function') return;
  const update = { emailStatus: status };
  if (error) update.emailError = String(error).slice(0, 500);
  await doc.updateOne(update).catch(() => {});
}

/**
 * POST / — homeowner lead from the /{location}/{brand} pages.
 * 200 {ok:true} | 400 {error, field} | 429 {error} | 500 {error}
 */
export function createHomeownerInquiryRouter(deps = {}) {
  const router = express.Router();
  const allow = deps.allowHit || allowHit;
  const save = deps.save || saveInquiry;
  const sendEmail = deps.sendEmail || sendInquiryEmail;
  const mark = deps.markEmail || markEmail;

  router.post('/', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    if (!allow(clientIp(req))) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return;
    }

    if (isHoneypotFilled(req.body)) {
      res.json({ ok: true });
      return;
    }

    const result = validateInquiry(req.body);
    if (!result.ok) {
      res.status(400).json({ error: result.error, field: result.field });
      return;
    }

    let doc;
    try {
      doc = await save(result.value);
    } catch (error) {
      console.error('homeowner-inquiry save failed', error);
      res.status(500).json({ error: 'Something went wrong. Please try again or email me directly.' });
      return;
    }

    res.json({ ok: true });

    try {
      const sent = await sendEmail(doc && doc.toObject ? doc.toObject() : { ...result.value, createdAt: new Date() });
      await mark(doc, sent.delivered ? 'sent' : 'logged');
    } catch (error) {
      console.error('homeowner-inquiry email failed', error);
      await mark(doc, 'failed', error.message);
    }
  });

  return router;
}

const homeownerInquiryRoutes = createHomeownerInquiryRouter();
export default homeownerInquiryRoutes;
export { allowHit, clientIp, MAX_PER_WINDOW, WINDOW_MS };
