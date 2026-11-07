import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyChannel, deviceClass, isBotUserAgent } from './classify.js';
import { normalizeEvent } from './ingest.js';
import { compareKpi, computeBlock, computeCore, computePageTable } from './metrics.js';
import { FALLBACK } from './pages.js';
import { renderWeeklyReportHtml, runWeeklyReport } from './report.js';
import { dayKey, isoWeekKey, previousIsoWeek, rangeBounds } from './time.js';

const TZ = 'America/Vancouver';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15';
const pagesInfo = {
  ...FALLBACK,
  pages: FALLBACK.pages.map((p) => ({ ...p, path: `/${p.location}/${p.brand}` }))
};

describe('channel classification', () => {
  it('treats no referrer as Direct', () => {
    assert.equal(classifyChannel({}), 'Direct');
  });
  it('treats our own host as Direct', () => {
    assert.equal(classifyChannel({ referrer: 'https://www.feenypowerandcontrol.com/consultation' }), 'Direct');
  });
  it('detects search engines', () => {
    assert.equal(classifyChannel({ referrer: 'https://www.google.ca/' }), 'Organic Search');
    assert.equal(classifyChannel({ referrer: 'https://duckduckgo.com/' }), 'Organic Search');
    assert.equal(classifyChannel({ referrer: 'https://search.brave.com/search' }), 'Organic Search');
  });
  it('detects social, webmail and referral hosts', () => {
    assert.equal(classifyChannel({ referrer: 'https://l.facebook.com/' }), 'Social');
    assert.equal(classifyChannel({ referrer: 'https://t.co/abc' }), 'Social');
    assert.equal(classifyChannel({ referrer: 'https://mail.google.com/' }), 'Email');
    assert.equal(classifyChannel({ referrer: 'https://havenandwire.com/' }), 'Referral');
    assert.equal(classifyChannel({ referrer: 'https://inbox.com/' }), 'Referral');
  });
  it('lets paid signals win over the referrer', () => {
    assert.equal(classifyChannel({ referrer: 'https://www.google.com/', gclid: true }), 'Paid');
    assert.equal(classifyChannel({ referrer: 'https://www.bing.com/', msclkid: true }), 'Paid');
    assert.equal(classifyChannel({ referrer: 'https://www.facebook.com/', utm: { medium: 'cpc' } }), 'Paid');
    assert.equal(classifyChannel({ utm: { medium: 'paid_social', source: 'facebook' } }), 'Paid');
  });
  it('uses utm_medium / utm_source when there is no referrer', () => {
    assert.equal(classifyChannel({ utm: { medium: 'email' } }), 'Email');
    assert.equal(classifyChannel({ utm: { source: 'newsletter' } }), 'Email');
    assert.equal(classifyChannel({ utm: { source: 'google' } }), 'Organic Search');
    assert.equal(classifyChannel({ utm: { source: 'instagram' } }), 'Social');
    assert.equal(classifyChannel({ utm: { source: 'partner-site' } }), 'Referral');
  });
});

describe('bots and devices', () => {
  it('flags bots and empty user agents', () => {
    assert.equal(isBotUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)'), true);
    assert.equal(isBotUserAgent('curl/8.4.0'), true);
    assert.equal(isBotUserAgent(''), true);
    assert.equal(isBotUserAgent(UA), false);
  });
  it('classifies screen widths', () => {
    assert.equal(deviceClass(390), 'mobile');
    assert.equal(deviceClass(820), 'tablet');
    assert.equal(deviceClass(1440), 'desktop');
    assert.equal(deviceClass(undefined), 'unknown');
  });
});

