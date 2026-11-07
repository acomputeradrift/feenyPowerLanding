# Conversion Evidence: Landing Page Recommendations

**Prepared for:** Jamie Feeny, Feeny Power and Control Ltd.
**Date:** November 2026
**Scope:** Evidence-backed rationale for seven proposed changes to `consultation.html` (home/landing) and `faq.html` (Dealer FAQ). No live-site changes are included in this document or its associated PR.

**Business context for every recommendation below:**
Feeny Power and Control sells remote RTI programming to dealers and integrators at $100 USD/hour, time and materials. The closer is the proposal form at `/rti_proposal/`, not Calendly/Zoom. There are no fixed prices, no "free consultation," and no credits toward the job. Discovery is paid scope hours. The primary audience is dealers and integrators, not homeowners.

---

## Summary recommendation

| # | Change | Priority | Ship with |
|---|--------|----------|-----------|
| 1 | Home hero + bottom CTA to FAQ and/or `/rti_proposal/` | High | Wave 1 |
| 2 | FAQ header + bottom CTA to `/rti_proposal/` | High | Wave 1 |
| 3 | FAQ "get started" answer: form first, call secondary | High | Wave 1 |
| 4 | Kill "free" consultation copy; paid-scope framing | High | Wave 1 |
| 5 | State $100 USD/hr T&M once on FAQ | High | Wave 1 |
| 6 | Home copy tilt to dealers/integrators | High | Wave 1 (with items 1-5) |
| 7 | Phone/email secondary under FAQ form CTA | Secondary | Wave 2 or skip |

Items 1 through 5 reinforce each other and should ship together. Item 6 is a copy change that belongs in the same pass. Item 7 is optional and depends on whether multi-channel contact aligns with Jamie's capacity to answer calls during business hours.

---

## Item 1: Home hero + bottom CTA to FAQ and/or `/rti_proposal/`

### What the current live page does wrong

`frontend/consultation.html`, lines 28-31:

```
<div class="book-a-free">
    <p><span class="text-dark-grey">Book a Free 30-Minute Zoom Consultation</p>
</div>
<button id="calendly-button-top" class="calendly-button calendly-button-upper">
    Get Your Free Consultation
</button>
```

And the bottom CTA at lines 93-98:

```
<section class="cta" id="signup">
    <h2>Ready to Transform Your Smart Home Projects?</h2>
    <p>Let us show you how our services can save time, cut costs, and optimize your installations.</p>
    <button id="calendly-button-bottom" class="calendly-button calendly-button-lower">
        Let's Go!
    </button>
</section>
```

Both CTAs open the Calendly popup (via `frontend/scripts/consultation.js`). The primary conversion path forces every visitor through a Zoom scheduling step, bypassing the self-service proposal tool that already exists at `/rti_proposal/`.

### Proposed change

Replace the hero CTA with a link to `/rti_proposal/` ("Get a time budget for your project") or to `/faq` ("See dealer FAQ"). Replace or supplement the bottom CTA the same way. Demote Calendly to a secondary text link or remove it from the home page entirely.

### Why it helps conversion for this business

The proposal form at `/rti_proposal/` is a self-service estimator: dealers enter project details and get a time budget immediately. This is exactly the self-service tool that B2B buyers prefer over scheduling a call. The current home page sends 100% of traffic to a Zoom booking step that requires coordinating calendars, which is friction that the proposal tool eliminates.

Replacing the CTA with a form path also reduces competing conversion goals. The home page currently has two Calendly buttons (hero and bottom), partner logos, and the testimonials section. Each additional CTA competing for attention reduces conversion on the primary action.

### Evidence

1. **Unbounce (18,639 landing pages):** Single-CTA landing pages convert at 13.5%, two-CTA pages at 11.9%, and three-or-more at 10.5%. Each competing CTA reduces conversion through decision fatigue.
   - Source: Unbounce Landing Page Analyzer study, reported widely.
   - URL: https://foundrycro.com/blog/cta-button-conversion-rate-benchmarks-2026/
   - Also: https://blog.conversionlab.no/insight/one-cta-beats-five-by-29-2/

2. **Gartner (632 B2B buyers, 2025):** 61% of B2B buyers prefer a rep-free buying experience. Buyers favor self-service tools for research and general information; they prefer seller input only for context-specific questions about fit.
   - URL: https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-sales-survey-finds-61-percent-of-b2b-buyers-prefer-a-rep-free-buying-experience

