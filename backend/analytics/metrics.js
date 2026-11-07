import { CHANNELS } from './classify.js';
import { dayKey, dayKeysBetween } from './time.js';

export const ENGAGED_SECONDS = 10;
export const DEEP_SCROLL_PCT = 75;
const INTENT_EVENTS = new Set(['cta_click', 'form_start', 'form_submit']);
const BRAND_SLUGS = ['lutron', 'vantage', 'rti', 'clipsal-c-bus'];

export const DEFINITIONS = {
  visitors: 'Unique visitors: distinct anonymous IDs (hash of a daily-rotating salt + IP + browser). The salt changes every day, so someone who returns on another day counts again.',
  sessions: 'Sessions: one browser tab visit. Ends when the tab is closed.',
  pageviews: 'Pageviews: every landing-page load, including reloads.',
  leads: 'Leads: homeowner inquiry forms saved in the database for the page(s) in view. This is the source of truth, even for visitors who block tracking.',
  conversionRate: 'Conversion rate: leads ÷ unique visitors.',
  engagementRate: `Engagement rate: share of sessions with at least ${ENGAGED_SECONDS} s of visible, focused time or a CTA click / form start / submit.`,
  bounceRate: 'Bounce rate: 100% minus engagement rate.',
  avgEngagedSec: 'Avg engaged time: visible + focused seconds per session.',
  scroll75Rate: `Deep scroll: share of sessions that scrolled at least ${DEEP_SCROLL_PCT}% of the page.`,
  ctaRate: 'CTA click-through: share of sessions that clicked a "Book a remote diagnostic" / "How it works" button.',
  formStartRate: 'Form start rate: share of sessions that focused a field in the inquiry form.',
  formCompletionRate: 'Form completion: sessions that submitted the form ÷ sessions that started it.',
  channels: 'Channel: from the first pageview of a session. Paid = cpc/ppc/paid utm_medium or an ad click id; Organic Search = search engine referrer; Social, Email and Referral by referrer or UTM; Direct = no referrer.',
  device: 'Device: from screen width (mobile under 768 px, tablet 768–1023 px, desktop 1024 px and up), counted per session.',
  funnel: 'Funnel: unique visitors at each step (Lead = inquiries saved). Visitors who opt out with Do Not Track are only counted as leads.'
};

export function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

export function sessionize(events, tz) {
  const sorted = [...events].sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const sessions = new Map();
  for (const ev of sorted) {
    let s = sessions.get(ev.sessionId);
    if (!s) {
      s = {
        id: ev.sessionId,
        visitors: new Set(),
        pageviews: 0,
        engagedSec: 0,
        maxScroll: 0,
        cta: false,
        formStart: false,
        formSubmit: false,
        channel: null,
        refHost: '',
        utm: null,
        device: 'unknown',
        day: null,
        landing: null
      };
      sessions.set(ev.sessionId, s);
    }
    switch (ev.name) {
      case 'pageview':
        s.pageviews += 1;
        if (ev.visitor) s.visitors.add(ev.visitor);
        if (!s.channel) {
          s.channel = ev.channel || 'Direct';
          s.refHost = ev.refHost || '';
          s.utm = ev.utm || null;
          s.device = ev.device || 'unknown';
          s.day = dayKey(new Date(ev.ts), tz);
          s.landing = `${ev.location}/${ev.brand}`;
        }
        break;
      case 'engagement':
        s.engagedSec += Math.max(0, Number(ev.engagedSec) || 0);
        s.maxScroll = Math.max(s.maxScroll, Number(ev.scrollPct) || 0);
        break;
      case 'cta_click': s.cta = true; break;
      case 'form_start': s.formStart = true; break;
      case 'form_submit': s.formSubmit = true; s.formStart = true; break;
      default: break;
    }
  }
  for (const s of sessions.values()) {
    s.engaged = s.engagedSec >= ENGAGED_SECONDS || s.cta || s.formStart || s.formSubmit;
  }
  return [...sessions.values()].filter((s) => s.pageviews > 0);
}

