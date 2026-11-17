import { HomeownerInquiry } from '../models/HomeownerInquiry.js';
import { ProposalSubmission } from '../models/ProposalSubmission.js';
import { DealerInquiry } from '../models/DealerInquiry.js';
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
  const InquiryModel = deps.InquiryModel || DealerInquiry;
  requireDb(deps.isDbReady);
  const [docs, inquiries] = await Promise.all([
    Model.find(
      { submittedAt: { $gte: start, $lt: end } },
      'contractorName projectPoName submittedAt'
    ).sort({ submittedAt: 1 }).lean(),
    // Dealer page form (/consultation): carries a session id, so its channel is known.
    InquiryModel.find(
      { createdAt: { $gte: start, $lt: end }, test: { $ne: true } },
      'name company platforms sessionId createdAt'
    ).sort({ createdAt: 1 }).lean()
  ]);
  const fromPage = inquiries.map((d) => ({
    name: d.name || '',
    city: d.company || '',
    brands: [],
    hasFile: '',
    pageLocation: 'dealer',
    pageBrand: 'consultation',
    sessionId: d.sessionId || null,
    createdAt: d.createdAt
  }));
  return docs.map((d) => ({
    name: d.contractorName || '',
    city: d.projectPoName || '',
    brands: [],
    hasFile: '',
    pageLocation: 'dealer',
    pageBrand: 'rti-proposal',
    sessionId: null,
    createdAt: d.submittedAt
  })).concat(fromPage).sort((x, y) => new Date(x.createdAt) - new Date(y.createdAt));
}