3. **Marcus Sheridan / Priceguide (50,000+ leads, 2025-2026):** Pricing estimators convert at 41% versus 3-4% for "contact us" pages. "Get an Instant Price Estimate" pages convert at 67% versus 9% for "Call for Quote" pages.
   - URL: https://www.linkedin.com/posts/marcussheridan_did-you-know-the-average-contact-us-page-activity-7384199781813821441-D0QI
   - URL: https://www.linkedin.com/posts/marcussheridan_after-2-years-and-hundreds-of-thousands-of-activity-7501280169962291201-HKU1
   - Note: These are vendor-reported numbers from Priceguide's own customer base, not peer-reviewed research. Directionally strong but treat the specific percentages with appropriate caution.

4. **Baymard Institute (950+ hours usability testing):** Primary CTAs labeled "Get Started" that lead to a page requesting personal information cause severe abandonments because the destination does not match user expectations. The recommendation is to avoid requesting personal information immediately after clicking a CTA and instead describe the service or tool first.
   - URL: https://baymard.com/research-articles/meal-kits-launch

5. **Nielsen Norman Group:** CTA labels must have high "information scent" — they should tell the user exactly what will happen next. "Let's Go!" is a low-information-scent label. "Get a time budget for your project" tells the user exactly what they receive.
   - URL: https://www.nngroup.com/articles/link-promise/
   - URL: https://www.nngroup.com/articles/3-ia-mistakes/

---

## Item 2: FAQ header + bottom CTA to `/rti_proposal/`

### What the current live page does wrong

`frontend/faq.html`, lines 27-29 (header CTA):

```
<button id="calendly-button-top" class="calendly-button calendly-button-upper" type="button">
    Get Your Free Consultation
</button>
```

And lines 93-99 (bottom CTA):

```
<section class="cta" id="signup">
    <h2>Ready to clear your programming backlog?</h2>
    <p>Book a free 30-minute Zoom to scope remote RTI support for your next install.</p>
    <button id="calendly-button-bottom" class="calendly-button calendly-button-lower" type="button">
        Let's Go!
    </button>
</section>
```

The FAQ page is the most intent-rich page on the site: a dealer reading FAQ answers is actively evaluating whether to engage. Both the header and footer CTAs route this high-intent traffic to Calendly instead of to the proposal form, which already exists and is already linked within individual FAQ answers.

### Proposed change

Replace both Calendly CTAs with links to `/rti_proposal/` ("Enter your project" or "Get a time budget"). Drop or demote Zoom booking to a secondary text link below the primary CTA.

### Why it helps conversion for this business

A dealer on the FAQ page has already read enough to be interested. The form at `/rti_proposal/` is the shortest path to a concrete engagement: the dealer enters project details and gets a time budget without scheduling a call or waiting for a callback. The current Calendly CTA introduces unnecessary friction (pick a time, wait for the meeting, have the meeting, then get a budget) for someone who could get the same output in minutes via the form.

### Evidence

1. **Gartner (2025):** B2B buyers prefer digital self-service for information-gathering and move to seller interaction only for context-specific fit questions. A dealer who has read the FAQ is in information-gathering mode; the form is the self-service tool that matches this stage.
   - URL: https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-sales-survey-finds-61-percent-of-b2b-buyers-prefer-a-rep-free-buying-experience

2. **Google/NRG B2B Buyer Journey (2025, 2,063 senior leaders):** 86% of B2B buyers rank pricing among their top five evaluation criteria. Buyers access pricing information early and anonymously before ever contacting a vendor. The proposal form satisfies this need; Calendly does not.
   - URL: https://www.nrgmr.com/resources/Google%20B2B%20Buyer%20Journey_October_2025.pdf
   - Reporting: https://www.digitalcommerce360.com/2025/12/05/google-survey-of-b2b-buyers/

3. **HubSpot pricing page redesign:** When HubSpot tested "Contact Sales" versus "Talk to Sales" CTA copy, the more specific copy increased click-through rate by 46%. CTA labels should describe the specific next action.
   - URL: http://waynelockwood.blogspot.com/2018/01/how-hubspots-pricing-page-redesign.html