function distinctVisitors(sessions, predicate = () => true) {
  const set = new Set();
  for (const s of sessions) if (predicate(s)) for (const v of s.visitors) set.add(v);
  return set.size;
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

/** Core metric block for one scope (all pages, one location, one brand or one page). */
export function computeCore(events, leads) {
  const sessions = sessionize(events, 'UTC');
  return coreFromSessions(sessions, events, leads);
}

function coreFromSessions(sessions, events, leads) {
  const visitors = distinctVisitors(sessions);
  const n = sessions.length;
  const engaged = sessions.filter((s) => s.engaged).length;
  const cta = sessions.filter((s) => s.cta).length;
  const starts = sessions.filter((s) => s.formStart).length;
  const submits = sessions.filter((s) => s.formSubmit).length;
  const deep = sessions.filter((s) => s.maxScroll >= DEEP_SCROLL_PCT).length;
  const totalSec = sessions.reduce((sum, s) => sum + s.engagedSec, 0);
  const engagementRate = ratio(engaged, n);
  return {
    visitors,
    sessions: n,
    pageviews: events.filter((e) => e.name === 'pageview').length,
    leads: leads.length,
    engagedSessions: engaged,
    ctaSessions: cta,
    formStartSessions: starts,
    formSubmitSessions: submits,
    conversionRate: ratio(leads.length, visitors),
    engagementRate,
    bounceRate: engagementRate == null ? null : 1 - engagementRate,
    avgEngagedSec: ratio(totalSec, n),
    scroll75Rate: ratio(deep, n),
    ctaRate: ratio(cta, n),
    formStartRate: ratio(starts, n),
    formCompletionRate: ratio(submits, starts)
  };
}

function topList(map, limit, keyName) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
    .map(([key, count]) => ({ [keyName]: key, sessions: count }));
}

export function computeBlock(events, leads, { tz, start, end }) {
  const sessions = sessionize(events, tz);
  const core = coreFromSessions(sessions, events, leads);
  const bySession = new Map(sessions.map((s) => [s.id, s]));
  const leadChannel = (lead) => bySession.get(lead.sessionId)?.channel || 'Not tracked';

  const channelSessions = countBy(sessions, (s) => s.channel);
  const channelLeads = countBy(leads, leadChannel);
  const channelNames = [...CHANNELS, 'Not tracked'];
  const channels = channelNames
    .map((channel) => ({
      channel,
      sessions: channelSessions.get(channel) || 0,
      leads: channelLeads.get(channel) || 0
    }))
    .filter((c) => c.sessions > 0 || c.leads > 0)
    .sort((a, b) => b.sessions - a.sessions || b.leads - a.leads);

  const referrers = topList(
    countBy(sessions.filter((s) => s.refHost && s.channel !== 'Direct'), (s) => s.refHost),
    10,
    'host'
  );

  const campaignMap = new Map();
  for (const s of sessions) {
    if (!s.utm || !s.utm.campaign) continue;
    const key = `${s.utm.campaign}|${s.utm.source || ''}|${s.utm.medium || ''}`;
    const row = campaignMap.get(key) || {
      campaign: s.utm.campaign, source: s.utm.source || '', medium: s.utm.medium || '', sessions: 0, leads: 0
    };
    row.sessions += 1;
    campaignMap.set(key, row);
  }
  for (const lead of leads) {
    const s = bySession.get(lead.sessionId);
    if (!s || !s.utm || !s.utm.campaign) continue;
    const row = campaignMap.get(`${s.utm.campaign}|${s.utm.source || ''}|${s.utm.medium || ''}`);
    if (row) row.leads += 1;
  }
  const campaigns = [...campaignMap.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 10);

  const deviceCounts = countBy(sessions, (s) => s.device);
  const devices = ['mobile', 'tablet', 'desktop', 'unknown']
    .map((device) => ({ device, sessions: deviceCounts.get(device) || 0 }))
    .filter((d) => d.sessions > 0 || d.device !== 'unknown');

  const days = dayKeysBetween(start, end, tz);
  const seriesMap = new Map(days.map((day) => [day, {
    day, visitors: new Set(), sessions: 0, engaged: 0, pageviews: 0, leads: 0,
    cta: 0, formStart: 0, formSubmit: 0, deep: 0, engagedSec: 0
  }]));
  for (const s of sessions) {
    const row = seriesMap.get(s.day);
    if (!row) continue;
    row.sessions += 1;
    if (s.engaged) row.engaged += 1;
    if (s.cta) row.cta += 1;
    if (s.formStart) row.formStart += 1;
    if (s.formSubmit) row.formSubmit += 1;
    if (s.maxScroll >= DEEP_SCROLL_PCT) row.deep += 1;
    row.engagedSec += s.engagedSec;
  }
  for (const ev of events) {
    if (ev.name !== 'pageview') continue;
    const row = seriesMap.get(dayKey(new Date(ev.ts), tz));
    if (!row) continue;
    row.pageviews += 1;
    if (ev.visitor) row.visitors.add(ev.visitor);
  }
  for (const lead of leads) {
    const row = seriesMap.get(dayKey(new Date(lead.createdAt), tz));
    if (row) row.leads += 1;
  }
  const series = [...seriesMap.values()].map((row) => ({
    day: row.day,
    visitors: row.visitors.size,
    sessions: row.sessions,
    engagedSessions: row.engaged,
    pageviews: row.pageviews,
    leads: row.leads,
    conversionRate: ratio(row.leads, row.visitors.size),
    engagementRate: ratio(row.engaged, row.sessions),
    bounceRate: row.sessions > 0 ? 1 - row.engaged / row.sessions : null,
    avgEngagedSec: ratio(row.engagedSec, row.sessions),
    scroll75Rate: ratio(row.deep, row.sessions),
    ctaRate: ratio(row.cta, row.sessions),
    formStartRate: ratio(row.formStart, row.sessions),
    formCompletionRate: ratio(row.formSubmit, row.formStart)
  }));

  const funnel = [
    { key: 'visitors', label: 'Visitors', value: core.visitors },
    { key: 'engaged', label: 'Engaged', value: distinctVisitors(sessions, (s) => s.engaged) },
    { key: 'cta', label: 'CTA click', value: distinctVisitors(sessions, (s) => s.cta) },
    { key: 'formStart', label: 'Form start', value: distinctVisitors(sessions, (s) => s.formStart) },
    { key: 'lead', label: 'Lead', value: leads.length }
  ];

  const brandCounts = Object.fromEntries(BRAND_SLUGS.map((b) => [b, 0]));
  let hasFileYes = 0;
  let hasFileNo = 0;
  for (const lead of leads) {
    for (const b of Array.isArray(lead.brands) ? lead.brands : []) {
      if (b in brandCounts) brandCounts[b] += 1;
    }
    if (lead.hasFile === 'yes' || lead.hasFile === true) hasFileYes += 1;
    else if (lead.hasFile === 'no' || lead.hasFile === false) hasFileNo += 1;
  }

  return {
    ...core,
    channels,
    referrers,
    campaigns,
    devices,
    series,
    funnel,
    leadQuality: {
      brands: brandCounts,
      hasFileYes,
      hasFileNo,
      hasFileShare: ratio(hasFileYes, hasFileYes + hasFileNo)
    },
    leadChannel
  };
}

