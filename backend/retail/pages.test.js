import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { PUBLIC_SITE_ORIGIN, RETAIL_AREAS, SITEMAP_PATHS } from './areas.js';
import { PAID_NOTICE } from './messages.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

const pages = [
  ['homeowners-greater-vancouver.html', 'greater-vancouver'],
  ['homeowners-kelowna.html', 'kelowna'],
  ['homeowners-los-gatos.html', 'los-gatos'],
];

function strip(html) {
  const block = html.match(/id="area-copy"[\s\S]*?<\/section>/)[0];
  return block
    .replace(/<[^>]+>/g, ' ')
    .replace(/Greater Vancouver/g, 'AREA')
    .replace(/Vancouver/g, 'AREA')
    .replace(/Kelowna/g, 'AREA')
    .replace(/Los Gatos/g, 'AREA')
    .replace(/California/g, 'AREA')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('homeowner landing pages', () => {
  it('keeps dealer pages off the retail funnel', async () => {
    const consultation = await readFile(path.join(root, 'frontend/consultation.html'), 'utf8');
    const faq = await readFile(path.join(root, 'frontend/faq.html'), 'utf8');
    assert.equal(consultation.includes('/homeowners/'), false);
    assert.equal(faq.includes('/homeowners/'), false);
    assert.match(consultation, /Happy Clients/);
    assert.match(consultation, /calendly-button/);
  });

  it('uses distinct copy, real quotes, and the same short form', async () => {
    const consultation = await readFile(path.join(root, 'frontend/consultation.html'), 'utf8');
    const quotes = [...consultation.matchAll(/<blockquote>\s*<p>([\s\S]*?)<\/p>/g)].map((match) => match[1].trim());
    const bodies = [];
    const forms = [];
    const titles = new Set();
    const descriptions = new Set();
    const h1s = new Set();

    for (const [file, slug] of pages) {
      const area = RETAIL_AREAS.find((item) => item.slug === slug);
      const html = await readFile(path.join(root, 'frontend', file), 'utf8');
      bodies.push(strip(html));
      const title = html.match(/<title>(.*?)<\/title>/)[1];
      const description = html.match(/name="description" content="(.*?)"/)[1];
      const h1 = html.match(/<h1>([\s\S]*?)<\/h1>/)[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      titles.add(title);
      descriptions.add(description);
      h1s.add(h1);
      assert.equal(html.includes(`href="${PUBLIC_SITE_ORIGIN}${area.path}"`), true);
      assert.equal(html.includes(PAID_NOTICE), true);
      assert.equal(html.includes('Tell me about your project'), true);
      assert.equal((html.match(/Tell me about your project/g) || []).length, 2);
      assert.equal(html.includes('We do not install the system'), true);
      assert.equal(html.includes('local AV company'), true);
      assert.equal(html.includes('These comments are from integration companies'), true);
      assert.equal(html.includes('They are not homeowner reviews.'), true);
      assert.equal(html.includes('Planning a new system or improving an existing one?'), true);
      assert.equal(html.includes('name="area" value="' + slug + '"'), true);
      assert.equal(html.includes('name="sourcePath" value="' + area.path + '"'), true);
      assert.equal(html.includes('action="/api/retail-enquiry"'), true);
      for (const quote of quotes) assert.equal(html.includes(quote), true, file);
      assert.match(html, /The Home Automation Store, Sydney Australia/);
      assert.match(html, /Blue Ember Solutions, Vancouver Canada/);
      for (const pattern of [/calendly/i, /independent/i, /happy clients/i, /\$/, /per hour/i, /discovery/i, /authorized/i, /certified/i, /guarantee/i, /el gato/i, /location-assumption/]) {
        assert.equal(pattern.test(html), false, `${file} ${pattern}`);
      }
      forms.push(html.match(/<form[\s\S]*<\/form>/)[0]
        .replace(/name="area" value="[^"]+"/, 'AREA')
        .replace(/name="sourcePath" value="[^"]+"/, 'PATH'));
    }

    assert.equal(titles.size, 3);
    assert.equal(descriptions.size, 3);
    assert.equal(h1s.size, 3);
    assert.notEqual(bodies[0], bodies[1]);
    assert.notEqual(bodies[1], bodies[2]);
    assert.notEqual(bodies[0], bodies[2]);
    assert.equal(forms[0], forms[1]);
    assert.equal(forms[1], forms[2]);
  });

  it('lists confirmed Los Gatos with the other homeowner pages', async () => {
    const losGatos = await readFile(path.join(root, 'frontend/homeowners-los-gatos.html'), 'utf8');
    assert.match(losGatos, /name="robots" content="index, follow"/);
    assert.equal(losGatos.includes('Confirm this place name before publishing'), false);
    assert.equal(SITEMAP_PATHS.includes('/homeowners/los-gatos'), true);
    assert.equal(SITEMAP_PATHS.includes('/homeowners/kelowna'), true);
    assert.equal(SITEMAP_PATHS.includes('/homeowners/greater-vancouver'), true);

    for (const file of ['homeowners-greater-vancouver.html', 'homeowners-kelowna.html', 'homeowners-los-gatos.html']) {
      const html = await readFile(path.join(root, 'frontend', file), 'utf8');
      const json = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)[1];
      const data = JSON.parse(json);
      const serialized = JSON.stringify(data);
      assert.equal(data['@type'], 'Service');
      assert.equal(serialized.includes('streetAddress'), false);
      assert.equal(serialized.includes('postalCode'), false);
      assert.equal(serialized.includes('telephone'), false);
      assert.equal(serialized.includes('aggregateRating'), false);
      assert.equal(serialized.includes('review'), false);
    }
  });
});