4. **Nielsen Norman Group (CTA formula):** Effective CTAs follow a three-step formula: actionable verb, set expectations, communicate value. "Enter your project" follows this formula. "Let's Go!" does not.
   - URL: https://www.nngroup.com/videos/3-step-ctas-formula-for-conversion/

---

## Item 3: FAQ "get started" answer — form first, optional call second

### What the current live page does wrong

`frontend/faq.html`, lines 83-86 (the "What do I need to do to get started?" answer):

```
<p>Either <a href="/rti_proposal/">enter your project here</a> or
<a href="#signup">book an intro call</a> and I will walk you through it.</p>
```

The answer presents the form and the Zoom booking as equal alternatives connected by "Either...or." This splits the dealer's attention at the moment of highest intent — they have just asked "how do I start?" — and gives equal weight to a 30-second self-service form and a calendar-coordination step.

### Proposed change

Lead with the form as the primary action. Make the call a soft secondary option below it: "Start by entering your project details. If you would prefer to talk it through first, you can email me at feeny.jamie@gmail.com."

### Why it helps conversion for this business

The form produces a concrete output (a time budget) that is useful to the dealer regardless of whether they proceed. The Zoom call produces nothing until the call actually happens, and scheduling introduces days of delay. Presenting both as equal options triggers choice overload at the decision point.

### Evidence

1. **GetUplift / HVAC company CRO study:** When an HVAC company's mobile homepage presented two CTAs ("Call Now" and "Click to Book") as equal alternatives, users were confused. Removing the secondary CTA increased click-to-call conversions by 18% and increased form completion rate by 45% among those who reached the form. The explanation: "Prospects in a state of urgency were getting stuck in the form and were actively dropping off. By removing the CTA, we introduced a simpler filtering mechanism."
   - URL: https://getuplift.co/the-psychology-of-a-cta-button/
   - Note: This is an HVAC case study, not custom integration. The mechanism (choice overload at the conversion point) is transferable.

2. **Unbounce (18,639 landing pages):** Pages with a single CTA goal convert at 13.5% versus 10.5% for pages with three or more competing actions. The exception is long-form pages where the same CTA is repeated at different scroll depths — that is repetition, not competition. "Either X or Y" is competition.
   - URL: https://foundrycro.com/blog/cta-button-conversion-rate-benchmarks-2026/

3. **Nielsen Norman Group:** "If you have multiple, competing calls-to-action, they diminish each other's salience." Each CTA on a page should have high information scent and should not compete with another CTA at the same decision point.
   - URL: https://www.nngroup.com/articles/3-ia-mistakes/

4. **TDM Insights / The One-CTA Rule:** "A page with five calls to action does not give the reader five chances to convert. It gives them zero." The recommendation is one primary CTA per page matched to the funnel stage; everything else becomes a quiet secondary link.
   - URL: https://tdminsights.com/insights/the-one-cta-rule-one-ask-per-page-wins/

---

## Item 4: Kill "free consultation" copy; replace with paid-scope framing

### What the current live page does wrong

Multiple instances of "free" framing across both pages:

`frontend/consultation.html`, line 28:
```
Book a Free 30-Minute Zoom Consultation
```

`frontend/consultation.html`, line 31:
```
Get Your Free Consultation
```

`frontend/faq.html`, line 28:
```
Get Your Free Consultation
```

`frontend/faq.html`, line 90:
```
Free first call to plan your next project.
```

`frontend/faq.html`, line 95:
```
Book a free 30-minute Zoom to scope remote RTI support for your next install.
```

`frontend/faq.html`, lines 45-46 (within the "Can you help me design..." answer):
```
First call is always free while we come up with a plan.
```

The word "free" appears six times across the two marketing pages. This signals to professional dealers that:
(a) the initial work has no value,
(b) the business model is unclear, and
(c) the "free" call is a sales pitch disguised as consulting.

### Proposed change

Remove all "free consultation" copy. Replace with paid-scope framing: "The first hours are discovery and scope, billed at the same T&M rate as all other work." Never promise that discovery hours are "credits toward the job" — they are real work that produces a real deliverable (scope definition, system architecture, time budget).

### Why it helps conversion for this business