describe('event normalization', () => {
  const base = { n: 'pageview', sid: 'abcdef0123456789', loc: 'kelowna', brand: 'lutron' };
  it('accepts a valid pageview and strips the referrer query', () => {
    const { doc } = normalizeEvent({ ...base, ref: 'https://www.google.com/search?q=lutron', sw: 390, utm: { source: 'Google' } }, { pagesInfo, userAgent: UA });
    assert.equal(doc.path, '/kelowna/lutron');
    assert.equal(doc.referrer, 'https://www.google.com/search');
    assert.equal(doc.channel, 'Organic Search');
    assert.equal(doc.device, 'mobile');
    assert.equal(doc.utm.source, 'google');
  });
  it('rejects unknown events, pages and session ids', () => {
    assert.equal(normalizeEvent({ ...base, n: 'purchase' }, { pagesInfo, userAgent: UA }).error, 'unknown_event');
    assert.equal(normalizeEvent({ ...base, brand: 'vantage', loc: 'los-gatos' }, { pagesInfo, userAgent: UA }).error, 'unknown_page');
    assert.equal(normalizeEvent({ ...base, sid: 'x' }, { pagesInfo, userAgent: UA }).error, 'invalid_session');
  });
  it('ignores bots', () => {
    assert.equal(normalizeEvent(base, { pagesInfo, userAgent: 'Googlebot/2.1' }).ignore, 'bot');
  });
  it('clamps engagement and whitelists props', () => {
    const { doc } = normalizeEvent({ ...base, n: 'engagement', secs: 99999, scroll: 140 }, { pagesInfo, userAgent: UA });
    assert.equal(doc.engagedSec, 3600);
    assert.equal(doc.scrollPct, 100);
    const cta = normalizeEvent({ ...base, n: 'cta_click', props: { id: 'hero', evil: 'x' } }, { pagesInfo, userAgent: UA }).doc;
    assert.deepEqual(cta.props, { id: 'hero' });
  });
});

function ev(name, sessionId, extra = {}) {
  return { ts: new Date('2026-11-04T18:00:00Z'), name, sessionId, location: 'kelowna', brand: 'lutron', ...extra };
}

describe('metric math', () => {
  const events = [
    ev('pageview', 's1', { visitor: 'v1', channel: 'Organic Search', device: 'mobile' }),
    ev('engagement', 's1', { engagedSec: 40, scrollPct: 90 }),
    ev('cta_click', 's1'),
    ev('form_start', 's1'),
    ev('form_submit', 's1'),
    ev('pageview', 's2', { visitor: 'v2', channel: 'Direct', device: 'desktop' }),
    ev('engagement', 's2', { engagedSec: 4, scrollPct: 30 }),
    ev('pageview', 's3', { visitor: 'v2', channel: 'Direct', device: 'desktop' }),
    ev('engagement', 's3', { engagedSec: 6, scrollPct: 80 }),
    ev('form_start', 's3'),
    ev('pageview', 's4', { visitor: 'v3', channel: 'Social', device: 'mobile', location: 'vancouver', brand: 'rti' }),
    ev('pageview', 's4', { visitor: 'v3', channel: 'Social', device: 'mobile', location: 'vancouver', brand: 'rti' }),
    ev('engagement', 'orphan', { engagedSec: 50 })
  ];
  const leads = [
    { sessionId: 's1', pageLocation: 'kelowna', pageBrand: 'lutron', brands: ['lutron', 'rti'], hasFile: 'yes', createdAt: new Date('2026-11-04T18:05:00Z') },
    { sessionId: null, pageLocation: 'kelowna', pageBrand: 'lutron', brands: ['lutron'], hasFile: 'no', createdAt: new Date('2026-11-04T19:00:00Z') }
  ];

  it('computes the core rates', () => {
    const core = computeCore(events, leads);
    assert.equal(core.visitors, 3);
    assert.equal(core.sessions, 4);
    assert.equal(core.pageviews, 5);
    assert.equal(core.leads, 2);
    assert.equal(core.engagedSessions, 2);
    assert.equal(core.conversionRate, 2 / 3);
    assert.equal(core.engagementRate, 0.5);
    assert.equal(core.bounceRate, 0.5);
    assert.equal(core.avgEngagedSec, 50 / 4);
    assert.equal(core.scroll75Rate, 0.5);
    assert.equal(core.ctaRate, 0.25);
    assert.equal(core.formStartRate, 0.5);
    assert.equal(core.formCompletionRate, 0.5);
  });

  it('builds funnel, channels, devices, series and lead quality', () => {
    const { start, end } = rangeBounds(7, new Date('2026-11-06T20:00:00Z'), TZ);
    const block = computeBlock(events, leads, { tz: TZ, start, end });
    assert.deepEqual(block.funnel.map((f) => f.value), [3, 2, 1, 2, 2]);
    const organic = block.channels.find((c) => c.channel === 'Organic Search');
    assert.deepEqual([organic.sessions, organic.leads], [1, 1]);
    assert.equal(block.channels.find((c) => c.channel === 'Not tracked').leads, 1);
    assert.equal(block.devices.find((d) => d.device === 'mobile').sessions, 2);
    assert.equal(block.series.length, 7);
    const day = block.series.find((r) => r.day === '2026-11-04');
    assert.deepEqual([day.visitors, day.sessions, day.pageviews, day.leads], [3, 4, 5, 2]);
    assert.deepEqual(block.leadQuality.brands, { lutron: 2, vantage: 0, rti: 1, 'clipsal-c-bus': 0 });
    assert.equal(block.leadQuality.hasFileShare, 0.5);
  });

  it('ranks the page league table by leads', () => {
    const table = computePageTable(pagesInfo, events, leads);
    assert.equal(table.length, 10);
    assert.equal(table[0].path, '/kelowna/lutron');
    assert.equal(table[0].leads, 2);
    assert.equal(table[1].path, '/vancouver/rti');
    assert.equal(table[1].pageviews, 2);
  });

  it('compares counts relatively and rates in points', () => {
    assert.equal(compareKpi(15, 10, 'count').change, 0.5);
    assert.equal(compareKpi(5, 0, 'count').change, null);
    assert.ok(Math.abs(compareKpi(0.3, 0.2, 'rate').change - 0.1) < 1e-12);
  });
});