export const KPI_KEYS = [
  ['visitors', 'count'],
  ['sessions', 'count'],
  ['pageviews', 'count'],
  ['leads', 'count'],
  ['conversionRate', 'rate'],
  ['engagementRate', 'rate'],
  ['bounceRate', 'rate'],
  ['avgEngagedSec', 'seconds'],
  ['scroll75Rate', 'rate'],
  ['ctaRate', 'rate'],
  ['formStartRate', 'rate'],
  ['formCompletionRate', 'rate']
];

/** Counts compare as relative change; rates compare as percentage-point difference. */
export function compareKpi(current, previous, kind) {
  if (current == null) return { value: null, previous, change: null, changeType: kind === 'rate' ? 'points' : 'relative' };
  if (kind === 'rate') {
    return { value: current, previous, change: previous == null ? null : current - previous, changeType: 'points' };
  }
  return {
    value: current,
    previous,
    change: previous > 0 ? (current - previous) / previous : null,
    changeType: 'relative'
  };
}

export function compareCore(current, previous) {
  const kpis = {};
  for (const [key, kind] of KPI_KEYS) kpis[key] = { ...compareKpi(current[key], previous[key], kind), kind };
  return kpis;
}

export function filterEvents(events, { location, brand } = {}) {
  return events.filter((e) => (!location || e.location === location) && (!brand || e.brand === brand));
}

export function filterLeads(leads, { location, brand } = {}) {
  return leads.filter((l) => (!location || l.pageLocation === location) && (!brand || l.pageBrand === brand));
}

/** League table: one row per valid page, sorted by leads then visitors. */
export function computePageTable(pagesInfo, events, leads, prevEvents = [], prevLeads = []) {
  return pagesInfo.pages.map((page) => {
    const scope = { location: page.location, brand: page.brand };
    const cur = computeCore(filterEvents(events, scope), filterLeads(leads, scope));
    const prev = computeCore(filterEvents(prevEvents, scope), filterLeads(prevLeads, scope));
    return {
      location: page.location,
      brand: page.brand,
      path: page.path,
      visitors: cur.visitors,
      sessions: cur.sessions,
      pageviews: cur.pageviews,
      leads: cur.leads,
      conversionRate: cur.conversionRate,
      engagementRate: cur.engagementRate,
      ctaRate: cur.ctaRate,
      formStartRate: cur.formStartRate,
      avgEngagedSec: cur.avgEngagedSec,
      prevVisitors: prev.visitors,
      prevLeads: prev.leads
    };
  }).sort((a, b) => b.leads - a.leads || b.visitors - a.visitors || a.path.localeCompare(b.path));
}
