// Valid homeowner landing pages. Source of truth is backend/homeowner/content.js;
// the fallback mirrors the build brief so analytics works before that module exists.

const FALLBACK_LOCATIONS = [
  { slug: 'vancouver', label: 'Greater Vancouver', short: 'Vancouver' },
  { slug: 'kelowna', label: 'Kelowna & the Central Okanagan', short: 'Kelowna' },
  { slug: 'los-gatos', label: 'Los Gatos, Silicon Valley & the Monterey Bay', short: 'Los Gatos' }
];

const FALLBACK_BRANDS = [
  { slug: 'lutron', label: 'Lutron' },
  { slug: 'vantage', label: 'Vantage' },
  { slug: 'rti', label: 'RTI' },
  { slug: 'clipsal-c-bus', label: 'Clipsal C-Bus' }
];

const FALLBACK_PAGES = [
  ['vancouver', 'lutron'], ['vancouver', 'vantage'], ['vancouver', 'rti'], ['vancouver', 'clipsal-c-bus'],
  ['kelowna', 'lutron'], ['kelowna', 'vantage'], ['kelowna', 'rti'], ['kelowna', 'clipsal-c-bus'],
  ['los-gatos', 'lutron'], ['los-gatos', 'rti']
].map(([location, brand]) => ({ location, brand }));

const SHORT_LOCATION = { vancouver: 'Vancouver', kelowna: 'Kelowna', 'los-gatos': 'Los Gatos' };

function pickLabel(entry, slug) {
  if (!entry || typeof entry !== 'object') return slug;
  return entry.shortName || entry.name || entry.label || entry.title || entry.region || slug;
}

function normalizeList(source, fallback) {
  if (!source) return null;
  const entries = Array.isArray(source)
    ? source.map((item) => [item && (item.slug || item.id || item.key), item])
    : Object.entries(source).map(([slug, item]) => [(item && item.slug) || slug, item]);
  const list = entries
    .filter(([slug]) => typeof slug === 'string' && slug)
    .map(([slug, item]) => {
      const known = fallback.find((f) => f.slug === slug);
      return {
        slug,
        label: (item && (item.region || item.regionName)) || pickLabel(item, known ? known.label : slug),
        short: SHORT_LOCATION[slug] || (known && (known.short || known.label)) || pickLabel(item, slug)
      };
    });
  return list.length ? list : null;
}

function normalizePages(source) {
  if (!Array.isArray(source)) return null;
  const pages = source
    .map((p) => ({ location: p && (p.location || p.locationSlug), brand: p && (p.brand || p.brandSlug) }))
    .filter((p) => typeof p.location === 'string' && typeof p.brand === 'string');
  return pages.length ? pages : null;
}

let cached = null;

export async function loadPages({ importContent = () => import('../homeowner/content.js') } = {}) {
  if (cached) return cached;
  let content = null;
  try {
    const mod = await importContent();
    content = mod.default && !mod.pages ? mod.default : mod;
  } catch {
    content = null;
  }
  const pages = normalizePages(content && (content.publishedPages || content.pages)) || FALLBACK_PAGES;
  const locations = normalizeList(content && content.locations, FALLBACK_LOCATIONS) || FALLBACK_LOCATIONS;
  const brands = (normalizeList(content && content.brands, FALLBACK_BRANDS) || FALLBACK_BRANDS)
    .map((b) => ({ ...b, short: FALLBACK_BRANDS.find((f) => f.slug === b.slug)?.label || b.short }));
  const result = {
    pages: pages.map((p) => ({ ...p, path: `/${p.location}/${p.brand}` })),
    locations: locations.filter((l) => pages.some((p) => p.location === l.slug)),
    brands: brands.filter((b) => pages.some((p) => p.brand === b.slug)),
    fromContent: Boolean(content && content.pages)
  };
  if (content && content.pages) cached = result;
  return result;
}

export function isValidPage(pagesInfo, location, brand) {
  return pagesInfo.pages.some((p) => p.location === location && p.brand === brand);
}

export function pageLabel(pagesInfo, location, brand) {
  const loc = pagesInfo.locations.find((l) => l.slug === location);
  const br = pagesInfo.brands.find((b) => b.slug === brand);
  return `${loc ? loc.short || loc.label : location} / ${br ? br.short || br.label : brand}`;
}

export const FALLBACK = { pages: FALLBACK_PAGES, locations: FALLBACK_LOCATIONS, brands: FALLBACK_BRANDS };
