import { PUBLIC_SITE_ORIGIN, SITEMAP_PATHS } from './areas.js';

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderSitemap(origin = PUBLIC_SITE_ORIGIN) {
  const urls = SITEMAP_PATHS
    .map((pagePath) => `  <url><loc>${xmlEscape(origin + pagePath)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function renderRobots(origin = PUBLIC_SITE_ORIGIN) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}
