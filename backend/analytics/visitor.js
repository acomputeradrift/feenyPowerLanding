import { createHash, randomBytes } from 'node:crypto';

import { AnalyticsSalt } from '../models/AnalyticsEvent.js';
import { requireDb } from './db.js';
import { analyticsTz, dayKey } from './time.js';

// One random salt per local day, shared through Mongo so restarts and multiple
// processes hash the same visitor the same way. Old salts expire (TTL), after
// which a hash can no longer be linked back to an IP + UA.
const saltCache = new Map();

export async function saltForDay(day) {
  const hit = saltCache.get(day);
  if (hit) return hit;
  requireDb();
  let doc;
  try {
    doc = await AnalyticsSalt.findOneAndUpdate(
      { day },
      { $setOnInsert: { day, salt: randomBytes(32).toString('hex'), createdAt: new Date() } },
      { upsert: true, new: true, lean: true }
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
    doc = await AnalyticsSalt.findOne({ day }).lean();
  }
  if (!doc?.salt) throw new Error(`analytics salt for ${day} missing`);
  saltCache.clear();
  saltCache.set(day, doc.salt);
  return doc.salt;
}

export function visitorHash(salt, ip, userAgent) {
  return createHash('sha256').update(`${salt}|${ip}|${userAgent}`).digest('hex').slice(0, 32);
}

export function clientIp(req) {
  const forwarded = req.get?.('x-forwarded-for');
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  const real = req.get?.('x-real-ip');
  if (typeof real === 'string' && real.trim()) return real.trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export async function visitorFor(req, now = new Date()) {
  const salt = await saltForDay(dayKey(now, analyticsTz()));
  return visitorHash(salt, clientIp(req), req.get?.('user-agent') || '');
}