Jamie's service is expert professional work billed at $100/hr. Calling the first interaction "free" undermines the rate card. Dealers evaluating subcontractors understand that professional time has cost; the "free" label can trigger suspicion that the call is a sales pitch rather than real scope work. Paid framing signals confidence, filters for serious buyers, and aligns the first interaction with the ongoing business relationship.

### Evidence

1. **Ariely et al. (Marketing Science, 2007) — "Zero as a special price":** Zero price does not just reduce cost; it changes the psychological category of the interaction from a market exchange to a social exchange. When professional consulting is offered for free, the recipient no longer evaluates it as expert advice — they evaluate it as a favor, which they feel less committed to act on.
   - URL: https://web.mit.edu/ariely/www/MIT/Papers/zero.pdf

2. **Hang Seng University study — "The impact of free and exaggerated prices on perceived quality of services":** When services are offered for free, they are perceived as lower quality than when offered at a price within the normal range. This directly applies: a $0 first call followed by $100/hr work creates a price-quality inconsistency.
   - URL: https://scholars.hsu.edu.hk/en/publications/the-impact-of-free-and-exaggerated-prices-on-perceived-quality-of/

3. **CXL — "When 'Free' Converts (and When It Doesn't)":** Adding a price can act as a lead qualifier. CXL's own agency page includes a price tier on the intake form to filter leads, accepting higher friction in exchange for higher quality. For a solo practitioner at $100/hr, lead quality matters more than lead volume.
   - URL: https://cxl.com/blog/when-free-converts-and-when-it-doesnt/

4. **ZenWeb operational data (500+ SME campaigns, 2024-2026):** Free consultations with no named deliverable book the most people (61 per 100 enquiries) but close only 6.1%. Free scoped audits with a named deliverable book fewer (34 per 100) but close at 24.3%. The close rate quadruples when the consultation has a defined, valuable deliverable rather than being positioned as a generic "free chat."
   - URL: https://zenweb.my/blog/free-consultation-offers/
   - Note: ZenWeb is a Malaysian SME operator; figures are from their own managed campaigns, not peer-reviewed research. The directional pattern (defined deliverable beats open-ended free chat) is well-supported by the other sources above.

5. **Caletus — "Paid discovery call vs free consultation":** "Charge for a discovery call that gives defined, useful advice the client keeps either way." When the call delivers real work (scope definition, architectural advice), charging for it signals that the advice has standalone value.
   - URL: https://www.caletus.com/resources/blog/paid-discovery-call-vs-free-consultation

**Honest caveat:** The academic evidence (Ariely, Hang Seng) establishes the psychological mechanism. The ZenWeb and Caletus data are strong directional evidence from practitioners. There is no large-scale, peer-reviewed study that specifically measures the effect of "free consultation" versus "paid discovery" for professional B2B services. The weight of evidence is directional, not definitive. Recommend shipping the change and measuring close rate per lead source.

---

## Item 5: State $100 USD/hr T&M once on FAQ; point to proposal tool for hours

### What the current live page does wrong

`frontend/faq.html`, lines 50-52 (the "How much will my project cost?" answer):

```
<p>Use this <a href="/rti_proposal/">proposal tool</a> to get real numbers on your
actual project immediately. This resource is always available to you when a new
opportunity comes up.</p>
```

The FAQ answers the pricing question by linking to the proposal tool, which is correct, but never states the hourly rate. A dealer reading the FAQ cannot determine the actual cost of the service without completing the entire proposal form. This forces the highest-intent buyer action (pricing research) behind a multi-step form.

No page on the live site states the rate.

### Proposed change

Add one sentence to the FAQ pricing answer: "All work is billed at $100 USD per hour, time and materials." Keep the link to the proposal tool for the dealer to estimate total hours. Do not publish fixed project prices.

### Why it helps conversion for this business

The rate is the single most important piece of information for a dealer evaluating a subcontractor. Hiding it does not create a competitive advantage — it creates friction. The dealer will either ask on a call (adding a step) or leave the site to find a competitor who publishes rates. Stating the rate on the FAQ page lets the dealer self-qualify instantly: if $100/hr fits their budget, they proceed to the proposal form. If it does not, Jamie avoids a wasted call.

### Evidence

