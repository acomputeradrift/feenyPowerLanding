import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    SITE_URL,
    BUSINESS_NAME,
    FOUNDER,
    locations,
    brands,
    pages,
    publishedPages,
    formBrandOrder,
    shared,
    sharedV2,
} from './content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, '../../frontend/homeowner/service.html');
const TEMPLATE_V2_PATH = path.join(__dirname, '../../frontend/homeowner/service_v2.html');

const templates = new Map();
const cache = new Map();

function loadTemplate(file) {
    if (!templates.has(file)) templates.set(file, fs.readFileSync(file, 'utf8'));
    return templates.get(file);
}

export function isValidPage(location, brand) {
    return pages.some((p) => p.location === location && p.brand === brand);
}

export function pagePath(location, brand) {
    return `/${location}/${brand}`;
}

export function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function money(amount, currency) {
    return `$${amount} ${currency}`;
}

function diagnosticPrice(loc, brand) {
    return (brand.diagnosticPrice && brand.diagnosticPrice[loc.currency]) || loc.diagnosticPrice;
}

function tokensFor(loc, brand) {
    return {
        brand: brand.name,
        titleName: brand.titleName || brand.name,
        product: brand.product,
        region: loc.region,
        city: loc.city,
        price: money(diagnosticPrice(loc, brand), loc.currency),
        rate: `${money(loc.hourlyRate, loc.currency)}/hr`,
        partner: loc.partner ? loc.partner.name : 'my local partner',
        partnerIntro: loc.partner ? `my local partner, ${loc.partner.name},` : 'my local partner',
        fileNote: brand.fileNote,
        connectOption: brand.connectOption || '',
        credential: brand.credential ? ` ${brand.credential}` : '',
        connectFaq: brand.connectFaq || '',
        hardwareDevices: brand.hardwareDevices || 'dimmer, keypad, controller or network device',
        onsiteExamples: brand.onsiteExamples || 'a dimmer swapped, a keypad replaced',
        localTrade: brand.localTrade || 'electrician',
    };
}

function fill(text, tokens) {
    return text.replace(/\{(\w+)\}/g, (match, key) =>
        Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : match);
}

// Plain text after token fill.
function txt(text, tokens) {
    return fill(text, tokens);
}

