export const CHANNELS = ['Direct', 'Organic Search', 'Social', 'Paid', 'Email', 'Referral'];

const SEARCH_HOSTS = [
  /(^|\.)google\.[a-z.]+$/,
  /(^|\.)bing\.com$/,
  /(^|\.)duckduckgo\.com$/,
  /(^|\.)ecosia\.org$/,
  /(^|\.)yahoo\.[a-z.]+$/,
  /(^|\.)search\.brave\.com$/,
  /(^|\.)baidu\.com$/,
  /(^|\.)yandex\.[a-z.]+$/,
  /(^|\.)startpage\.com$/,
  /(^|\.)qwant\.com$/,
  /(^|\.)kagi\.com$/,
  /(^|\.)ask\.com$/,
  /(^|\.)search\.aol\.com$/
];

const SOCIAL_HOSTS = [
  /(^|\.)facebook\.com$/,
  /(^|\.)fb\.com$/,
  /(^|\.)messenger\.com$/,
  /(^|\.)instagram\.com$/,
  /^t\.co$/,
  /(^|\.)twitter\.com$/,
  /(^|\.)x\.com$/,
  /(^|\.)linkedin\.com$/,
  /^lnkd\.in$/,
  /(^|\.)pinterest\.[a-z.]+$/,
  /(^|\.)reddit\.com$/,
  /(^|\.)youtube\.com$/,
  /^youtu\.be$/,
  /(^|\.)tiktok\.com$/,
  /(^|\.)threads\.net$/,
  /(^|\.)nextdoor\.[a-z.]+$/,
  /(^|\.)whatsapp\.com$/,
  /^wa\.me$/,
  /(^|\.)snapchat\.com$/
];

const WEBMAIL_HOSTS = [
  /^mail\.google\.com$/,
  /^outlook\.(live|office|office365)\.com$/,
  /^mail\.yahoo\.com$/,
  /^mail\.proton\.me$/,
  /(^|\.)fastmail\.com$/
];

const SEARCH_SOURCES = /^(google|bing|duckduckgo|ecosia|yahoo|brave|baidu|yandex|startpage|qwant|kagi)$/;
const SOCIAL_SOURCES = /^(facebook|fb|instagram|ig|twitter|x|linkedin|pinterest|reddit|youtube|tiktok|threads|nextdoor|whatsapp|snapchat)$/;
const PAID_MEDIUMS = /^(cpc|ppc|paid|paidsearch|paid[-_ ]?search|paid[-_ ]?social|cpm|cpv|display|banner|retargeting)$/;
const EMAIL_MEDIUMS = /^(e-?mail|newsletter)$/;
const SOCIAL_MEDIUMS = /^(social|social[-_ ]?media|sm)$/;

function matchesAny(host, patterns) {
  return patterns.some((re) => re.test(host));
}

export function normalizeHost(host) {
  return String(host || '').toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
}

export function refererHost(referrer) {
  if (!referrer) return '';
  try {
    return normalizeHost(new URL(referrer).hostname);
  } catch {
    return '';
  }
}

/**
 * Channel for a landing pageview. Precedence: paid click ids / paid utm_medium,
 * then email, then explicit social/organic utm_medium, then utm_source on its
 * own, then the referrer host. No referrer (or our own host) is Direct.
 */
export function classifyChannel({ referrer, utm = {}, gclid = false, msclkid = false, siteHost = '' } = {}) {
  const medium = String(utm.medium || '').trim().toLowerCase();
  const source = String(utm.source || '').trim().toLowerCase();

  if (gclid || msclkid || PAID_MEDIUMS.test(medium)) return 'Paid';
  if (EMAIL_MEDIUMS.test(medium)) return 'Email';
  if (SOCIAL_MEDIUMS.test(medium)) return 'Social';
  if (medium === 'organic') return 'Organic Search';

  const host = refererHost(referrer);
  const ownHost = normalizeHost(siteHost);
  const external = host && host !== ownHost && !host.endsWith('feenypowerandcontrol.com');

  if (!external && source) {
    if (SEARCH_SOURCES.test(source)) return 'Organic Search';
    if (SOCIAL_SOURCES.test(source)) return 'Social';
    if (/mail|newsletter/.test(source)) return 'Email';
    return 'Referral';
  }
  if (!external) return 'Direct';
  if (matchesAny(host, WEBMAIL_HOSTS)) return 'Email';
  if (matchesAny(host, SEARCH_HOSTS)) return 'Organic Search';
  if (matchesAny(host, SOCIAL_HOSTS)) return 'Social';
  return 'Referral';
}

const BOT_UA = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|headless|phantomjs|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl|wget|python-requests|python-urllib|aiohttp|axios|node-fetch|undici|go-http-client|java\/|okhttp|httpclient|libwww|scrapy|preview|validator|feedfetcher|mediapartners|adsbot|petalbot|semrush|ahrefs|mj12|dotbot/i;

export function isBotUserAgent(ua) {
  if (typeof ua !== 'string' || ua.trim().length < 10) return true;
  return BOT_UA.test(ua);
}

export function deviceClass(screenWidth) {
  const w = Number(screenWidth);
  if (!Number.isFinite(w) || w <= 0) return 'unknown';
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}
