import { HomeownerInquiry } from '../models/HomeownerInquiry.js';
import { requireDb } from './db.js';

const LEAD_FIELDS = 'name city brands hasFile pageLocation pageBrand sessionId createdAt';

/** Leads are HomeownerInquiry documents — the source of truth for conversions. */
export async function fetchLeads(start, end, { location, brand } = {}, deps = {}) {
  const Model = deps.Model || HomeownerInquiry;
  requireDb(deps.isDbReady);
  const query = { createdAt: { $gte: start, $lt: end }, test: { $ne: true } };
  if (location) query.pageLocation = location;
  if (brand) query.pageBrand = brand;
  return Model.find(query, LEAD_FIELDS).sort({ createdAt: 1 }).lean();
}
