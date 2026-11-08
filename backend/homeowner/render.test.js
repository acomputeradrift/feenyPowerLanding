import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPage, renderSitemap } from './render.js';

const v2Pages = [['vancouver', 'lutron'], ['kelowna', 'lutron'], ['los-gatos', 'lutron']];
const draft = (loc, brand) => renderPage(loc, brand, { includeDrafts: true });

test('only published brands render publicly and appear in the sitemap', () => {
    for (const [loc, brand] of v2Pages) assert.ok(renderPage(loc, brand));
    for (const loc of ['vancouver', 'kelowna', 'los-gatos']) assert.ok(renderPage(loc, 'rti'), `${loc}/rti should be public`);
    for (const loc of ['vancouver', 'kelowna']) assert.ok(renderPage(loc, 'vantage'), `${loc}/vantage should be public`);
    for (const loc of ['vancouver', 'kelowna']) assert.ok(renderPage(loc, 'clipsal-c-bus'), `${loc}/clipsal-c-bus should be public`);
    assert.equal(draft('los-gatos', 'vantage'), null);
    assert.equal(draft('los-gatos', 'clipsal-c-bus'), null);
    const sitemap = renderSitemap();
    assert.ok(sitemap.includes('/vancouver/lutron'));
    assert.ok(sitemap.includes('/vancouver/rti'));
    assert.ok(sitemap.includes('/kelowna/vantage'));
    assert.ok(sitemap.includes('/kelowna/clipsal-c-bus'));
});

