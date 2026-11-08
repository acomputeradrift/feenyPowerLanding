# Homeowner landing pages — playbook

How the `/{location}/{brand}` pages work, what was decided on Lutron, and how to bring
RTI, Clipsal C-Bus and Vantage up to the same standard. Read `continuity.md` first.

## Status (2026-11-07)

| Brand | Layout | Live | Pages |
|---|---|---|---|
| Lutron | v2 | **Yes** (`published: true`) | vancouver, kelowna, los-gatos |
| RTI | v2 | **Yes** (2026-11-08) | vancouver, kelowna, los-gatos |
| Clipsal C-Bus | v1 | No | vancouver, kelowna |
| Vantage | v1 | No | vancouver, kelowna |

Agreed order of work: **RTI → Clipsal C-Bus → Vantage**, one brand at a time, each approved
by Jamie before it is published.

## How it fits together

- **Copy:** `backend/homeowner/content.js` (all of it). `shared` = v1 copy, `sharedV2` = v2 copy
  built on top of `shared`. Locations and brands are plain objects; `pages` lists valid combos.
- **Render:** `backend/homeowner/render.js` picks `frontend/homeowner/service_v2.html` when
  `brand.layout === 'v2'`, otherwise `service.html`. `{{x}}` is escaped, `{{{x}}}` is raw HTML
  built in render.js. JSON-LD (`ProfessionalService` + `FAQPage`) is generated from the same copy.
- **Styles:** `frontend/styles/homeowner.css`; v2-only rules are scoped under `.ho-v2`.
  Testimonial carousel reuses `/consultation`'s `testimonials.css` / `testimonials.js`.
- **Publishing:** a brand is public only with `published: true`. Everything else returns 404, is
  left out of `sitemap.xml` and out of the analytics dashboard. Locally, `HOMEOWNER_SHOW_DRAFTS=true`
  in `backend/.env` renders drafts. **Never set that on the server.**
- **Form:** `POST /api/homeowner-inquiry` (all fields required, honeypot, rate limit, Resend email).
- **Analytics:** cookieless beacon → `POST /api/analytics/event`; dashboard at `/analytics`
  (token-gated); weekly email Mondays 07:00 America/Vancouver.
- Node does not hot-reload: **restart the server after every content.js edit**, hard-refresh after CSS.

### Moving a brand to v2

1. In `brands[slug]` add `layout: 'v2'` and a `v2` block:
   - `titleName` — product name for `<title>` ("{titleName} Troubleshooting | {City}", ≤ 60 chars).
   - `problemIntro` — "A {product name} system is supposed to make life easier. Instead:"
   - `symptoms` — brand-specific "Sound familiar?" list (no two near-duplicate lines).
   - `equipment` — 2 photos of gear homeowners recognize (see Photos below).
   - `servicesHeading` — "What can I do for your {product name} system?"
   - `services.replace` (by key: `troubleshooting`, `changes`, `engraving`, `devices`, `files`,
     `upgrades`, `integrations`, `documentation`, `apps`) and `services.add` (extra brand lines).
