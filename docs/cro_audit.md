# CRO audit — landing pages (2026-11-08)

Conversion audit of every landing page, done with the `/cro` skill. **Nothing here is implemented yet.**
Based on reviewing the rendered pages on localhost (desktop + 390px phone), not on data — the
`/analytics` numbers and traffic sources were not available. Items marked **(reverses a decision)**
undo something Jamie approved in `docs/homeowner_pages/README.md`; ask before doing them.

Open questions for Jamie that would sharpen this: where traffic comes from (paid, organic, links he
sends), and current numbers from `/analytics`.

## Homeowner pages (`/{location}/{brand}`, all 10 live pages)

All pages share the v2 template and `sharedV2` copy, so each fix applies everywhere. Copy edits are
in `backend/homeowner/content.js`.

**Keep:** clear hero, "Fix my {Brand} system" CTA, single CTA with phone sticky button, fixed price,
"you own your file", trust strip right under the hero.

### Quick wins
- **Brad K's testimonial mentions HomeWorks** ("a very large HomeWorks lighting and shading system"),
  which breaks the never-mention-HomeWorks rule. It shows on every page. Quotes are verbatim, so get
  Brad's OK to change it to "Lutron" or cut the sentence.
- **Price in the hero.** The fixed-price diagnostic first appears four sections down. Proposed
  microline: "$349 CAD fixed-price diagnosis · Reply within 24 hours." (use `{price}`).
- **Surface the risk reducer.** "If I can fix it within the diagnostic price, I just fix it" is buried
  in How it works step 3. Put it near the price / under the submit button.
- **Project file hint.** The required "Do you have the project file?" question confuses homeowners.
  Add a hint: "Not sure? Choose No — most people don't have it."

### Bigger changes
- **Form friction (reverses a decision).** Eight required inputs. City is already known from the URL
  and a required phone deters cold visitors. Make phone and city optional. Likely the biggest lever.
  Touches `service_v2.html`, `homeowner_form.js` validation and the `POST /api/homeowner-inquiry` checks.
- **Desktop mid-page CTA (reverses a decision).** The sticky CTA is phone-only, so desktop has no CTA
  between the hero and the form ~8 sections down. Add one after How it works, or run it as a test.
- **Post-submit next step.** The form just resets with one line. Say what happens next, e.g. "I'll
  email you within 24 hours. If you can, find out who installed your system — it helps me get the
  project file."
- **Kelowna Lutron partner.** Names VanReit, who doesn't do Lutron. Trust risk if a homeowner relies
  on it. Jamie said keep it for now.

### Test ideas
- Lead quote matched to the visitor; the carousel auto-rotates so most people read only the first.
  Morgan M and Daniel T are dealer quotes, not homeowners.
- A phone number or "text me" link beside the form.
- Submit label "Get my diagnosis started" vs "Send it!".

### Hero line alternatives
1. "$349 fixed-price diagnosis. Reply within 24 hours."
2. "Diagnosis within 48 hours of getting your project file — or I just fix it."
3. "No new equipment pitch. Just your system, working."

## Dealer consultation page (`/consultation`)

Audience is integrators/dealers. Do not edit `global.css` or `consultation.css` without Jamie's OK.

### Quick wins
- **Headline doesn't name the audience.** "Unlock Seamless Smart Home Integration With Remote System
  Programming" is generic; the benefits target integrators but the hero never says so.
- **Logo row.** Vantage logo is cut off at 1024px wide; all logos are tiny on phones; Clipsal C-Bus
  is missing.
- **Closing CTA.** "Ready to Transform Your Smart Home Projects?" / "Let's Go!" → e.g. "Book my free
  30-minute call."
- **Housekeeping.** © 2025, no meta description, unclosed `<span>`s in the h1 area and benefit h3s.

### Bigger changes
- **No analytics.** `fpc_analytics.js` isn't loaded and the backend only counts homeowner pages, so
  Calendly clicks aren't measured. Do this first.
- **Thin proof and detail.** Two testimonials; no how it works, turnaround, pricing signal, or links
  to `/faq` and `/rti_proposal/`. The budget form is a good secondary CTA for dealers still
  researching. Brad K (integrator) and Haven & Wire would be good extra quotes.
- **Font fallback.** `global.css` sets `font-family: "Rubik"` with no fallback, so first paint is
  Times until Rubik loads. Fix is in `global.css` (needs Jamie's OK).

### Headline alternatives
1. "Your remote Lutron, RTI, Vantage and C-Bus programmer."
2. "Programming and commissioning for integrators — done remotely, documented properly."
3. "Fewer truck rolls. Fewer callbacks. Expert programming without hiring."

## Suggested order

1. Homeowner quick wins (copy only, `content.js`) and analytics on `/consultation`.
2. Form friction and post-submit message, once Jamie decides.
3. Consultation headline, logos and proof.
