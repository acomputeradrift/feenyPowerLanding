import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

import { HMAC_ENV, verifyFeedback } from '../ideaFeedback/verify.js';
import { upsertFeedback } from '../ideaFeedback/store.js';
import { sendFeedbackEmail } from '../ideaFeedback/email.js';

const frontendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../frontend');
const SUBMIT_WINDOW_MS = 15 * 60_000;
const SUBMIT_MAX_PER_WINDOW = 20;
const submitHits = new Map();

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function allowSubmit(ip) {
  const now = Date.now();
  const entry = submitHits.get(ip);
  if (!entry || now - entry.startedAt >= SUBMIT_WINDOW_MS) {
    submitHits.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= SUBMIT_MAX_PER_WINDOW;
}

function notFound(res) {
  res.status(404).type('text').send('Not found');
}

export function createIdeaFeedbackRouter(deps = {}) {
  const router = express.Router();
  router.use(express.urlencoded({ extended: false }));

  const secretFor = () => deps.secret ?? process.env[HMAC_ENV] ?? '';
  const upsert = deps.upsert || upsertFeedback;
  const sendEmail = deps.sendEmail || sendFeedbackEmail;
  const pages = deps.frontendDir || frontendDir;

  router.get('/', (req, res) => {
    if (!verifyFeedback(req.query, secretFor())) {
      notFound(res);
      return;
    }
    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.sendFile(path.join(pages, 'idea_feedback.html'));
  });

  router.get('/thanks', (req, res) => {
    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.sendFile(path.join(pages, 'idea_feedback_thanks.html'));
  });

  router.post('/', async (req, res) => {
    if (!allowSubmit(clientIp(req))) {
      res.status(429).type('text').send('Try again later');
      return;
    }
    const feedback = verifyFeedback(req.body, secretFor());
    if (!feedback) {
      notFound(res);
      return;
    }
    try {
      await upsert(feedback);
    } catch {
      res.status(500).type('text').send('Could not save feedback');
      return;
    }
    try {
      await sendEmail(feedback);
    } catch (err) {
      console.error('idea feedback email failed:', err.message);
    }
    res.redirect(303, '/idea-feedback/thanks');
  });

  return router;
}

const ideaFeedbackRoutes = createIdeaFeedbackRouter();
export default ideaFeedbackRoutes;
