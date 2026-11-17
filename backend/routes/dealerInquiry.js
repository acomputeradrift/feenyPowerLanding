import express from 'express';
import { DealerInquiry } from '../models/DealerInquiry.js';
import { isHoneypotFilled, validateDealerInquiry } from '../dealerInquiry/validate.js';
import { sendDealerInquiryEmail } from '../dealerInquiry/email.js';
import { isOwnerRequest } from './analytics.js';
import { allowHit, clientIp } from './homeownerInquiry.js';

async function saveInquiry(value) {
  return DealerInquiry.create(value);
}

async function markEmail(doc, status, error) {
  if (!doc || typeof doc.updateOne !== 'function') return;
  const update = { emailStatus: status };
  if (error) update.emailError = String(error).slice(0, 500);
  await doc.updateOne(update).catch(() => {});
}

/**
 * POST / — dealer lead from the dealer page. Same contract as the homeowner form:
 * 200 {ok:true} | 400 {error, field} | 429 {error} | 500 {error}
 */
export function createDealerInquiryRouter(deps = {}) {
  const router = express.Router();
  const allow = deps.allowHit || allowHit;
  const save = deps.save || saveInquiry;
  const sendEmail = deps.sendEmail || sendDealerInquiryEmail;
  const mark = deps.markEmail || markEmail;
  const isOwner = deps.isOwner || isOwnerRequest;

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

    const result = validateDealerInquiry(req.body);
    if (!result.ok) {
      res.status(400).json({ error: result.error, field: result.field });
      return;
    }

    if (isOwner(req)) result.value.test = true;

    let doc;
    try {
      doc = await save(result.value);
    } catch (error) {
      console.error('dealer-inquiry save failed', error);
      res.status(500).json({ error: 'Something went wrong. Please try again, or call me at 1-778-899-4809.' });
      return;
    }

    res.json({ ok: true });

    try {
      const sent = await sendEmail(doc && doc.toObject ? doc.toObject() : { ...result.value, createdAt: new Date() });
      await mark(doc, sent.delivered ? 'sent' : 'logged');
    } catch (error) {
      console.error('dealer-inquiry email failed', error);
      await mark(doc, 'failed', error.message);
    }
  });

  return router;
}

const dealerInquiryRoutes = createDealerInquiryRouter();
export default dealerInquiryRoutes;