1. **DemandGen Report / 2024 B2B Buyer's Survey:** 86% of B2B buyers rank pricing among their top five evaluation criteria. Pricing is collected early in the buying journey, before the buyer contacts a vendor.
   - URL: https://53a3b3d3789413ab876e-c1e3bb10b0333d7ff7aa972d61f8c669.ssl.cf1.rackcdn.com/DGR_DG296_SURV_B2BBuyers_June_2024_Final.pdf

2. **HockeyStack (31M visitors, 80 B2B SaaS companies):** Transparent pricing pages generate leads that convert to pipeline at 17.5%, versus 10.3% for non-transparent pricing pages. Non-transparent pages generate more form submissions (4.6% vs 2.8%) but fewer actual opportunities. The leads from transparent pricing are 1.7x more likely to become pipeline.
   - URL: https://www.hockeystack.com/lab-blog-posts/state-of-pricing-demo-case-study-pages

3. **HubSpot — "Why You Should Publish Pricing on Your Website":** "Not having price on your site cedes the opportunity to your competition to control this crucial aspect of the buying decision." HubSpot recommends owning the price dialog with context, testimonials, and value framing alongside the number.
   - URL: https://blog.hubspot.com/marketing/why-publish-pricing-on-website-var

4. **Marcus Sheridan / They Ask, You Answer:** 90% of B2B service businesses refuse to publish pricing, even though buyers want it immediately. One client's leads tripled within two weeks of adding a pricing estimator. The proposal tool at `/rti_proposal/` already functions as an estimator — stating the rate on the FAQ page completes the picture.
   - URL: https://www.growthmanifesto.com/podcast/marcus-sheridan

5. **Google/NRG B2B Buyer Journey (2025):** Vendor websites should include "pricing sheets, FAQs, security/technical specs" at the evaluation stage. Buyers who cannot find pricing on the vendor site move to other sources, including competitors and AI tools that may produce inaccurate numbers.
   - URL: https://www.nrgmr.com/resources/Google%20B2B%20Buyer%20Journey_October_2025.pdf

6. **TrustRadius (4 consecutive annual surveys, cited by Sheridan):** For four straight years, B2B buyers have told TrustRadius that the number one thing they want from vendors is transparent pricing. 69% of well-known SaaS brands still hide pricing for their top tier.
   - URL: https://www.linkedin.com/posts/marcussheridan_for-4-straight-years-b2b-buyers-have-told-activity-7510301792224604161-4Awd

**Note on T&M vs fixed pricing:** The evidence above is primarily about publishing some form of pricing. The recommendation is not to publish fixed project prices (which would conflict with the T&M model). Stating the hourly rate and linking to the hours estimator satisfies the buyer's need for pricing transparency while preserving the T&M structure.

---

## Item 6: Home copy tilt to dealers/integrators

### What the current live page does wrong

`frontend/consultation.html`, lines 24-26 (hero heading):

```
<h1><span class="text-light-grey">Unlock</span>
    <span class="text-black">Seamless Smart Home Integration</span>
    <span class="text-light-grey">With<br></span>
    <span class="text-black">Remote System Programming</span></h1>
```

And lines 92-94 (bottom CTA heading):

```
<h2>Ready to Transform Your Smart Home Projects?</h2>
<p>Let us show you how our services can save time, cut costs,
    and optimize your installations.</p>
```

The hero reads as a homeowner pitch: "Seamless Smart Home Integration" and "Transform Your Smart Home Projects" are consumer-facing phrases. The primary audience is dealers and custom integrators, not homeowners. A dealer landing on this page sees language aimed at end consumers, which signals that the service is not for them.

The FAQ page (`faq.html`) correctly addresses dealers: "Remote Programming FAQ for RTI Dealers." The home page does not.

### Proposed change

Rewrite the hero copy to address dealers directly. Example: "Remote RTI Programming for Dealers and Integrators — Free your techs for installs. We handle the programming." Keep the value propositions in the benefits section but frame them in dealer terms (programming backlog, tech utilization, commissioning speed) rather than homeowner terms (smart home, seamless integration).

### Why it helps conversion for this business

The home page is the first impression for most traffic. If the hero copy does not signal "this is for dealers," dealer visitors must scroll further to determine relevance. Every scroll without confirmation increases bounce risk.

### Evidence

1. **Nielsen Norman Group — information scent and the Spotted Pattern:** Users scan pages looking for words that match what they are looking for. Dealers scan for terms like "dealer," "integrator," "programming," "commissioning." "Smart Home Projects" does not match these expectations.
   - URL: https://www.nngroup.com/articles/link-promise/

