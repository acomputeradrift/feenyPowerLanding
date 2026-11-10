# SEO audit — landing pages (2026-11-08)

Done with the `/seo-page` skill against production (which matched the committed code on
2026-11-08). **Nothing here is implemented yet.** Companion to `docs/cro_audit.md`.

## Decision: no internal links

The homeowner pages are single-purpose landing pages. **Do not link them to or from
`/consultation`, and do not link them to each other.** Discovery comes from `sitemap.xml` (already
lists every published page) and from outside links:

- Submit `sitemap.xml` in Google Search Console.
- Google Business Profile website link → main city page.
- Local partners (Blue Ember, Haven & Wire) linking to their city's page from their sites. Kelowna
  has no named partner (2026-11-09).
- Directory and manufacturer dealer-locator listings.

## Scores

| Page | Overall | On-page | Content | Technical | Schema | Images |
|---|---|---|---|---|---|---|
| Homeowner pages (all 10) | 73 | 72 | 68 | 85 | 65 | 75 |
| `/consultation` | 33 | 35 | 40 | 30 | 0 | 55 |

Homeowner pages already do well on: unique 44–56 char titles, self-canonical, one H1, logical
headings, Open Graph, alt text and dimensions on every image, lazy loading, ~1,800 words, strong
E-E-A-T in "Who am I?", HTTP → HTTPS 301.

## Priorities

### 1. Unique local content per city (needs Jamie's input; visible change)

Vancouver Lutron vs Kelowna Lutron differ only in city, partner and area list — the doorway-page
pattern Google may fold into one result. With no internal links, each page has to rank on its own
content. Options: a local lead testimonial (Lisa P on Kelowna pages), the existing per-location
`tie` lines (currently `null` in v2), local examples. Lines up with the CRO audit's
"lead quote matched to the visitor" test.

### 2. Longer meta descriptions (invisible on the page)

Currently ~100 chars (`sharedV2.seo.description`); target 150–155 (`fitDescription` in `render.js`
falls back to `descriptionShort` above 155). Example (128 chars):
"Remote Lutron troubleshooting & programming for Vancouver homeowners. $349 CAD fixed-price
diagnosis, reply within 24 hours." Check the longest combo (Clipsal C-Bus + Los Gatos-length city)
stays ≤ 155.

### 3. WebP images (looks identical)

Over budget: `clipsal-thermostat-cutout.png` 768 KB, `rti-ka11-white-cutout.png` 461 KB (critical),
`clipsal-saturn-dlt-cutout.png` 330 KB (warning). Convert all `*-cutout.png` to WebP (keeps alpha),
keep the PNG originals, serve via `<picture>` with the PNG as fallback. Compare side by side
before shipping. Pillow venv notes are in `docs/homeowner_pages/README.md` § Photos.

### 4. Schema cleanup (invisible)

In `buildJsonLd` (`backend/homeowner/render.js`):

- One business entity with a stable `@id` (`https://www.feenypowerandcontrol.com/#business`) instead
  of a new `ProfessionalService` per page; each page gets a `Service` with `provider` → that `@id`.
- `areaServed` cities get `containedInPlace` (British Columbia / California) — Richmond, Delta,
  Surrey are ambiguous.
- Optional, only if Jamie wants them public: `telephone`, `email`, `sameAs` (Google Business Profile).
- Keep `FAQPage` but expect no FAQ rich results (retired). Never add HowTo.

Shape:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfessionalService",
      "@id": "https://www.feenypowerandcontrol.com/#business",
      "name": "Feeny Power and Control Ltd.",
      "url": "https://www.feenypowerandcontrol.com/",
      "logo": "https://www.feenypowerandcontrol.com/images/feeny-logo-512-circle-black-back.png",
      "founder": { "@type": "Person", "name": "Jamie Feeny" }
    },
    {
      "@type": "Service",
      "@id": "https://www.feenypowerandcontrol.com/vancouver/lutron#service",
      "name": "Remote Lutron programming & troubleshooting",
      "serviceType": "Lighting control programming",
      "provider": { "@id": "https://www.feenypowerandcontrol.com/#business" },
      "areaServed": [
        { "@type": "City", "name": "Vancouver",
          "containedInPlace": { "@type": "AdministrativeArea", "name": "British Columbia" } }
      ],
      "offers": { "@type": "Offer", "name": "Remote Lutron diagnostic", "price": "349", "priceCurrency": "CAD" }
    },
    { "@type": "FAQPage", "@id": "https://www.feenypowerandcontrol.com/vancouver/lutron#faq", "mainEntity": [] }
  ]
}
```

### 5. `/consultation` head tags (invisible on the page)

Add to `frontend/consultation.html` `<head>` only: meta description, self canonical
(`https://www.feenypowerandcontrol.com/consultation`), Open Graph + Twitter tags, and a JSON-LD
block referencing the same `#business` entity. Also safe and invisible: `width`/`height` on its four
images (at their current rendered size) and `defer` on `consultation.js` / `testimonials.js` (check
the Calendly buttons still work). Do not edit `consultation.css` or `global.css`.

Visible changes for later, only with Jamie's OK: keyword headline (e.g. "Remote Lutron, RTI &
Vantage Programming for Integrators"), more body content, Clipsal logo, © 2025.

## Other findings (not prioritized)

- `/` → `/consultation` is a 302; a 301 is better (`fpc_server.js`).
- Non-www (`feenypowerandcontrol.com`) serves pages with 200; canonical covers it, but a 301 to www in
  nginx is cleaner.
- One shared OG image (512px round logo, `summary` card) on every page; a 1200×630 per-brand image
  with `summary_large_image` would improve shared links (visible only in link previews).
- H1 on homeowner pages has no city or "programming/troubleshooting" — those terms are only in the
  title and subhead (visible change; Jamie's call).
- `global.css` loads Rubik via `@import` (late, render-blocking) and has no fallback font.
- `/consultation` has unclosed `<span>`s in the h1 and benefit h3s.
