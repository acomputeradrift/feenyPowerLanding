import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PUBLIC_SITE_ORIGIN, RETAIL_AREAS } from '../retail/areas.js';
import { renderRobots, renderSitemap } from '../retail/sitemap.js';

const frontendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../frontend');

export function mountRetailPages(app, options = {}) {
  const pages = options.frontendDir || frontendDir;
  const origin = options.origin || PUBLIC_SITE_ORIGIN;

  for (const area of RETAIL_AREAS) {
    app.get(area.path, (req, res) => {
      const pathOnly = req.originalUrl.split('?')[0];
      const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      if (pathOnly !== area.path) {
        res.redirect(301, area.path + qs);
        return;
      }
      if (!area.indexable) res.set('X-Robots-Tag', 'noindex');
      res.set('Link', `<${origin}${area.path}>; rel="canonical"`);
      res.sendFile(path.join(pages, area.file));
    });
  }

  app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml').send(renderSitemap(origin));
  });

  app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send(renderRobots(origin));
  });
}