2. **Security Marketing Research (SMR) — The Buyer-Focus Gap (integrator industry study):** Product-led positioning leads with what the integrator sells. Buyer-focused positioning leads with the buyer's situation. The study found that custom integrator websites that use buyer-focused positioning outperform product-led sites because the visitor immediately confirms they are in the right place. "Diagnose, then prescribe."
   - URL: https://securitymarketing.com/lab-the-buyer-focus-gap

3. **METIS Marketing — "Professional Marketing at Consumer Scale":** "Consumer-scale marketing does not mean translating a consumer message into a contractor ad. It means bringing the same discipline of audience understanding, testing, and relevance to a different economic decision." A dealer evaluating a programming subcontractor has different criteria than a homeowner evaluating a smart home installer: faster installation, protected margins, fewer callbacks, channel support.
   - URL: https://www.metis-marketing.com/the-signal-blog/b2b-but-built-for-the-masses

4. **Missionwright / Walcraft Cabinetry case study:** When a company sold to both trade operators and homeowners, audit revealed the need for differentiated audience stories, channel roles, and next actions. Separate buyer journeys with audience-specific messaging and CTAs outperformed a single generic approach.
   - URL: https://missionwright.com/work-walcraft-cabinetry/

5. **Cwell Marketing / Meridian integrator site case study:** "Trade-partner funnels: Builders, architects, and designers get their own entry points with forms tuned to project specs — a totally different conversation than a homeowner form." The proposal form at `/rti_proposal/` is already trade-tuned; the home page hero copy should match.
   - URL: https://integrator.cwellmarketing.com/case-studies/meridian

**Honest caveat:** No A/B test directly compares dealer-focused versus homeowner-focused hero copy for a remote programming service. The evidence is from general B2B audience-targeting research and case studies from adjacent industries (custom integration, cabinetry, security). The principle — match hero copy to the actual buyer — is well-established in conversion research, even if the specific application is unquantified.

---

## Item 7: Phone/email secondary under FAQ form CTA (optional)

### What the current live page does wrong

Neither `consultation.html` nor `faq.html` display Jamie's phone number (1-778-899-4809) or email (feeny.jamie@gmail.com) anywhere. The only contact mechanism on either page is the Calendly popup. The site contains no fallback for a dealer who wants to reach Jamie through a channel other than Zoom scheduling.

**Customer Minas's experience:** The only path available was the Calendly Zoom booking, but the customer wanted to reach Jamie by phone. A single-channel contact model loses prospects whose communication preferences differ from the one offered channel.

### Proposed change

After replacing the FAQ bottom CTA with a link to `/rti_proposal/`, add a secondary line below the primary CTA: "Prefer to talk first? Call 1-778-899-4809 or email feeny.jamie@gmail.com." Do not place these in the hero; keep them below the form CTA on the FAQ page only.

### Why it helps conversion for this business

This is a secondary recommendation because it introduces complexity. The proposal form is the preferred conversion path. But some dealers (like Minas) prefer voice contact, especially for urgent or complex questions. Offering phone/email as a secondary option catches prospects who would otherwise leave.

### Evidence

1. **McKinsey B2B Pulse (2024):** B2B customers use an average of ten interaction channels in their buying journey (up from five in 2016). More than half will switch suppliers if they do not have a smooth experience across channels.
   - URL: https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/five-fundamental-truths-how-b2b-winners-keep-growing

2. **InsideSales.com cadence research:** Using multiple contact channels increases contact rates by 161% versus single-channel outreach. Adding a third channel increases contact rates another 54.6%. The principle applies in reverse: offering multiple inbound channels catches prospects with different preferences.
   - URL: https://resources.insidesales.com/wp-content/uploads/2020/02/research-SuccessfulSalesCadence.pdf

3. **Leadferno (225 SMB contact forms, 2026):** 71.3% of businesses responded to form leads using only one communication channel. Businesses that used two or three channels had higher lead engagement. The recommendation: "A business is wise to try to contact a prospect using multiple channels to connect."
   - URL: https://leadferno.com/blog/research-website-contact-forms-and-lead-management-uncovering-costly-mistakes

