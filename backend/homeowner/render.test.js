import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPage, renderSitemap } from './render.js';

const v2Pages = [['vancouver', 'lutron'], ['kelowna', 'lutron'], ['los-gatos', 'lutron']];
const draft = (loc, brand) => renderPage(loc, brand, { includeDrafts: true });

test('only published brands render publicly and appear in the sitemap', () => {
    for (const [loc, brand] of v2Pages) assert.ok(renderPage(loc, brand));
    for (const [loc, brand] of [['vancouver', 'vantage'], ['kelowna', 'clipsal-c-bus'], ['los-gatos', 'rti']]) {
        assert.equal(renderPage(loc, brand), null, `${loc}/${brand} should be hidden`);
        assert.ok(draft(loc, brand), `${loc}/${brand} should render as a draft`);
    }
    assert.equal(draft('los-gatos', 'vantage'), null);
    const sitemap = renderSitemap();
    assert.ok(sitemap.includes('/vancouver/lutron'));
    assert.ok(!sitemap.includes('/vancouver/rti'));
});

test('v2 brands render the v2 template; others keep v1', () => {
    for (const [loc, brand] of v2Pages) assert.match(renderPage(loc, brand), /<body class="ho ho-v2">/);
    const v1 = draft('vancouver', 'vantage');
    assert.match(v1, /<body class="ho">/);
    assert.match(v1, /For integrators &amp; dealers/);
    assert.match(v1, /within an hour/);
});

test('v2 pages drop retired copy and keep the FAQ JSON-LD in sync', () => {
    for (const [loc, brand] of v2Pages) {
        const html = renderPage(loc, brand);
        for (const banned of ['guarantee', 'Trusted by integrators', 'within an hour', 'within the hour', 'For integrators', 'Especially for']) {
            assert.ok(!html.includes(banned), `${loc}/${brand} contains "${banned}"`);
        }
        assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
        assert.ok(html.indexOf('id="ho-final-title"') < html.indexOf('id="ho-local-title"'));
        const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
        const faq = ld['@graph'].find((g) => g['@type'] === 'FAQPage').mainEntity;
        assert.equal(faq.length, (html.match(/<summary>/g) || []).length);
    }
    assert.ok(!renderPage('vancouver', 'lutron').includes('Bowen'));
});

test('v2 Lutron pages use the approved title, copy and testimonial order', () => {
    const cities = { vancouver: 'Vancouver', kelowna: 'Kelowna', 'los-gatos': 'Los Gatos' };
    for (const [loc, brand] of v2Pages) {
        const html = renderPage(loc, brand);
        const title = `Lutron Lighting Control Troubleshooting | ${cities[loc]}`;
        assert.ok(title.length <= 60);
        assert.ok(html.includes(`<title>${title}</title>`));
        assert.ok(html.includes(`<meta property="og:title" content="${title}">`));
        assert.ok(!/repair/i.test(html), `${loc}/${brand} says "repair"`);
        assert.ok(html.includes('Who am I?'));
        assert.ok(html.includes('>Send it!</button>'));
        assert.ok(html.includes('class="testimonial-carousel"'));
        const names = [...html.matchAll(/testimonial-name">(.*?)</g)].map((m) => m[1]);
        assert.deepEqual(names, [
            'Lisa P, Kelowna Canada',
            'Bob G, Whistler Canada',
            'Sean S, Vancouver Canada',
            'Chris C, Vancouver Canada',
            'Brad K, Vancouver Canada',
            'Morgan M, Vancouver Canada',
            'Daniel T, Sydney Australia',
        ]);
        assert.ok(!html.includes('testimonial-company'));
        assert.ok(!html.includes('or remote access'));
        assert.ok(!html.includes('/hr'));
        assert.ok(!/cas[ée]ta/i.test(html));
    }
    assert.match(draft('vancouver', 'vantage'), /before any repair work starts/);
});

test('every page shows the Clipsal logo in the trust strip', () => {
    for (const p of [...v2Pages, ['vancouver', 'vantage'], ['kelowna', 'clipsal-c-bus'], ['los-gatos', 'rti']]) {
        const html = draft(...p);
        assert.match(html, /<img src="\/images\/clipsal-logo.png" alt="Clipsal by Schneider Electric" width="600" height="154"/);
        assert.ok(!html.includes('<span class="ho-wordmark">Clipsal C-Bus</span>'));
    }
});