test('every brand renders the v2 template', () => {
    for (const [loc, brand] of [...v2Pages, ['vancouver', 'rti'], ['vancouver', 'vantage'], ['kelowna', 'clipsal-c-bus']]) {
        assert.match(draft(loc, brand), /<body class="ho ho-v2">/);
    }
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
        assert.equal(html.split('You will get a reply within 24 hours.').length - 1, 2);
        assert.ok(html.includes('Fix my Lutron system'));
        assert.ok(html.includes('class="testimonial-carousel"'));
        const names = [...html.matchAll(/testimonial-name">(.*?)</g)].map((m) => m[1]);
        assert.deepEqual(names, [
            'Sean S, Vancouver Canada',
            'Lisa P, Kelowna Canada',
            'Bob G, Whistler Canada',
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
});

test('v2 Clipsal C-Bus drafts use the C-Bus title and copy', () => {
    for (const [loc, city] of [['vancouver', 'Vancouver'], ['kelowna', 'Kelowna']]) {
        const html = draft(loc, 'clipsal-c-bus');
        const title = `Clipsal C-Bus Control System Troubleshooting | ${city}`;
        assert.ok(title.length <= 60);
        assert.ok(html.includes(`<title>${title}</title>`));
        assert.ok(html.includes('Remote Clipsal C-Bus control system programming &amp; troubleshooting'));
        assert.ok(html.includes('What can I do for your Clipsal C-Bus control system?'));
        assert.ok(html.includes('The labels on your Saturn DLT keypads are wrong or blank.'));
        assert.ok(html.includes('Scene, button and schedule changes.'));
        assert.ok(html.includes('iPhone, iPad or Android app setup.'));
        assert.match(html, /and I still maintain several C-Bus systems today\.<\/p>\s*<p>I work with the system you already have/);
        assert.ok(!html.includes('AV integrators'));
        assert.ok(html.includes('a failed dimmer or relay module, power supply, keypad, sensor, thermostat or network device'));
        assert.ok(html.includes('Fix my Clipsal C-Bus system'));
        assert.ok(!/repair/i.test(html), `${loc}/clipsal-c-bus says "repair"`);
        const names = [...html.matchAll(/testimonial-name">(.*?)</g)].map((m) => m[1]);
        assert.equal(names[0], 'Morgan M, Vancouver Canada');
        assert.equal(names.length, 7);
    }
});

test('v2 Vantage drafts use the Vantage title and copy', () => {
    for (const [loc, city] of [['vancouver', 'Vancouver'], ['kelowna', 'Kelowna']]) {
        const html = draft(loc, 'vantage');
        const title = `Vantage Lighting Control Troubleshooting | ${city}`;
        assert.ok(title.length <= 60);
        assert.match(html, /<body class="ho ho-v2">/);
        assert.ok(html.includes(`<title>${title}</title>`));
        assert.ok(html.includes('Remote Vantage lighting control programming &amp; troubleshooting'));
        assert.ok(html.includes('What can I do for your Vantage lighting control system?'));
        assert.ok(html.includes('The Vantage app or touchscreen stopped working'));
        assert.ok(html.includes('iPhone, iPad or Android app setup.'));
        assert.ok(html.includes('Scene, button, timer and touchscreen changes.'));
        assert.ok(html.includes('InFusion controllers, power modules, dimmers, keypads and touchscreens.'));
        assert.ok(html.includes('Fix my Vantage system'));
        const names = [...html.matchAll(/testimonial-name">(.*?)</g)].map((m) => m[1]);
        assert.equal(names[0], 'Morgan M, Vancouver Canada');
        assert.equal(names.length, 7);
        assert.ok(html.includes('a failed dimmer, keypad, touchscreen, power module, controller or network device'));
        assert.ok(html.includes('your own electrician'));
        assert.ok(!/repair/i.test(html), `${loc}/vantage says "repair"`);
    }
});

test('v2 RTI drafts use the RTI title, copy and testimonial order', () => {
    const cities = { vancouver: 'Vancouver', kelowna: 'Kelowna', 'los-gatos': 'Los Gatos' };
    for (const loc of Object.keys(cities)) {
        const html = draft(loc, 'rti');
        const title = `RTI Control System Troubleshooting | ${cities[loc]}`;
        assert.ok(title.length <= 60);
        assert.match(html, /<body class="ho ho-v2">/);
        assert.ok(html.includes(`<title>${title}</title>`));
        assert.ok(html.includes('Remote RTI control system programming &amp; troubleshooting'));
        assert.ok(html.includes('What can I do for your RTI control system?'));
        assert.ok(html.includes('Fix my RTI system'));
        assert.ok(!html.includes('{brand}'));
        assert.ok(html.includes('Modify or add scheduled events to your system.'));
        assert.ok(html.includes('A custom RTI app for your iPhone and iPad.'));
        assert.ok(html.includes('/images/rti-ka11-white-cutout.png'));
        assert.ok(html.includes('/images/rti-t2x-cutout.png'));
        assert.ok(html.includes('/images/rti-t4x-cutout.png'));
        assert.ok(html.includes('a failed remote, touchscreen, processor, audio/video component or other network device remotely'));
        assert.ok(html.includes('a touchscreen swapped, a processor replaced'));
        assert.ok(!html.includes('dimmer'));
        assert.ok(!html.includes('electrician'));
        assert.ok(html.includes('your own AV technician'));
        assert.ok(!html.includes('keypad engraving'));
        assert.ok(!html.includes('timeclock'));
        assert.ok(!/repair/i.test(html), `${loc}/rti says "repair"`);
        for (const banned of ['guarantee', 'Trusted by integrators', 'within an hour', 'For integrators', 'or remote access', '/hr']) {
            assert.ok(!html.includes(banned), `${loc}/rti contains "${banned}"`);
        }
        const names = [...html.matchAll(/testimonial-name">(.*?)</g)].map((m) => m[1]);
        assert.deepEqual(names, [
            'Bob G, Whistler Canada',
            'Lisa P, Kelowna Canada',
            'Sean S, Vancouver Canada',
            'Chris C, Vancouver Canada',
            'Brad K, Vancouver Canada',
            'Morgan M, Vancouver Canada',
            'Daniel T, Sydney Australia',
        ]);
    }
});

test('Lutron and RTI show the overlapping equipment group', () => {
    for (const [loc, brand] of [...v2Pages, ['vancouver', 'rti']]) {
        const html = draft(loc, brand);
        assert.ok(html.includes('class="ho-equipment-stage"'), `${loc}/${brand} has no equipment stage`);
        assert.equal((html.match(/<img [^>]*style="left:/g) || []).length, 3);
    }
});

test('v2 pages list at most 10 services', () => {
    for (const [loc, brand] of [...v2Pages, ['vancouver', 'rti'], ['kelowna', 'rti'], ['los-gatos', 'rti']]) {
        const list = draft(loc, brand).match(/<ul class="ho-checklist">(.*?)<\/ul>/s)[1];
        const count = (list.match(/<li[\s>]/g) || []).length;
        assert.ok(count > 0 && count <= 10, `${loc}/${brand} lists ${count} services`);
    }
});

test('no page leaks an unfilled {token}', () => {
    for (const p of [...v2Pages, ['vancouver', 'rti'], ['vancouver', 'vantage'], ['kelowna', 'clipsal-c-bus'], ['los-gatos', 'rti']]) {
        const html = draft(...p);
        assert.ok(!/\{(localTrade|hardwareDevices|onsiteExamples|brand)\}/.test(html), `${p.join('/')} has an unfilled token`);
    }
});

test('every page shows the Clipsal logo in the trust strip', () => {
    for (const p of [...v2Pages, ['vancouver', 'vantage'], ['kelowna', 'clipsal-c-bus'], ['los-gatos', 'rti']]) {
        const html = draft(...p);
        assert.match(html, /<img src="\/images\/clipsal-logo.png" alt="Clipsal by Schneider Electric" width="600" height="154"/);
        assert.ok(!html.includes('<span class="ho-wordmark">Clipsal C-Bus</span>'));
    }
});