4. **SiteTuners — "Phone Calls vs. Form Fills":** "The more critical the purchase, the higher the risks and costs associated are, the better the calls will do." For a dealer committing to a multi-thousand-dollar programming engagement, phone contact provides reassurance that forms alone may not. The recommendation is to offer both but measure both: "Optimizing your page for both calls and form fills may not increase conversion for both, but as long as you're not hurting one to help the other, that's okay."
   - URL: https://sitetuners.com/blog/are-phone-calls-better-than-form-fills-for-conversion/

5. **Anders, Coleman, Castleberry (Journal of Business Communication, 2020):** B2B buyers prefer email for initial information conveyance (parallel processing, asynchronous). Phone is preferred for established relationships, conflict resolution, and negotiation. This supports making email/phone secondary rather than primary: the form handles the initial information exchange, and phone/email serve as fallback.
   - URL: https://journals.sagepub.com/doi/10.1177/2329488417702476

6. **Data Driven Trades (16,000 leads):** While 78% of home-service leads converted via phone, online booking had a 72.98% match rate versus 29.59% for phone. Online booking leads also had higher average ticket ($5,023 vs $4,343). The takeaway is not to replace forms with phone — it is that both channels serve different buyer profiles, and offering both captures more total revenue.
   - URL: https://thedatadriventrades.substack.com/p/the-way-that-customers-convert-on

**Important caveats for item 7:**

