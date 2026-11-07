import { classifyChannel, deviceClass, isBotUserAgent, refererHost } from './classify.js';
import { isValidPage } from './pages.js';

export const EVENT_NAMES = new Set(['pageview', 'engagement', 'cta_click', 'form_start', 'form_submit', 'faq_open']);
export const MAX_EVENT_BYTES = 4 * 1024;
const SESSION_ID = /^[A-Za-z0-9_-]{8,64}$/;
const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'];
const PROP_LIMITS = { cta_click: { id: 64 }, faq_open: { q: 160 } };

function cleanString(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

function cleanReferrer(value) {
  const raw = cleanString(value, 500);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch {
    return '';
  }
}

export function parseBody(body) {
  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > MAX_EVENT_BYTES) return null;
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  if (body && typeof body === 'object') {
    try {
      if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_EVENT_BYTES) return null;
    } catch {
      return null;
    }
    return body;
  }
  return null;
}

/**
 * Validate a raw beacon and turn it into an AnalyticsEvent document (minus the
 * visitor hash, which needs the request). Returns { error } or { doc }.
 */
export function normalizeEvent(payload, { pagesInfo, userAgent = '', siteHost = '', now = new Date() }) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { error: 'invalid' };
  if (isBotUserAgent(userAgent)) return { ignore: 'bot' };

  const name = cleanString(payload.n ?? payload.name, 32);
  if (!EVENT_NAMES.has(name)) return { error: 'unknown_event' };

  const sessionId = cleanString(payload.sid ?? payload.sessionId, 64);
  if (!SESSION_ID.test(sessionId)) return { error: 'invalid_session' };

  const location = cleanString(payload.loc ?? payload.location, 40);
  const brand = cleanString(payload.brand, 40);
  if (!isValidPage(pagesInfo, location, brand)) return { error: 'unknown_page' };

  const doc = { ts: now, name, sessionId, path: `/${location}/${brand}`, location, brand };

  if (name === 'pageview') {
    const utmIn = payload.utm && typeof payload.utm === 'object' ? payload.utm : {};
    const utm = {};
    for (const key of UTM_KEYS) {
      const v = cleanString(utmIn[key], 100).toLowerCase();
      if (v) utm[key] = v;
    }
    const referrer = cleanReferrer(payload.ref ?? payload.referrer);
    const host = refererHost(referrer);
    doc.referrer = referrer;
    doc.refHost = host;
    doc.utm = utm;
    doc.channel = classifyChannel({
      referrer,
      utm,
      gclid: payload.gclid === true,
      msclkid: payload.msclkid === true,
      siteHost
    });
    if (doc.channel === 'Direct') {
      doc.refHost = '';
      doc.referrer = '';
    }
    doc.device = deviceClass(payload.sw);
  }

  if (name === 'engagement') {
    const secs = Number(payload.secs);
    const scroll = Number(payload.scroll);
    doc.engagedSec = Number.isFinite(secs) ? Math.min(Math.max(Math.round(secs), 0), 3600) : 0;
    doc.scrollPct = Number.isFinite(scroll) ? Math.min(Math.max(Math.round(scroll), 0), 100) : 0;
  }

  const limits = PROP_LIMITS[name];
  if (limits && payload.props && typeof payload.props === 'object') {
    const props = {};
    for (const [key, max] of Object.entries(limits)) {
      const v = cleanString(payload.props[key], max);
      if (v) props[key] = v;
    }
    if (Object.keys(props).length) doc.props = props;
  }

  return { doc };
}
