import assert from 'node:assert/strict';
import express from 'express';
import { describe, it, before, after } from 'node:test';

import { createRetailEnquiryRouter } from './retailEnquiry.js';
import { mountRetailPages } from './retailPages.js';
import { PAID_NOTICE } from '../retail/messages.js';

function validBody(area, sourcePath) {
  return {
    area,
    sourcePath,
    propertyLocation: 'Kelowna',
    projectType: 'new_build',
    goals: 'We need a plan for lighting and keypads before the walls close.',
    name: 'Sam Lee',
    contact: 'sam@example.com',
    honeypot: '',
  };
}

describe('retail routes', () => {
  let server;
  let baseUrl;
  const sent = [];

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/retail-enquiry', createRetailEnquiryRouter({
      async sendEmail(enquiry) {
        sent.push(enquiry);
        return { delivered: true, method: 'mock' };
      },
    }));
    mountRetailPages(app);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('serves the three pages and lists Los Gatos in the sitemap', async () => {
    const kelowna = await fetch(`${baseUrl}/homeowners/kelowna`);
    assert.equal(kelowna.status, 200);
    assert.equal(kelowna.headers.get('x-robots-tag'), null);
    const kelownaHtml = await kelowna.text();
    assert.match(kelownaHtml, /for a Kelowna home before installation/);
    assert.match(kelowna.headers.get('link'), /rel="canonical"/);

    const losGatos = await fetch(`${baseUrl}/homeowners/los-gatos`);
    assert.equal(losGatos.status, 200);
    assert.equal(losGatos.headers.get('x-robots-tag'), null);
    const losGatosHtml = await losGatos.text();
    assert.match(losGatosHtml, /for one Los Gatos house/);
    assert.equal(losGatosHtml.includes('Confirm this place name before publishing'), false);

    const slash = await fetch(`${baseUrl}/homeowners/greater-vancouver/?ref=preview`, { redirect: 'manual' });
    assert.equal(slash.status, 301);
    assert.equal(slash.headers.get('location'), '/homeowners/greater-vancouver?ref=preview');

    const sitemap = await (await fetch(`${baseUrl}/sitemap.xml`)).text();
    assert.match(sitemap, /\/homeowners\/greater-vancouver</);
    assert.match(sitemap, /\/homeowners\/kelowna</);
    assert.match(sitemap, /\/homeowners\/los-gatos</);
    assert.match(sitemap, /\/homeowners\/faq</);
    assert.match(sitemap, /\/consultation</);

    const faq = await fetch(`${baseUrl}/homeowners/faq?from=los-gatos`);
    assert.equal(faq.status, 200);
    assert.equal(faq.headers.get('x-robots-tag'), null);
    assert.match(faq.headers.get('link'), /<https:\/\/www\.feenypowerandcontrol\.com\/homeowners\/faq>; rel="canonical"/);
    const faqHtml = await faq.text();
    assert.match(faqHtml, /Homeowner FAQ/);
    assert.match(faqHtml, /\/homeowners\/los-gatos#project-enquiry/);
    assert.equal(faqHtml.includes('Confirm this place name'), false);

    const faqSlash = await fetch(`${baseUrl}/homeowners/faq/?from=kelowna`, { redirect: 'manual' });
    assert.equal(faqSlash.status, 301);
    assert.equal(faqSlash.headers.get('location'), '/homeowners/faq?from=kelowna');
    assert.equal(await (await fetch(`${baseUrl}/faq`)).status, 404);

    const robots = await (await fetch(`${baseUrl}/robots.txt`)).text();
    assert.match(robots, /Sitemap: https:\/\/www\.feenypowerandcontrol\.com\/sitemap\.xml/);
    assert.equal(await (await fetch(`${baseUrl}/consultation`)).status, 404);
  });

  it('reports success only when delivery accepts the enquiry', async () => {
    const ok = await fetch(`${baseUrl}/api/retail-enquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(validBody('kelowna', '/homeowners/kelowna')),
    });
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { ok: true, delivered: true });
    assert.equal(sent[0].areaLabel, 'Kelowna, BC');
    assert.equal(sent[0].sourcePath, '/homeowners/kelowna');

    const html = await fetch(`${baseUrl}/api/retail-enquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html' },
      body: new URLSearchParams(validBody('greater-vancouver', '/homeowners/greater-vancouver')),
    });
    assert.equal(html.status, 200);
    const body = await html.text();
    assert.match(body, /Enquiry sent/);
    assert.match(body, new RegExp(PAID_NOTICE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(html.headers.get('x-robots-tag'), 'noindex');
  });
});

describe('retail enquiry without delivery configured', () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/retail-enquiry', createRetailEnquiryRouter({
      env: { PROPOSAL_EMAIL_ENABLED: 'false' },
      fetchImpl() {
        throw new Error('network');
      },
    }));
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('does not tell the visitor the enquiry was sent', async () => {
    const response = await fetch(`${baseUrl}/api/retail-enquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(validBody('greater-vancouver', '/homeowners/greater-vancouver')),
    });
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.delivered, false);
    assert.equal(body.error, 'delivery_not_configured');
    assert.equal(JSON.stringify(body).includes('Your enquiry was sent'), false);
  });
});