- Listing a phone number only works if Jamie can answer calls or return them promptly during business hours. An unanswered phone number is worse than no phone number. (See: LiftArchive, "A call that rings out after hours or goes to a full voicemail box is worse than a form." — https://liftarchive.com/lead-gen/click-to-call/)
- Phone and email should remain secondary (text link, not button) to avoid creating competing CTAs that dilute the form conversion. The Unbounce data on single-CTA superiority still applies; adding phone/email as quiet text links is different from adding competing buttons.
- If form-only purity is preferred, skip this item entirely. The evidence supports offering multi-channel contact, but the evidence also supports single-CTA focus. The two findings are in tension for a one-person operation with limited call-answering capacity.

---

## References (consolidated)

| Source | Type | URL |
|--------|------|-----|
| Ariely et al., "Zero as a special price" (Marketing Science, 2007) | Peer-reviewed | https://web.mit.edu/ariely/www/MIT/Papers/zero.pdf |
| Anders, Coleman, Castleberry (J. of Business Communication, 2020) | Peer-reviewed | https://journals.sagepub.com/doi/10.1177/2329488417702476 |
| Hang Seng Univ., "Impact of free and exaggerated prices on perceived quality" | Peer-reviewed | https://scholars.hsu.edu.hk/en/publications/the-impact-of-free-and-exaggerated-prices-on-perceived-quality-of/ |
| Baymard Institute, CTA and form research | Practitioner (paywall) | https://baymard.com/research-articles/meal-kits-launch |
| Nielsen Norman Group, "A Link is a Promise" | Practitioner | https://www.nngroup.com/articles/link-promise/ |
| Nielsen Norman Group, "3 Common IA Mistakes" | Practitioner | https://www.nngroup.com/articles/3-ia-mistakes/ |
| Nielsen Norman Group, 3-Step CTA Formula (video) | Practitioner | https://www.nngroup.com/videos/3-step-ctas-formula-for-conversion/ |
| CXL, "When Free Converts (and When It Doesn't)" | Practitioner | https://cxl.com/blog/when-free-converts-and-when-it-doesnt/ |
| Unbounce, 18,639 landing page analysis | Practitioner / vendor | https://foundrycro.com/blog/cta-button-conversion-rate-benchmarks-2026/ |
| ConversionLab, "One CTA beats five by 29%" | Reporting on Unbounce | https://blog.conversionlab.no/insight/one-cta-beats-five-by-29-2/ |
| TDM Insights, "The One-CTA Rule" | Practitioner | https://tdminsights.com/insights/the-one-cta-rule-one-ask-per-page-wins/ |
| Gartner, "61% of B2B Buyers Prefer Rep-Free Buying" (2025) | Analyst | https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-sales-survey-finds-61-percent-of-b2b-buyers-prefer-a-rep-free-buying-experience |
| Google/NRG, B2B Buyer Journey Whitepaper (2025) | Analyst | https://www.nrgmr.com/resources/Google%20B2B%20Buyer%20Journey_October_2025.pdf |
| DemandGen Report, 2024 B2B Buyer's Survey | Analyst | https://53a3b3d3789413ab876e-c1e3bb10b0333d7ff7aa972d61f8c669.ssl.cf1.rackcdn.com/DGR_DG296_SURV_B2BBuyers_June_2024_Final.pdf |
| McKinsey B2B Pulse, "Five Fundamental Truths" (2024) | Analyst | https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/five-fundamental-truths-how-b2b-winners-keep-growing |
| HockeyStack, "State of Pricing, Demo, and Case Study Pages" | Vendor data (31M visitors) | https://www.hockeystack.com/lab-blog-posts/state-of-pricing-demo-case-study-pages |
| HubSpot, "Why You Should Publish Pricing" | Vendor blog | https://blog.hubspot.com/marketing/why-publish-pricing-on-website-var |
| HubSpot, Pricing Page Redesign case study | Vendor case study | http://waynelockwood.blogspot.com/2018/01/how-hubspots-pricing-page-redesign.html |
| HubSpot, "Personalized CTAs convert 202% better" | Vendor data (330,000 CTAs) | https://blog.hubspot.com/marketing/personalized-calls-to-action-convert-better-data |
| Marcus Sheridan / Priceguide, pricing estimator data | Vendor data | https://www.linkedin.com/posts/marcussheridan_did-you-know-the-average-contact-us-page-activity-7384199781813821441-D0QI |
| Marcus Sheridan, "Call for Quote vs Instant Estimate" | Vendor data | https://www.linkedin.com/posts/marcussheridan_after-2-years-and-hundreds-of-thousands-of-activity-7501280169962291201-HKU1 |
| Marcus Sheridan, Growth Manifesto podcast | Practitioner interview | https://www.growthmanifesto.com/podcast/marcus-sheridan |
| TrustRadius, 4-year pricing transparency survey | Analyst reporting | https://www.linkedin.com/posts/marcussheridan_for-4-straight-years-b2b-buyers-have-told-activity-7510301792224604161-4Awd |
| GetUplift, HVAC CTA case study | Practitioner case study | https://getuplift.co/the-psychology-of-a-cta-button/ |
| ZenWeb, free vs paid consultation data (500+ campaigns) | Practitioner data | https://zenweb.my/blog/free-consultation-offers/ |
| Caletus, "Paid discovery call vs free consultation" | Practitioner guide | https://www.caletus.com/resources/blog/paid-discovery-call-vs-free-consultation |
| SMR, "The Buyer-Focus Gap" (integrator study) | Industry study | https://securitymarketing.com/lab-the-buyer-focus-gap |
| METIS Marketing, "Professional Marketing at Consumer Scale" | Industry analysis | https://www.metis-marketing.com/the-signal-blog/b2b-but-built-for-the-masses |
| Missionwright / Walcraft Cabinetry case study | Agency case study | https://missionwright.com/work-walcraft-cabinetry/ |
| Cwell Marketing / Meridian integrator case study | Agency case study | https://integrator.cwellmarketing.com/case-studies/meridian |
| Residential Systems, "Creating Converts" | Industry trade press | https://www.residentialsystems.com/features/creating-converts |
| InsideSales.com, cadence research | Vendor research | https://resources.insidesales.com/wp-content/uploads/2020/02/research-SuccessfulSalesCadence.pdf |
| Leadferno, contact form and lead management research (2026) | Vendor research | https://leadferno.com/blog/research-website-contact-forms-and-lead-management-uncovering-costly-mistakes |
| SiteTuners, "Phone Calls vs. Form Fills" | Practitioner | https://sitetuners.com/blog/are-phone-calls-better-than-form-fills-for-conversion/ |
| Data Driven Trades, 16,000 leads analysis | Practitioner data | https://thedatadriventrades.substack.com/p/the-way-that-customers-convert-on |
| LiftArchive, "Click to Call Buttons: What A/B Tests Show" | Meta-analysis | https://liftarchive.com/lead-gen/click-to-call/ |
| NextAfter, CTA clarity experiment (NBCF, 2017) | A/B test | https://www.nextafter.com/experiments/how-clarity-in-the-call-to-action-increases-conversion-rate/ |
