import { HomeownerInquiry } from '../models/HomeownerInquiry.js';
import { ProposalSubmission } from '../models/ProposalSubmission.js';
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

/**
 * Dealer leads are budget-form submissions (ProposalSubmission), shaped like
 * homeowner leads so the same metrics apply. They carry no session id, so their
 * channel shows as "Not tracked"; the form_submit event covers attribution.
 */
export async function fetchDealerLeads(start, end, deps = {}) {
  const Model = deps.Model || ProposalSubmission;
  requireDb(deps.isDbReady);
  const docs = await Model.find(
    { submittedAt: { $gte: start, $lt: end } },
    'contractorName projectPoName submittedAt'
  ).sort({ submittedAt: 1 }).lean();
  return docs.map((d) => ({
    name: d.contractorName || '',
    city: d.projectPoName || '',
    brands: [],
    hasFile: '',
    pageLocation: 'dealer',
    pageBrand: 'rti-proposal',
    sessionId: null,
    createdAt: d.submittedAt
  }));
}
