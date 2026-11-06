// Public marketing origin from deployment.md. Canonical URLs use this host
// rather than the request host, so a preview hostname cannot become a second
// indexed copy. Jamie confirmed Los Gatos, California on 2026-11-06. All three
// homeowner pages are indexable the same way. Enquiry result pages stay
// noindex separately. See continuity.md.
export const PUBLIC_SITE_ORIGIN = 'https://www.feenypowerandcontrol.com';

export const RETAIL_AREAS = [
  {
    slug: 'greater-vancouver',
    path: '/homeowners/greater-vancouver',
    label: 'Greater Vancouver, BC',
    file: 'homeowners-greater-vancouver.html',
    indexable: true,
  },
  {
    slug: 'kelowna',
    path: '/homeowners/kelowna',
    label: 'Kelowna, BC',
    file: 'homeowners-kelowna.html',
    indexable: true,
  },
  {
    slug: 'los-gatos',
    path: '/homeowners/los-gatos',
    label: 'Los Gatos, California',
    file: 'homeowners-los-gatos.html',
    indexable: true,
  },
];

export const RETAIL_FAQ = {
  path: '/homeowners/faq',
  file: 'homeowners-faq.html',
};

export const SITEMAP_PATHS = [
  '/consultation',
  '/faq',
  RETAIL_FAQ.path,
  ...RETAIL_AREAS.filter((area) => area.indexable).map((area) => area.path),
];

export function areaBySlug(slug) {
  return RETAIL_AREAS.find((area) => area.slug === slug) || null;
}

export function publicPageUrl(area, origin = PUBLIC_SITE_ORIGIN) {
  return origin + area.path;
}
