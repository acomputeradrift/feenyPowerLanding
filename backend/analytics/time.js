// Calendar math in a named IANA time zone (default America/Vancouver) using
// only Intl, so day buckets and ISO weeks follow Jamie's local calendar,
// including DST transitions.

export const DEFAULT_TZ = 'America/Vancouver';

const formatters = new Map();

function formatterFor(tz) {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    });
    formatters.set(tz, f);
  }
  return f;
}

export function analyticsTz(env = process.env) {
  return env.ANALYTICS_TZ || DEFAULT_TZ;
}

export function partsInTz(date, tz) {
  const out = {};
  for (const p of formatterFor(tz).formatToParts(date)) out[p.type] = p.value;
  return {
    y: Number(out.year),
    m: Number(out.month),
    d: Number(out.day),
    h: Number(out.hour),
    mi: Number(out.minute),
    s: Number(out.second)
  };
}

function offsetMs(date, tz) {
  const p = partsInTz(date, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function zonedMidnight(y, m, d, tz) {
  const guess = Date.UTC(y, m - 1, d);
  let t = guess - offsetMs(new Date(guess), tz);
  t = guess - offsetMs(new Date(t), tz);
  return new Date(t);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function dayKey(date, tz) {
  const p = partsInTz(date, tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

export function startOfDay(date, tz) {
  const p = partsInTz(date, tz);
  return zonedMidnight(p.y, p.m, p.d, tz);
}

export function addDays(date, n, tz) {
  const p = partsInTz(date, tz);
  const u = new Date(Date.UTC(p.y, p.m - 1, p.d + n));
  return zonedMidnight(u.getUTCFullYear(), u.getUTCMonth() + 1, u.getUTCDate(), tz);
}

/** Last `days` local calendar days including today, plus the equal-length period before. */
export function rangeBounds(days, now, tz) {
  const today = startOfDay(now, tz);
  const end = addDays(today, 1, tz);
  const start = addDays(today, -(days - 1), tz);
  return { start, end, prevStart: addDays(start, -days, tz), prevEnd: start };
}

export function dayKeysBetween(start, end, tz) {
  const keys = [];
  for (let d = startOfDay(start, tz); d < end; d = addDays(d, 1, tz)) keys.push(dayKey(d, tz));
  return keys;
}

export function isoWeekKey(date, tz) {
  const p = partsInTz(date, tz);
  const u = new Date(Date.UTC(p.y, p.m - 1, p.d));
  const dow = u.getUTCDay() || 7;
  u.setUTCDate(u.getUTCDate() + 4 - dow);
  const yearStart = Date.UTC(u.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((u.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${u.getUTCFullYear()}-W${pad(week)}`;
}

/** The most recent complete Monday–Sunday week before `now`, and the week before it. */
export function previousIsoWeek(now, tz) {
  const today = startOfDay(now, tz);
  const p = partsInTz(today, tz);
  const dow = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  const thisMonday = addDays(today, -((dow + 6) % 7), tz);
  const start = addDays(thisMonday, -7, tz);
  return {
    key: isoWeekKey(start, tz),
    start,
    end: thisMonday,
    prevStart: addDays(start, -7, tz),
    prevEnd: start
  };
}