2. Check `product` (hero subheading: "Remote {product} programming & troubleshooting for homeowners
   in {region}.") — Jamie trimmed Lutron's to exactly the products he wants to sell.
3. Add the brand's pages to the `v2Pages`-style tests in `render.test.js`.
4. When Jamie approves: `published: true`, commit, push, deploy.

## Already shared by every v2 brand (no work needed)

These live in `sharedV2` / `service_v2.html` / `homeowner.css` and apply automatically:

- **Section order:** Hero → brand & qualifications strip (dark grey band) → What clients say
  (carousel) → Sound familiar? (+ equipment photos) → Who am I? (photo) → What you get →
  What can I do… → How it works → Questions you may have → Let's get your {Brand} system working
  again + form → Serving {Region} + local partner (below the form, for SEO) → footer.
- **One CTA:** hero button "Fix my {Brand} system" jumps to the form (the phone sticky button
  uses the same label); submit reads "Send it!";
  "I will reply within 24 hours." under both. Sticky CTA button on phones. No other mid-page CTAs.
- **Promises:** reply within 24 hours; diagnosis within 48 hours **of receiving the project file**
  (never "or remote access"). Fixed-price diagnostic ($349 CAD / $249 USD). No hourly rate anywhere
  on the page — budgets are "a budget to complete the work". No guarantee. Never "repair".
  Never say the fee is credited toward the work. Never mention HomeWorks.
- **Voice:** first person "I". "I do the programming and testing remotely." No integrator/dealer
  framing (no "Trusted by integrators", no "For integrators & dealers" footer link).
- **Name:** "Feeny Power and Control Ltd." everywhere except inside client quotes.
- **Trust strip:** dealer credentials, 10 years electrical contracting, hundreds of systems,
  "**Remote work** with clients in 5 countries and counting!" (only the lead word is green).
- **What you get:** fixed-price diagnosis / you own your system / "Local help when needed"
  ("If something needs to be installed or replaced, my partner tech in {region} — or your own
  electrician — handles it, working from my scope.").
- **"And getting it fixed is its own headache."** list (5 generic items) and closing line.
- **FAQ** (h3 styling, body-text answers): cost; hardware problem; lose my scenes; installer has
  the file; worth fixing or upgrade; "How do you connect to my system to complete the work?";
  "Do I need to be home, or have someone onsite?" (partner can do first-session testing);
  how fast. Brand hooks: `connectFaq`, `fileNote`, `hardwareDevices` (hardware FAQ: "a failed
  {hardwareDevices}") and `onsiteExamples` (partner note: "hands onsite — {onsiteExamples}, a
  network sorted out"). Both default to the lighting wording (dimmer/keypad).
- **Testimonials:** "First L, City Country", no company. One list for all v2 brands today
  (Lisa P, Bob G, Sean S, Chris C, Brad K, Morgan M, Daniel T). Every page shows all of them;
  a brand may only pick its lead quote with `v2.testimonialFirst` (ask Jamie which one).
- **Vancouver** area list excludes Bowen Island (`locations.vancouver.v2.excludeAreas`).
- **Local partner block:** each location shows its partner's logo tile (Blue Ember, VanReit,
  Haven & Wire) with no italic tagline under it (`locations[slug].v2.tie: null` everywhere).

## Needs Jamie's input per brand (ask one question at a time)

1. **Title product name** (Lutron: "Lutron Lighting Control").
2. **Hero product line** — which products to name (Lutron dropped Caséta on purpose).
3. **Sound familiar? symptoms** — real problems homeowners describe; avoid near-duplicates.
4. **Equipment photos** — which 2 devices (e.g. RTI: a handheld remote + a touchscreen/keypad).
5. **Device line:** "Adding or replacing system devices — {list}." (Lutron: "processors, dimmers,
   switches, keypads and Pico remotes.").
6. **Services** replacements/additions and the troubleshooting detail.
7. **Testimonial order** for that brand.
8. **Credential** line (Clipsal has one about being one of the few trained C-Bus installers in Canada).
9. **Connect options** (`connectOption` / `connectFaq`), e.g. a brand cloud service.
10. **Hardware wording** (`hardwareDevices`, `onsiteExamples`) if dimmers/keypads don't fit the brand.

Existing v1 brand copy (`symptoms`, `extras`, `credential`) is a starting point, not approved copy.

## Photos

- Equipment: transparent PNG cut-outs cropped tight to the device, saved at **600px tall**
  with a rounded-corner alpha mask and a soft drop-shadow — no white boxes. Keep originals; save
  as `*-cutout.png`.
- Layout (approved 2026-11-08, Lutron and RTI): an overlapping product group beside the symptoms
  (`v2.equipmentStage` = 340×290 canvas + one caption; each item's `at: [left, top, height]`).
  Devices of the same kind are drawn to real scale with each other (Lutron keypads 4.69" vs Pico
  2.6"; RTI T2x 10.0" = 210px vs T4x 8.3" = 174px). The RTI KA11 is not scaled to the remotes.
  Brands without `equipmentStage` fall back to the plain equal-height row. Pillow venv: `/tmp/imgvenv`
  (recreate with `python3 -m venv /tmp/imgvenv && /tmp/imgvenv/bin/pip install pillow` if missing).
- Engraving text on keypads: grey `(102,102,102)`, not black.

## Shared changes pending for Lutron (decided during RTI, 2026-11-08)

Already applied to Lutron at Jamie's request (unpublished locally until deployed):

- Brad K's quote trimmed to its first and last paragraphs (shared — every v2 brand).
- Every page shows every testimonial in the shared order, except the lead quote:
  `v2.testimonialFirst` moves one quote to the front (Lutron: Sean S; RTI: Bob G).
- Lutron's equipment has a third photo, Pico Remote (`lutron-pico-cutout.png`), and uses the
  overlapping product group (see Photos).
- **Services list max 10 items** per brand (enforced by `render.test.js`; Lutron is at 10).
- Hero and sticky CTA read "Fix my {Brand} system" (was "Tell me what's wrong").
- Testimonial carousel is centred in the column (was pinned left).
- "Serving {Region}" intro says "anything that needs to be done onsite" — "hands onsite" is
  used once per page, in the partner note.
- "Your own electrician" is the `localTrade` brand hook (RTI: "AV technician").

## Open items

- **Local partner approvals and coverage (2026-11-08).** Blue Ember (Vancouver) approved all
  brands. VanReit (Kelowna) does RTI, Vantage and Clipsal but **not Lutron**; Jamie sends him the
  live Kelowna RTI page for review. Haven & Wire (Los Gatos) does Lutron and RTI, not Vantage or
  Clipsal. The live Kelowna Lutron page still names VanReit as the local partner — needs a decision.

- All three partner logos are in (`locations[slug].partner.logo`). A new partner's logo sits in a
  96px square tile: make a 400×400 PNG on the logo's own background colour, centred, stacking
  wide logos (mark above wordmark).
- Live form test in production (submit once, confirm the email arrives).

## Working with Jamie

- Ask questions **one at a time** in chat.
- He often edits text directly in the browser preview; apply exactly what he typed, fix obvious
  typos, and say so.
- Show visual changes with a screenshot. He prefers minimal, targeted changes ("only the background").
- Do not commit, push or deploy unless he asks.