describe('time zones and weeks', () => {
  it('buckets by Vancouver local day', () => {
    assert.equal(dayKey(new Date('2026-11-05T06:30:00Z'), TZ), '2026-11-04');
  });
  it('finds the previous Monday–Sunday week', () => {
    const week = previousIsoWeek(new Date('2026-11-09T15:00:00Z'), TZ);
    assert.equal(week.key, '2026-W45');
    assert.equal(week.start.toISOString(), '2026-11-02T08:00:00.000Z');
    assert.equal(week.end.toISOString(), '2026-11-09T08:00:00.000Z');
    assert.equal(isoWeekKey(new Date('2026-01-01T20:00:00Z'), TZ), '2026-W01');
  });
  it('handles the DST change inside a range', () => {
    const { start, end } = rangeBounds(7, new Date('2026-11-04T20:00:00Z'), TZ);
    assert.equal(start.toISOString(), '2026-10-29T07:00:00.000Z');
    assert.equal(end.toISOString(), '2026-11-05T08:00:00.000Z');
  });
});

describe('weekly report guard', () => {
  function fakeLog() {
    const weeks = new Map();
    return {
      weeks,
      async init() {},
      async create(doc) {
        if (weeks.has(doc.week)) {
          const err = new Error('dup');
          err.code = 11000;
          throw err;
        }
        weeks.set(doc.week, { ...doc });
      },
      async updateOne(q, u) { Object.assign(weeks.get(q.week), u.$set); },
      async deleteOne(q) { weeks.delete(q.week); }
    };
  }
  const env = {
    PROPOSAL_EMAIL_ENABLED: 'true',
    PROPOSAL_EMAIL_API_KEY: 'k',
    PROPOSAL_EMAIL_FROM: 'reports@example.com'
  };
  const quiet = { log() {}, error() {} };
  const baseDeps = {
    tz: TZ,
    pagesInfo,
    fetchEvents: async () => [],
    fetchLeads: async () => []
  };

  it('sends once per ISO week, even across restarts', async () => {
    const ReportLog = fakeLog();
    let sends = 0;
    const fetchImpl = async () => {
      sends += 1;
      return { ok: true, json: async () => ({ id: 'msg_1' }) };
    };
    const now = new Date('2026-11-09T15:00:00Z');
    const first = await runWeeklyReport({ now, env, logger: quiet, deps: { ...baseDeps, ReportLog, fetchImpl } });
    const second = await runWeeklyReport({ now, env, logger: quiet, deps: { ...baseDeps, ReportLog, fetchImpl } });
    assert.equal(first.status, 'sent');
    assert.equal(second.status, 'already_sent');
    assert.equal(sends, 1);
    assert.equal(ReportLog.weeks.get('2026-W45').status, 'sent');
  });

  it('releases the claim when Resend fails so a retry can send', async () => {
    const ReportLog = fakeLog();
    const failing = async () => ({ ok: false, status: 500, json: async () => ({ message: 'down' }) });
    await assert.rejects(runWeeklyReport({ now: new Date('2026-11-09T15:00:00Z'), env, logger: quiet, deps: { ...baseDeps, ReportLog, fetchImpl: failing } }));
    assert.equal(ReportLog.weeks.size, 0);
  });

  it('does not send or claim when email is disabled', async () => {
    const ReportLog = fakeLog();
    const result = await runWeeklyReport({ now: new Date('2026-11-09T15:00:00Z'), env: { ...env, PROPOSAL_EMAIL_ENABLED: 'false' }, logger: quiet, deps: { ...baseDeps, ReportLog } });
    assert.equal(result.status, 'disabled');
    assert.equal(ReportLog.weeks.size, 0);
  });

  it('renders a fixture week: stacking cards, readable text, empty tracks for 0 leads', async () => {
    const pageviewAt = (iso, sid, visitor, location, brand, channel, extra = {}) => [
      { ts: new Date(iso), name: 'pageview', sessionId: sid, visitor, location, brand, channel, device: 'mobile' },
      { ts: new Date(iso), name: 'engagement', sessionId: sid, location, brand, engagedSec: extra.secs ?? 30, scrollPct: 80 },
      ...(extra.cta ? [{ ts: new Date(iso), name: 'cta_click', sessionId: sid, location, brand }] : [])
    ];
    const week = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'];
    const prevWeek = ['2026-10-27', '2026-10-28', '2026-10-29'];
    const combos = [['kelowna', 'lutron'], ['vancouver', 'rti'], ['los-gatos', 'lutron'], ['vancouver', 'lutron'], ['kelowna', 'vantage']];
    const channels = ['Organic Search', 'Direct', 'Paid', 'Referral', 'Social'];
    const build = (days, prefix) => days.flatMap((day, d) => combos.flatMap(([loc, br], c) =>
      [0, 1].flatMap((n) => pageviewAt(`${day}T18:0${n}:00Z`, `${prefix}${d}${c}${n}`, `${prefix}v${d}${c}${n}`, loc, br, channels[(c + n) % 5], { cta: n === 0, secs: n ? 4 : 40 }))));
    const events = build(week, 'w');
    const prevEvents = build(prevWeek, 'p');
    const lead = (day, sid, loc, br, hasFile) => ({ createdAt: new Date(`${day}T19:00:00Z`), sessionId: sid, pageLocation: loc, pageBrand: br, brands: [br], hasFile });
    const leads = [
      lead('2026-11-02', 'w000', 'kelowna', 'lutron', 'yes'),
      lead('2026-11-03', 'w100', 'kelowna', 'lutron', 'no'),
      lead('2026-11-04', 'w200', 'kelowna', 'lutron', 'yes'),
      lead('2026-11-05', 'w310', 'vancouver', 'rti', 'no'),
      lead('2026-11-06', null, 'los-gatos', 'lutron', 'yes')
    ];
    const inRange = (rows, key) => (start, end) => rows.filter((r) => r[key] >= start && r[key] < end);
    const deps = {
      tz: TZ,
      pagesInfo,
      fetchEvents: async (s, e) => [...inRange(events, 'ts')(s, e), ...inRange(prevEvents, 'ts')(s, e)],
      fetchLeads: async (s, e) => inRange(leads, 'createdAt')(s, e)
    };
    const result = await runWeeklyReport({ now: new Date('2026-11-09T15:00:00Z'), send: false, deps });
    const html = result.html;

    assert.equal(result.data.headline, 'Kelowna / Lutron produced 3 of 5 leads.');
    assert.equal((html.match(/class="stack stack-half"/g) || []).length, 4);
    assert.match(html, /@media only screen and \(max-width: 480px\)/);
    assert.match(html, /<!--\[if mso\]>/);
    assert.doesNotMatch(html, /(^|[;"\s])color:\s*#a7a9ac/i);
    const rowStart = html.indexOf('Vancouver / Vantage');
    assert.ok(rowStart > 0, 'zero-lead page is listed');
    const nextRow = html.indexOf('<tr style="background:', rowStart);
    const tableEnd = html.indexOf('Top channels', rowStart);
    const zeroRowHtml = html.slice(rowStart, nextRow > 0 && nextRow < tableEnd ? nextRow : tableEnd);
    assert.doesNotMatch(zeroRowHtml, /background:#fcb040/);
    assert.match(zeroRowHtml, /background:#f4f4f5/);

    if (process.env.FPC_REPORT_SAMPLE_OUT) {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(process.env.FPC_REPORT_SAMPLE_OUT, html, 'utf8');
    }
  });

  it('renders email-safe HTML without scripts', async () => {
    const result = await runWeeklyReport({ now: new Date('2026-11-09T15:00:00Z'), send: false, deps: baseDeps });
    const html = renderWeeklyReportHtml(result.data);
    assert.ok(!/<script/i.test(html));
    assert.match(html, /Pages by leads/);
    assert.match(result.data.headline, /No visits or leads/);
  });
});
