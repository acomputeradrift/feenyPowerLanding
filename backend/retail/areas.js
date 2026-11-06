// Public marketing origin from deployment.md. Canonical URLs use this host
// rather than the request host, so a preview hostname cannot become a second
// indexed copy. Los Gatos stays out of the sitemap until Jamie confirms the
// "El Gato, California" place name. See continuity.md.
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
    indexable: false,
  },
];

export const SITEMAP_PATHS = [
  '/consultation',
  '/faq',
  ...RETAIL_AREAS.filter((area) => area.indexable).map((area) => area.path),
];

export function areaBySlug(slug) {
  return RETAIL_AREAS.find((area) => area.slug === slug) || null;
}

export function publicPageUrl(area, origin = PUBLIC_SITE_ORIGIN) {
  return origin + area.path;
}