// Escaped HTML after token fill, with **bold** support.
function html(text, tokens) {
    return escapeHtml(fill(text, tokens)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function stripBold(text) {
    return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

function li(items, tokens) {
    return items
        .map((item) => fill(item, tokens))
        .filter((item) => item.trim() !== '')
        .map((item) => `<li>${html(item, {})}</li>`)
        .join('\n');
}

function fitTitle(tokens, c) {
    const full = txt(c.seo.title, tokens);
    return full.length <= 60 ? full : txt(c.seo.titleShort, tokens);
}

function fitDescription(tokens, c) {
    const full = txt(c.seo.description, tokens);
    return full.length <= 155 ? full : txt(c.seo.descriptionShort, tokens);
}

// Logo PNGs default to 1583x250 unless the brand data says otherwise.
function logoImg(logo, attrs) {
    return `<img${attrs} src="${escapeHtml(logo.src)}" alt="${escapeHtml(logo.alt)}" width="${logo.width || 1583}" height="${logo.height || 250}"`;
}

function initials(name) {
    return name
        .split(/\s+/)
        .filter((w) => /^[A-Z]/.test(w))
        .map((w) => w[0])
        .join('')
        .slice(0, 3);
}

// A location without a partner shows no partner tile; only its tie line, if any.
function partnerBlock(loc, c, tokens, tieHtml) {
    if (!loc.partner) return tieHtml;
    const p = loc.partner;
    const logo = p.logo
        ? `<div class="ho-partner-logo ho-partner-logo-image"><img src="${escapeHtml(p.logo.src)}" alt="${escapeHtml(p.logo.alt)}" width="${p.logo.width}" height="${p.logo.height}" loading="lazy"></div>`
        : `<div class="ho-partner-logo" aria-hidden="true">${escapeHtml(initials(p.name))}</div>`;
    return `<div class="ho-partner">
                    ${logo}
                    <div>
                        <h3>${escapeHtml(txt(c.local.partnerHeading, tokens))}</h3>
                        <p>${escapeHtml(txt(p.note, tokens))}</p>
                        ${tieHtml}
                    </div>
                </div>`;
}

// One business entity shared by every page (same @id), plus a Service per page that points to it.
function buildJsonLd(loc, brand, tokens, canonical, description, c) {
    const region = loc.adminArea ? { containedInPlace: { '@type': 'AdministrativeArea', name: loc.adminArea } } : {};
    const areaServed = loc.areaGroups.flatMap((g) => g.places.map((p) => ({ '@type': 'City', name: p.name, ...region })));
    const businessId = `${SITE_URL}/#business`;
    const business = {
        '@type': 'ProfessionalService',
        '@id': businessId,
        name: c.businessName || BUSINESS_NAME,
        url: `${SITE_URL}/`,
        image: `${SITE_URL}/images/feeny-logo-512-circle-black-back.png`,
        logo: `${SITE_URL}/images/feeny-logo-512-circle-black-back.png`,
        founder: { '@type': 'Person', name: FOUNDER },
        knowsAbout: [...Object.values(brands).map((b) => b.product), 'Smart home programming', 'Lighting control troubleshooting'],
    };
    const service = {
        '@type': 'Service',
        '@id': `${canonical}#service`,
        name: `Remote ${brand.name} programming & troubleshooting`,
        serviceType: `${brand.product} programming and troubleshooting`,
        url: canonical,
        description,
        provider: { '@id': businessId },
        areaServed,
        offers: {
            '@type': 'Offer',
            name: `Remote ${brand.name} diagnostic`,
            description: txt(c.steps.items[2].body, tokens),
            price: String(diagnosticPrice(loc, brand)),
            priceCurrency: loc.currency,
        },
    };
    const faqPage = {
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        mainEntity: c.faq.items.map((item) => ({
            '@type': 'Question',
            name: txt(item.q, tokens),
            acceptedAnswer: { '@type': 'Answer', text: stripBold(txt(item.a, tokens)) },
        })),
    };
    const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': [business, service, faqPage] });
    // Keep "</script>" and friends from ever closing the tag early.
    return json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function buildValues(loc, brand, c = shared) {
    const t = tokensFor(loc, brand);
    const canonical = `${SITE_URL}${pagePath(loc.slug, brand.slug)}`;
    const title = fitTitle(t, c);
    const description = fitDescription(t, c);

    const heroBrandMark = brand.logo
        ? `${logoImg(brand.logo, ' class="ho-hero-brand"')}>`
        : `<!-- TODO: replace with a ${escapeHtml(brand.name)} logo. -->\n            <p class="ho-hero-brand ho-wordmark">${escapeHtml(brand.name)}</p>`;

    const trustItems = c.trust.items
        .map((i) => `<li><strong class="text-green">${html(i.lead, t)}</strong> ${html(i.text, t)}</li>`)
        .join('\n');

    const solutionBody = c.solution.body
        .map((p) => (p.list ? `<ul class="ho-checklist">\n${li(p.list, t)}\n</ul>` : `<p>${html(p, t)}</p>`))
        .join('\n');

    const solutionPhoto = brand.photo
        ? `<figure class="ho-solution-photo"><img src="${escapeHtml(brand.photo.src)}" alt="${escapeHtml(brand.photo.alt)}" width="${brand.photo.width}" height="${brand.photo.height}" loading="lazy"></figure>`
        : `<!-- TODO: replace with a ${escapeHtml(brand.name)} product photo. -->\n                <figure class="ho-solution-photo ho-photo-placeholder" aria-hidden="true"><span>${escapeHtml(brand.name)}</span></figure>`;

    const benefitCards = c.benefits.cards
        .map((c) => `<article class="ho-card">
                        <h3><span class="text-green">${html(c.lead, t)}</span> <span class="text-dark-grey">${html(c.rest, t)}</span></h3>
                        <p>${html(c.text, t)}</p>
                    </article>`)
        .join('\n');

    const steps = c.steps.items
        .map((s) => {
            const options = s.options ? `<ul class="ho-step-options">${li(s.options, t)}</ul>` : '';
            return `<li class="ho-step">
                        <h3>${html(s.title, t)}</h3>
                        <p>${html(s.body, t)}</p>
                        ${options}
                    </li>`;
        })
        .join('\n');

    const areas = loc.areaGroups
        .map((g) => {
            const label = g.label ? `<h3 class="ho-area-label">${escapeHtml(g.label)}</h3>` : '';
            const places = g.places
                .map((p) => `<li>${escapeHtml(p.name)}${p.parts ? ` <span class="text-dark-grey">(${escapeHtml(p.parts.join(', '))})</span>` : ''}</li>`)
                .join('');
            return `<div class="ho-area-group">${label}<ul class="ho-areas">${places}</ul></div>`;
        })
        .join('\n');

    const testimonials = c.testimonials.items
        .map((q) => `<figure class="testimonial">
                        <blockquote>${[].concat(q.quote).map((p) => `<p>${escapeHtml(p)}</p>`).join('')}</blockquote>
                        <figcaption>
                            <span class="testimonial-name">${escapeHtml(q.name)}</span>${q.company ? `
                            <span class="testimonial-company">${escapeHtml(q.company)}</span>` : ''}
                        </figcaption>
                    </figure>`)
        .join('\n');

    const faq = c.faq.items
        .map((item) => `<details class="ho-faq-item">
                    <summary>${html(item.q, t)}</summary>
                    <p>${html(item.a, t)}</p>
                </details>`)
        .join('\n');

    const brandOrder = [brand.slug, ...formBrandOrder.filter((b) => b !== brand.slug)];

    const trustLogos = brandOrder
        .map((slug) => {
            const b = brands[slug];
            if (!b.logo) {
                return `<!-- TODO: replace with a ${escapeHtml(b.name)} logo once one is available. -->
                <li><span class="ho-wordmark">${escapeHtml(b.name)}</span></li>`;
            }
            return `<li>${logoImg(b.logo, '')} loading="eager"></li>`;
        })
        .join('\n');

    const brandCheckboxes = brandOrder
        .map((slug) => `<label class="ho-choice"><input type="checkbox" name="brands" value="${escapeHtml(slug)}"${slug === brand.slug ? ' checked' : ''}> ${escapeHtml(brands[slug].name)}</label>`)
        .join('\n');

    return {
        raw: {
            jsonLd: buildJsonLd(loc, brand, t, canonical, description, c),
            heroBrandMark,
            partnerBlock: partnerBlock(loc, c, t, loc.tie ? `<p class="ho-tie">${escapeHtml(loc.tie)}</p>` : ''),
            trustLogos,
            trustItems,
            symptoms: li(brand.symptoms, t),
            agitate: li(c.problem.agitate, t),
            solutionBody,
            solutionPhoto,
            benefitCards,
            services: li(c.services.items, t),
            extras: li(brand.extras, t),
            steps,
            areas,
            testimonials,
            faq,
            brandCheckboxes,
        },
        text: {
            lang: loc.lang,
            ogLocale: loc.ogLocale,
            title,
            description,
            canonical,
            ogImage: `${SITE_URL}/images/feeny-logo-512-circle-black-back.png`,
            path: pagePath(loc.slug, brand.slug),
            locationSlug: loc.slug,
            brandSlug: brand.slug,
            heroHeadline: txt(c.hero.headline, t),
            heroHeadlineTail: txt(c.hero.headlineTail, t),
            heroSubhead: txt(c.hero.subhead, t),
            heroPrimaryCta: txt(c.hero.primaryCta, t),
            heroSecondaryCta: c.hero.secondaryCta,
            heroMicroline: txt(c.hero.microline, t),
            trustLabel: c.trust.label,
            problemHeading: txt(c.problem.heading, t),
            problemIntro: txt(c.problem.intro, t),
            problemAgitateHeading: txt(c.problem.agitateHeading, t),
            problemClosing: txt(c.problem.closing, t),
            solutionHeading: txt(c.solution.heading, t),
            benefitsHeading: txt(c.benefits.heading, t),
            servicesHeading: txt(c.services.heading, t),
            servicesExtrasHeading: txt(c.services.extrasHeading, t),
            stepsHeading: txt(c.steps.heading, t),
            guaranteeHeading: c.guarantee.heading,
            guaranteeText: c.guarantee.text,
            localHeading: txt(c.local.heading, t),
            localIntro: txt(c.local.intro, t),
            testimonialsHeading: c.testimonials.heading,
            testimonialsIntro: c.testimonials.intro,
            faqHeading: c.faq.heading,
            finalHeading: txt(c.finalCta.heading, t),
            finalText: txt(c.finalCta.text, t),
            formAriaLabel: c.form.ariaLabel,
            formSending: c.form.sending,
            formSuccess: c.form.success,
            formError: c.form.error,
            formName: c.form.name,
            formEmail: c.form.email,
            formPhone: c.form.phone,
            formCity: c.form.city,
            formBrands: c.form.brands,
            formProblem: c.form.problem,
            formProblemHint: c.form.problemHint,
            formHasFile: c.form.hasFile,
            formYes: c.form.yes,
            formNo: c.form.no,
            formSubmit: c.form.submit,
            footerCopyright: c.footer.copyright,
            footerIntegratorLink: c.footer.integratorLink,
        },
    };
}

// Layout v2: same builder, fed with sharedV2 and the brand/location v2 overrides.
function v2Services(brand) {
    const { replace = {}, add = [] } = (brand.v2 && brand.v2.services) || {};
    return [
        ...sharedV2.services.items.map((item) => replace[item.key] || item.text),
        ...add,
    ];
}

// Every *-cutout.png has a .webp twin beside it (cwebp -q 90 -alpha_q 100); the PNG is the fallback.
function equipmentImg(e, style = '') {
    const img = `<img src="${escapeHtml(e.src)}" alt="${escapeHtml(e.alt)}" width="${e.width}" height="${e.height}" loading="lazy"${style ? ` style="${style}"` : ''}>`;
    if (!e.src.endsWith('-cutout.png')) return img;
    return `<picture><source srcset="${escapeHtml(e.src.replace(/\.png$/, '.webp'))}" type="image/webp">${img}</picture>`;
}

// Overlapping product group: `at` is [left, top, height] in px on a stage.width × stage.height
// canvas, emitted as percentages so the whole group scales down on phones.
function equipmentStage(stage, items) {
    const pct = (v, of) => `${+(v / of * 100).toFixed(2)}%`;
    const imgs = items.map((e) => {
        const [left, top, height] = e.at;
        return equipmentImg(e, `left:${pct(left, stage.width)};top:${pct(top, stage.height)};height:${pct(height, stage.height)}`);
    }).join('\n                        ');
    return `<figure class="ho-equipment-stage" style="width:${stage.width}px">
                        <div class="ho-equipment-canvas" style="aspect-ratio:${stage.width} / ${stage.height}">
                        ${imgs}
                        </div>
                        <figcaption>${escapeHtml(stage.caption)}</figcaption>
                    </figure>`;
}

function v2Testimonials(brand) {
    const items = sharedV2.testimonials.items;
    const first = items.find((q) => q.name === brand.v2.testimonialFirst);
    return first ? [first, ...items.filter((q) => q !== first)] : items;
}

function buildValuesV2(loc, brand) {
    const v2Loc = loc.v2 || {};
    const excluded = new Set(v2Loc.excludeAreas || []);
    const locV2 = {
        ...loc,
        areaGroups: loc.areaGroups.map((g) => ({ ...g, places: g.places.filter((p) => !excluded.has(p.name)) })),
        tie: 'tie' in v2Loc ? v2Loc.tie : loc.tie,
    };
    const brandV2 = { ...brand, symptoms: brand.v2.symptoms, titleName: brand.v2.titleName };
    // v2 has no separate extras list; the empty heading only satisfies the shared builder.
    const c = {
        ...sharedV2,
        problem: { ...sharedV2.problem, intro: brand.v2.problemIntro || sharedV2.problem.intro },
        services: {
            ...sharedV2.services,
            heading: brand.v2.servicesHeading || sharedV2.services.heading,
            items: v2Services(brand),
            extrasHeading: '',
        },
        testimonials: { ...sharedV2.testimonials, items: v2Testimonials(brand) },
    };

    const values = buildValues(locV2, brandV2, c);
    const tieLine = locV2.tie ? `<p class="ho-tie">${escapeHtml(locV2.tie)}</p>` : '';
    values.raw.partnerBlock = partnerBlock(locV2, c, tokensFor(locV2, brandV2), tieLine);
    values.raw.equipment = brand.v2.equipmentStage
        ? equipmentStage(brand.v2.equipmentStage, brand.v2.equipment)
        : (brand.v2.equipment || [])
        .map((e) => `<figure class="ho-equipment-card">
                        ${equipmentImg(e)}
                        <figcaption>${escapeHtml(e.caption)}</figcaption>
                    </figure>`)
        .join('\n');
    values.text.formSubmitNote = c.form.submitNote;
    values.text.formHasFileHint = c.form.hasFileHint;
    values.text.stickyCta = c.stickyCta.label.replaceAll('{brand}', brand.name);
    values.text.midCta = txt(c.midCta.label, tokensFor(locV2, brandV2));
    values.text.midCtaMicroline = txt(c.midCta.microline, tokensFor(locV2, brandV2));
    return values;
}

function applyTemplate(tpl, { raw, text }) {
    return tpl
        .replace(/\{\{\{(\w+)\}\}\}/g, (m, key) => {
            if (!(key in raw)) throw new Error(`homeowner template: unknown raw token ${key}`);
            return raw[key];
        })
        .replace(/\{\{(\w+)\}\}/g, (m, key) => {
            if (!(key in text)) throw new Error(`homeowner template: unknown token ${key}`);
            return escapeHtml(text[key]);
        });
}

/** Returns the full HTML for a valid page, or null. Output is cached. */
export function isPublishedPage(location, brand) {
    return publishedPages.some((p) => p.location === location && p.brand === brand);
}

export function renderPage(location, brand, { includeDrafts = false } = {}) {
    if (!isValidPage(location, brand)) return null;
    if (!includeDrafts && !isPublishedPage(location, brand)) return null;
    const key = `${location}/${brand}`;
    if (cache.has(key)) return cache.get(key);
    const loc = locations[location];
    const b = brands[brand];
    const out = b.layout === 'v2'
        ? applyTemplate(loadTemplate(TEMPLATE_V2_PATH), buildValuesV2(loc, b))
        : applyTemplate(loadTemplate(TEMPLATE_PATH), buildValues(loc, b));
    cache.set(key, out);
    return out;
}

const PUBLIC_PATHS = ['/consultation', '/faq', '/rti_proposal/', '/sentinel_lite/'];

export function renderSitemap() {
    const urls = [...PUBLIC_PATHS, ...publishedPages.map((p) => pagePath(p.location, p.brand))];
    const body = urls.map((u) => `  <url><loc>${escapeHtml(SITE_URL + u)}</loc></url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function renderRobots() {
    return [
        'User-agent: *',
        'Disallow: /analytics',
        'Disallow: /api/',
        '',
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        '',
    ].join('\n');
}
