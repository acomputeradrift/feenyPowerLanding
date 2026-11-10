# Landing pages — leftover work

What's left from `docs/cro_audit.md` and `docs/seo_audit.md` (both 2026-11-08). Those docs have the
reasoning; this is the to-do list. Homeowner pages first, `/consultation` last.

## Done and deployed 2026-11-09

- **Kelowna has no named local partner** (Jamie). No partner tile on the four Kelowna pages; the
  copy says "my local partner" with no name (`locations.kelowna.partner: null`). Commit `268c3eb`.
- **Optional phone back on the form**, labelled "Phone (optional)"; email stays required. Same commit.
- **Jamie's own traffic is left out of analytics.** Events and leads from a device holding the
  dashboard cookie are saved with `test: true` and skipped by the dashboard and weekly email; test
  lead emails say "[TEST]". The pre-launch test data (20 events, 1 lead) was deleted. Commit `21896bb`.

## Done and deployed 2026-11-08

Homeowner pages only:

- **Meta descriptions** lengthened to 137–149 chars: "…{price} fixed-price diagnosis, reply within
  24 hours. You own the file." (`sharedV2.seo` in `content.js`).
- **WebP cutouts.** Every `*-cutout.png` has a `.webp` twin (`cwebp -q 90 -alpha_q 100 -m 6`, about
  93% smaller, alpha identical). `equipmentImg()` in `render.js` wraps them in `<picture>` with the PNG
  as fallback. Checked against `HEAD`: same page height, same text, same image positions. **New cutouts
  need a `.webp` made the same way.**
- **Schema.** One `ProfessionalService` with `@id` `https://www.feenypowerandcontrol.com/#business`
  shared by every page, plus a `Service` per page (`provider` → that id) and the `FAQPage`. Area cities
  carry `containedInPlace` from the new `locations[slug].adminArea`.
- **Price near the hero CTA** (Jamie agreed): hero microline is "{price} fixed-price diagnosis. You will
  get a reply within 24 hours."
- **Mid-page CTA** (Jamie agreed): "Fix my {Brand} system" button + the same microline at the end of
  "Who am I?" — about halfway down, well clear of the form (`data-cta="mid"`, `sharedV2.midCta`).
  Not after How it works: that sits right above the form. The phone sticky CTA hides while it's on
  screen.
- **Form: city removed, phone optional** (Jamie). `city` is filled from the page's location
  (`validate.js`), so lead emails and the dashboard still show it. Phone was removed on 2026-11-08
  and put back on 2026-11-09 as "Phone (optional)"; email stays required.
- **Project-file hint:** "Select No if you are not sure." (`sharedV2.form.hasFileHint`).

Jamie approved all of the above 2026-11-08; `docs/homeowner_pages/README.md` is updated to match.

## Homeowner pages — still to do

### Needs Jamie's input
- **Brad K's quote mentions HomeWorks** (breaks the never-mention-HomeWorks rule; on every page).
  Needs Brad's OK to change to "Lutron" or cut the sentence.
- **Unique local content per city** — top SEO item. City pages are near-duplicates (doorway-page
  risk), and with no internal links each must rank on its own. Ideas: local lead testimonial (Lisa P
  on Kelowna), the existing `tie` lines (now `null` in v2), local examples.
### Copy-only quick wins
- Put "If I can fix it within the diagnostic price, I just fix it" near the price / submit button.
- Post-submit message with a next step, e.g. "I'll email you within 24 hours. If you can, find out
  who installed your system — it helps me get the project file."

### Off-site (no code)
- Submit `sitemap.xml` in Google Search Console.
- Google Business Profile website link → main city page.
- Ask Blue Ember and Haven & Wire to link to their city's page.
- Directory and manufacturer dealer-locator listings.

### Smaller SEO items
- 1200×630 OG image per brand + `summary_large_image` (visible only in link previews).
- City / "programming" wording in the H1 (visible; Jamie's call).
- `global.css` loads Rubik via `@import` with no fallback font — shared file, needs Jamie's OK.
- `/` → `/consultation` is a 302 (should be 301); non-www serves 200 (301 to www in nginx).

### Test ideas (CRO)
- Lead testimonial matched to the visitor (Morgan M and Daniel T are dealer quotes).
- Phone number or "text me" link beside the form.
- Submit label "Get my diagnosis started" vs "Send it!".

## Agent readiness (`/seo-agentic`, 2026-11-08)

Lighthouse 13.6.0 Agentic Browsing on `/vancouver/lutron`: **2/2 mobile, 2/2 desktop** (production),
2/2 on localhost with the new form. Accessibility tree and CLS (0 / 0.014) pass; WebMCP, llms.txt and
ARD audits were N/A. All pages are server-rendered, unknown URLs return a real 404, and every AI user
agent tested (GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-User, PerplexityBot,
Perplexity-User, Google-Extended, Googlebot — unverified UA tokens only) gets a 200. No P0 failures.

Left to do:
- **Honeypot label (P1, invisible).** The hidden "Website" field is out of the accessibility tree, but
  agents that read the DOM can see it. If one fills it, the API pretends success and the lead is
  silently dropped. Label it "Leave this field empty" (still hidden from people).
- **AI access policy (Jamie's decision).** `robots.txt` has only a `*` group and no Content-Signal.
  Decide training vs search vs user-triggered agents separately, then add groups / Content-Signal.
- **Optional:** `llms.txt`; Markdown versions of the pages; a WebMCP tool for the inquiry form
  (draft standard, Chrome only — keep a human confirmation step).
- Minor: the carousel exposes one testimonial at a time to the tree (others `aria-hidden`); unchecked
  required radios read as invalid before any interaction.

## `/consultation` — later

Never link it to the homeowner pages (Jamie's decision). Don't edit `global.css` / `consultation.css`
without Jamie's OK.

- **Invisible:** meta description, self canonical, Open Graph / Twitter tags, JSON-LD pointing at the
  `#business` entity, `width`/`height` on its four images, `defer` on `consultation.js` /
  `testimonials.js` (check Calendly still opens).
- **Analytics:** `fpc_analytics.js` isn't loaded and the backend only counts homeowner pages, so
  Calendly clicks aren't measured.
- **Visible (Jamie's OK):** headline that names the audience and brands (e.g. "Your remote Lutron,
  RTI, Vantage and C-Bus programmer"), stronger closing CTA than "Let's Go!", logo row (Vantage clipped
  at 1024px, tiny on phones, Clipsal missing), more proof (Brad K, Haven & Wire), © 2025, unclosed
  `<span>`s.
