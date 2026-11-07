import mongoose from 'mongoose';

import { AnalyticsReportLog } from '../models/AnalyticsEvent.js';
import { isAnalyticsEmailEnabled, reportRecipients, sendReportEmail } from './email.js';
import { fetchLeads } from './leads.js';
import { compareCore, computeBlock, computeCore, computePageTable } from './metrics.js';
import { loadPages, pageLabel } from './pages.js';
import { fetchEvents } from './summary.js';
import { analyticsTz, previousIsoWeek } from './time.js';

const MIN_VISITORS_FOR_WORST = 5;

export function dashboardUrl(env = process.env) {
  const base = (env.ANALYTICS_PUBLIC_URL || 'https://www.feenypowerandcontrol.com').replace(/\/+$/, '');
  return `${base}/analytics?range=7`;
}

export async function buildWeeklyReportData({ now = new Date(), deps = {} } = {}) {
  const tz = deps.tz || analyticsTz();
  const pagesInfo = deps.pagesInfo || await loadPages();
  const getEvents = deps.fetchEvents || fetchEvents;
  const getLeads = deps.fetchLeads || fetchLeads;
  const week = previousIsoWeek(now, tz);

  const [events, prevEvents, leads, prevLeads] = await Promise.all([
    getEvents(week.start, week.end),
    getEvents(week.prevStart, week.prevEnd),
    getLeads(week.start, week.end),
    getLeads(week.prevStart, week.prevEnd)
  ]);

  const block = computeBlock(events, leads, { tz, start: week.start, end: week.end });
  const kpis = compareCore(block, computeCore(prevEvents, prevLeads));
  const pages = computePageTable(pagesInfo, events, leads, prevEvents, prevLeads)
    .map((row) => ({ ...row, label: pageLabel(pagesInfo, row.location, row.brand) }));

  const best = pages.find((p) => p.leads > 0) || null;
  const candidates = pages.filter((p) => p.visitors >= MIN_VISITORS_FOR_WORST && p !== best);
  const worst = candidates.length
    ? [...candidates].sort((a, b) => (a.conversionRate ?? 0) - (b.conversionRate ?? 0)
      || (a.engagementRate ?? 0) - (b.engagementRate ?? 0)
      || b.visitors - a.visitors)[0]
    : null;

  let headline;
  if (block.leads > 0 && best) {
    headline = `${best.label} produced ${best.leads} of ${block.leads} lead${block.leads === 1 ? '' : 's'}.`;
  } else if (block.visitors > 0) {
    headline = `No leads this week from ${block.visitors} visitor${block.visitors === 1 ? '' : 's'}.`;
  } else {
    headline = 'No visits or leads recorded this week.';
  }

  return {
    week,
    tz,
    kpis,
    pages,
    channels: block.channels,
    best,
    worst,
    headline,
    dashboardUrl: dashboardUrl()
  };
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function fmtPct(v, digits = 1) {
  return v == null ? '—' : `${(v * 100).toFixed(digits)}%`;
}

export function fmtSecs(v) {
  if (v == null) return '—';
  const s = Math.round(v);
  return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

function fmtValue(kpi) {
  if (kpi.kind === 'rate') return fmtPct(kpi.value);
  if (kpi.kind === 'seconds') return fmtSecs(kpi.value);
  return kpi.value == null ? '—' : String(kpi.value);
}

// Text colours stay at #575759 or darker for contrast; the brand green/orange
// only colour the arrow glyph.
function fmtChange(kpi, invert = false) {
  if (kpi.change == null) {
    return kpi.previous === 0 && kpi.value > 0
      ? { text: 'new', color: '#2d9639', arrow: '', arrowColor: '' }
      : { text: '—', color: '#575759', arrow: '', arrowColor: '' };
  }
  const up = kpi.change > 0;
  const flat = Math.abs(kpi.change) < 1e-9;
  const good = invert ? !up : up;
  const text = kpi.changeType === 'points'
    ? `${up ? '+' : ''}${(kpi.change * 100).toFixed(1)} pts`
    : `${up ? '+' : ''}${Math.round(kpi.change * 100)}%`;
  if (flat) return { text: '0%', color: '#575759', arrow: '', arrowColor: '' };
  return {
    text,
    color: good ? '#2d9639' : '#333333',
    arrow: up ? '▲' : '▼',
    arrowColor: good ? '#39b54a' : '#FF8C00'
  };
}

function changeText(change) {
  return change.arrow ? `${change.arrow} ${change.text}` : change.text;
}

/**
 * Fluid-hybrid row: inline-block cells that sit side by side on desktop and
 * wrap to 2×2 / one column on phones. Outlook (no max-width) gets a ghost table.
 */
function stackRow(cells, cellWidth) {
  const ghostOpen = `<!--[if mso]><table role="presentation" width="${cellWidth * cells.length}" cellpadding="0" cellspacing="0" border="0"><tr><td width="${cellWidth}" valign="top"><![endif]-->`;
  const ghostSplit = `<!--[if mso]></td><td width="${cellWidth}" valign="top"><![endif]-->`;
  const ghostClose = '<!--[if mso]></td></tr></table><![endif]-->';
  const wrapped = cells.map((html) => `<div class="stack" style="display:inline-block;vertical-align:top;width:100%;max-width:${cellWidth}px;">${html}</div>`);
  return `<td style="font-size:0;line-height:0;text-align:left;">${ghostOpen}${wrapped.join(ghostSplit)}${ghostClose}</td>`;
}

function fmtDate(d, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: 'short', day: 'numeric' }).format(d);
}

