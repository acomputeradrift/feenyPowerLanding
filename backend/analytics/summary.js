import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { requireDb } from './db.js';
import { fetchLeads } from './leads.js';
import {
  DEFINITIONS,
  compareCore,
  computeBlock,
  computeCore,
  computePageTable,
  filterEvents,
  filterLeads
} from './metrics.js';
import { loadPages, pageLabel } from './pages.js';
import { analyticsTz, rangeBounds } from './time.js';

export const RANGES = [7, 28, 90];

const EVENT_PROJECTION = {
  _id: 0, ts: 1, name: 1, sessionId: 1, visitor: 1, location: 1, brand: 1,
  refHost: 1, channel: 1, utm: 1, device: 1, engagedSec: 1, scrollPct: 1
};

export async function fetchEvents(start, end) {
  requireDb();
  return AnalyticsEvent.find({ ts: { $gte: start, $lt: end }, test: { $ne: true } }, EVENT_PROJECTION).lean();
}

export function parseRange(value) {
  const n = Number(value);
  return RANGES.includes(n) ? n : 28;
}

function iso(d) {
  return d.toISOString();
}

/**
 * Build everything the dashboard needs for one range + optional location/brand
 * filter. Pure computation lives in metrics.js; this only fetches and assembles.
 */
export async function buildSummary({ range = 28, location = '', brand = '', now = new Date(), deps = {} } = {}) {
  const tz = deps.tz || analyticsTz();
  const pagesInfo = deps.pagesInfo || await loadPages();
  const getEvents = deps.fetchEvents || fetchEvents;
  const getLeads = deps.fetchLeads || fetchLeads;

  const days = parseRange(range);
  const loc = pagesInfo.locations.some((l) => l.slug === location) ? location : '';
  const br = pagesInfo.brands.some((b) => b.slug === brand) ? brand : '';
  const filter = { location: loc, brand: br };
  const { start, end, prevStart, prevEnd } = rangeBounds(days, now, tz);

  const [allEvents, allPrevEvents, allLeads, allPrevLeads] = await Promise.all([
    getEvents(start, end),
    getEvents(prevStart, prevEnd),
    getLeads(start, end),
    getLeads(prevStart, prevEnd)
  ]);

  const events = filterEvents(allEvents, filter);
  const leads = filterLeads(allLeads, filter);
  const prevEvents = filterEvents(allPrevEvents, filter);
  const prevLeads = filterLeads(allPrevLeads, filter);

  const block = computeBlock(events, leads, { tz, start, end });
  const prevBlock = computeBlock(prevEvents, prevLeads, { tz, start: prevStart, end: prevEnd });
  const kpis = compareCore(block, computeCore(prevEvents, prevLeads));

  const pageTable = computePageTable(pagesInfo, allEvents, allLeads, allPrevEvents, allPrevLeads)
    .map((row) => ({ ...row, label: pageLabel(pagesInfo, row.location, row.brand) }));

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map((lead) => ({
      createdAt: new Date(lead.createdAt).toISOString(),
      name: lead.name || '',
      city: lead.city || '',
      brands: Array.isArray(lead.brands) ? lead.brands : [],
      hasFile: lead.hasFile || '',
      page: lead.pageLocation && lead.pageBrand ? pageLabel(pagesInfo, lead.pageLocation, lead.pageBrand) : '',
      channel: block.leadChannel(lead)
    }));

  return {
    generatedAt: iso(now),
    tz,
    range: days,
    filter,
    period: { start: iso(start), end: iso(end) },
    previous: { start: iso(prevStart), end: iso(prevEnd) },
    kpis,
    series: block.series,
    previousSeries: prevBlock.series,
    funnel: block.funnel,
    channels: block.channels,
    referrers: block.referrers,
    campaigns: block.campaigns,
    devices: block.devices,
    leadQuality: block.leadQuality,
    pages: pageTable,
    recentLeads,
    locations: pagesInfo.locations,
    brands: pagesInfo.brands,
    validPages: pagesInfo.pages,
    definitions: DEFINITIONS
  };
}