export function weekLabel(data) {
  const lastDay = new Date(data.week.end.getTime() - 1);
  return `${fmtDate(data.week.start, data.tz)} – ${fmtDate(lastDay, data.tz)}`;
}

function bar(value, max, color) {
  const track = 'background:#f4f4f5;height:8px;line-height:8px;font-size:0;';
  const pct = value > 0 && max > 0 ? Math.min(100, Math.max(3, Math.round((value / max) * 100))) : 0;
  if (!pct) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>`
      + `<td style="${track}border-radius:4px;">&nbsp;</td></tr></table>`;
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>`
    + `<td width="${pct}%" style="background:${color};height:8px;line-height:8px;font-size:0;border-radius:4px;">&nbsp;</td>`
    + `${pct < 100 ? `<td style="${track}">&nbsp;</td>` : ''}</tr></table>`;
}

export function renderWeeklyReportHtml(data) {
  const font = "Rubik, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  const k = data.kpis;
  const cards = [
    ['Visitors', k.visitors],
    ['Leads', k.leads],
    ['Conversion', k.conversionRate],
    ['Engagement', k.engagementRate]
  ].map(([label, kpi]) => {
    const change = fmtChange(kpi);
    const arrow = change.arrow ? `<span style="color:${change.arrowColor};">${change.arrow}</span> ` : '';
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:8px;border-top:4px solid ${label === 'Leads' ? '#fcb040' : '#39b54a'};">
        <tr><td style="padding:12px 14px 4px;font:500 12px ${font};line-height:1.4;color:#575759;text-transform:uppercase;letter-spacing:.04em;">${esc(label)}</td></tr>
        <tr><td style="padding:0 14px;font:500 26px ${font};line-height:1.2;color:#222;">${esc(fmtValue(kpi))}</td></tr>
        <tr><td style="padding:2px 14px 12px;font:500 12px ${font};line-height:1.4;color:${change.color};">${arrow}${esc(change.text)} <span style="color:#575759;">vs prior week</span></td></tr>
      </table></td></tr></table>`;
  });

  const maxLeads = Math.max(1, ...data.pages.map((p) => p.leads));
  const pageRows = data.pages.map((p, i) => `<tr style="background:${i % 2 ? '#f4f4f5' : '#ffffff'};">
      <td style="padding:8px 10px;font:500 13px ${font};color:#333;">${esc(p.label)}</td>
      <td align="right" style="padding:8px 10px;font:500 13px ${font};color:#333;">${p.visitors}</td>
      <td style="padding:8px 10px;font:500 13px ${font};color:#222;" width="110">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="22" style="font:500 13px ${font};color:#222;">${p.leads}</td>
          <td>${bar(p.leads, maxLeads, '#fcb040')}</td>
        </tr></table>
      </td>
      <td align="right" style="padding:8px 10px;font:500 13px ${font};color:#333;">${esc(fmtPct(p.conversionRate))}</td>
      <td align="right" style="padding:8px 10px;font:500 13px ${font};color:#333;">${esc(fmtPct(p.engagementRate, 0))}</td>
    </tr>`).join('');

  const maxChannel = Math.max(1, ...data.channels.map((c) => c.sessions));
  const channelRows = data.channels.length
    ? data.channels.map((c) => `<tr>
      <td width="120" style="padding:6px 10px;font:500 13px ${font};color:#333;">${esc(c.channel)}</td>
      <td style="padding:6px 10px;">${bar(c.sessions, maxChannel, '#575759')}</td>
      <td align="right" width="90" style="padding:6px 10px;font:500 13px ${font};color:#575759;white-space:nowrap;">${c.sessions} sess · ${c.leads} lead${c.leads === 1 ? '' : 's'}</td>
    </tr>`).join('')
    : `<tr><td style="padding:6px 10px;font:300 italic 13px ${font};color:#575759;">No sessions this week.</td></tr>`;

  const callout = (title, color, page, body) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:8px;border-left:4px solid ${color};">
        <tr><td style="padding:12px 14px 2px;font:500 12px ${font};line-height:1.4;color:#575759;text-transform:uppercase;letter-spacing:.04em;">${esc(title)}</td></tr>
        <tr><td style="padding:0 14px;font:500 16px ${font};line-height:1.3;color:#222;">${esc(page ? page.label : '—')}</td></tr>
        <tr><td style="padding:2px 14px 12px;font:300 italic 13px ${font};line-height:1.4;color:#575759;">${esc(body)}</td></tr>
      </table></td></tr></table>`;
  const bestBody = data.best
    ? `${data.best.leads} lead${data.best.leads === 1 ? '' : 's'} from ${data.best.visitors} visitors (${fmtPct(data.best.conversionRate)})`
    : 'No leads yet this week.';
  const worstBody = data.worst
    ? `${data.worst.visitors} visitors, ${data.worst.leads} leads, ${fmtPct(data.worst.engagementRate, 0)} engaged`
    : `Not enough traffic (needs ${MIN_VISITORS_FOR_WORST}+ visitors on a page).`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Homeowner pages — week of ${esc(weekLabel(data))}</title>
<style>
  @media only screen and (max-width: 480px) {
    .stack { max-width: 100% !important; }
    .stack-half { max-width: 50% !important; }
  }
</style></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;">
  <tr><td style="padding:0 6px 4px;font:500 12px ${font};color:#575759;text-transform:uppercase;letter-spacing:.06em;">Feeny Power &amp; Control · Weekly report · ${esc(data.week.key)}</td></tr>
  <tr><td style="padding:0 6px;font:500 24px ${font};color:#000;">Homeowner pages <span style="color:#575759;">${esc(weekLabel(data))}</span></td></tr>
  <tr><td style="padding:8px 6px 14px;font:300 italic 16px ${font};color:#575759;">${esc(data.headline)}</td></tr>
  <tr>${stackRow(cards, 160).replace(/class="stack"/g, 'class="stack stack-half"')}</tr>
  <tr>${stackRow([
    callout('Best page', '#39b54a', data.best, bestBody),
    callout('Needs attention', '#fcb040', data.worst, worstBody)
  ], 320)}</tr>
  <tr><td style="padding:18px 6px 6px;font:500 16px ${font};color:#222;">Pages by leads</td></tr>
  <tr><td style="padding:0 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
    <tr style="background:#222;">
      <th align="left" style="padding:8px 10px;font:500 12px ${font};color:#ffffff;">Page</th>
      <th align="right" style="padding:8px 10px;font:500 12px ${font};color:#ffffff;">Visitors</th>
      <th align="left" style="padding:8px 10px;font:500 12px ${font};color:#ffffff;">Leads</th>
      <th align="right" style="padding:8px 10px;font:500 12px ${font};color:#ffffff;">Conv.</th>
      <th align="right" style="padding:8px 10px;font:500 12px ${font};color:#ffffff;">Engaged</th>
    </tr>
    ${pageRows}
  </table></td></tr>
  <tr><td style="padding:18px 6px 6px;font:500 16px ${font};color:#222;">Top channels</td></tr>
  <tr><td style="padding:0 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:8px;">${channelRows}</table></td></tr>
  <tr><td align="center" style="padding:22px 6px;">
    <a href="${esc(data.dashboardUrl)}" style="display:inline-block;background:#fcb040;color:#222;font:500 15px ${font};text-decoration:none;padding:12px 26px;border-radius:30px;">Open the dashboard</a>
  </td></tr>
  <tr><td style="padding:0 6px;font:300 italic 12px ${font};color:#575759;line-height:1.5;">
    Week = Monday–Sunday, ${esc(data.tz)}. Visitors are unique per day (cookieless). Conversion = leads ÷ visitors. Engaged = ≥10 s on the page or a CTA / form interaction. Leads are inquiry forms saved, the source of truth.
  </td></tr>
</table></td></tr></table>
</body></html>
`;
}

export function renderWeeklyReportText(data) {
  const k = data.kpis;
  const lines = [
    `Homeowner pages — ${weekLabel(data)} (${data.week.key})`,
    data.headline,
    '',
    `Visitors: ${fmtValue(k.visitors)} (${changeText(fmtChange(k.visitors))})`,
    `Leads: ${fmtValue(k.leads)} (${changeText(fmtChange(k.leads))})`,
    `Conversion: ${fmtValue(k.conversionRate)} (${changeText(fmtChange(k.conversionRate))})`,
    `Engagement: ${fmtValue(k.engagementRate)} (${changeText(fmtChange(k.engagementRate))})`,
    '',
    'Pages by leads:',
    ...data.pages.map((p) => `  ${p.label}: ${plural(p.visitors, 'visitor')}, ${plural(p.leads, 'lead')}, ${fmtPct(p.conversionRate)} conv., ${fmtPct(p.engagementRate, 0)} engaged`),
    '',
    'Top channels:',
    ...data.channels.map((c) => `  ${c.channel}: ${plural(c.sessions, 'session')}, ${plural(c.leads, 'lead')}`),
    '',
    `Dashboard: ${data.dashboardUrl}`
  ];
  return lines.join('\n');
}

export function reportSubject(data) {
  const leads = data.kpis.leads.value || 0;
  return `Homeowner pages weekly — ${leads} lead${leads === 1 ? '' : 's'}, ${data.kpis.visitors.value || 0} visitors (${weekLabel(data)})`;
}

/**
 * Build and (optionally) send the weekly report. A unique Mongo record per ISO
 * week is claimed *before* sending, so restarts or a second process never send
 * the same week twice. The claim is released if Resend fails so a later run can retry.
 */
export async function runWeeklyReport({ now = new Date(), send = true, force = false, env = process.env, logger = console, deps = {} } = {}) {
  const data = await buildWeeklyReportData({ now, deps });
  const html = renderWeeklyReportHtml(data);
  const text = renderWeeklyReportText(data);
  const subject = reportSubject(data);
  const result = { week: data.week.key, subject, html, text, data };

  if (!send) return { ...result, status: 'preview' };
  if (!isAnalyticsEmailEnabled(env)) {
    logger.log(`[analytics] weekly report ${data.week.key} not sent (email disabled): ${subject}`);
    return { ...result, status: 'disabled' };
  }

  const Log = deps.ReportLog || AnalyticsReportLog;
  if (!deps.ReportLog && mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB is not connected; weekly report skipped');
  }
  await Log.init();
  const to = reportRecipients(env).join(', ');
  try {
    await Log.create({ week: data.week.key, status: 'sending', claimedAt: new Date(), to });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    if (!force) {
      logger.log(`[analytics] weekly report ${data.week.key} already sent; skipping`);
      return { ...result, status: 'already_sent' };
    }
  }

  try {
    const sent = await sendReportEmail({ subject, html, text }, { env, fetchImpl: deps.fetchImpl || fetch });
    await Log.updateOne(
      { week: data.week.key },
      { $set: { status: 'sent', sentAt: new Date(), messageId: sent.id || '', to } }
    );
    logger.log(`[analytics] weekly report ${data.week.key} sent to ${to}`);
    return { ...result, status: 'sent', id: sent.id };
  } catch (error) {
    if (!force) await Log.deleteOne({ week: data.week.key, status: 'sending' });
    throw error;
  }
}
