# 08 - Design System

The form must look like it belongs on feenypowerandcontrol.com. Everything here is
derived from the existing `consultation.html`, `faq.html`, `global.css`,
`consultation.css` and `faq.css`.

## Files

Create **only** `frontend/styles/rti_proposal.css`.

`global.css` and `consultation.css` are shared by the landing and FAQ pages.
`development_continuity.md` flags them as needing protection from unrelated edits,
and NFR-5 makes a regression on those pages a project failure. This mirrors exactly
how `faq.css` was added: shared styles untouched, one page-scoped file added.

Load order in `rti_proposal.html`, matching `faq.html`:

```html
<link rel="stylesheet" href="/styles/global.css">
<link rel="stylesheet" href="/styles/consultation.css">
<link rel="stylesheet" href="/styles/rti_proposal.css">
```

## Palette

All values are already in production use.

| Purpose | Value |
|---|---|
| Primary action | `#fcb040` orange, hover `#FF8C00` |
| Positive emphasis, links | `#39b54a` green, hover `#2d9639` |
| Content band background | `#575759` |
| Card background | `#4a4a4c`, hover `#4f4f51` |
| Borders, hint text | `#a7a9ac` |
| Body text on white | `#333` |
| Body text on dark band | `#e8e8e8` |
| Footer, secondary button | `#222`, hover `#444` |

Declare these as CSS custom properties at the top of `rti_proposal.css`. The
existing stylesheets repeat hex codes literally, which is fine for two marketing
pages, but this form has focus, invalid, disabled and completed-step states, and the
same orange would otherwise be written a dozen times. Scoping the variables to the
new file gets maintainability without touching shared CSS.

## Typography

Rubik from Google Fonts, `line-height: 1.6`, imported at the top of the stylesheet
the way `global.css` does it.

## Page shell

Reproduce the structure both existing pages share. There is no templating on this
site — the header and footer are duplicated per page — so follow that convention
rather than introducing a template engine.

1. White `<header>` with the logo, then an `<h1>` alternating `.text-light-grey` and
   `.text-black` spans
2. The `.partners` logo strip
3. A `.benefits` dark grey band holding the form
4. The dark `<footer>`

## Components

**Buttons** are pills: `border-radius: 30px`, `padding: 10px 20px`. Primary actions
(Next, Submit) use orange with black text, following `.calendly-button-upper`.
Secondary actions (Back) use `#222` with white text, following
`.calendly-button-lower`.

**Cards** use `1px solid #a7a9ac`, `border-radius: 8px`, on `#4a4a4c`, matching
`.faq-item`. Each repeat-group instance renders as one of these.

**Content column** is `max-width: 720px; margin: 0 auto; text-align: left`, the
pattern `.faq-list` established for readable content on the dark band.

**Breakpoint** at `600px`, where buttons grow to `font-size: 18px; padding: 15px
25px`.

## Accessibility

**Labels use `#e8e8e8`, not `#a7a9ac`.** Light grey on the `#575759` band is
acceptable for decorative headings but falls short of a 4.5:1 contrast ratio, and
this is a long form people read while typing (NFR-12). `faq.css` already made this
call for `.faq-answer`. Reserve `#a7a9ac` for borders and hint text.

Also required:

- Every input has a real `<label>` with a `for` attribute. Placeholders are not
  labels.
- Help text is associated via `aria-describedby`, not left as an adjacent
  unassociated element.
- Focus is always visible. Do not remove outlines; restyle them if needed.
- Errors are announced, associated with their field, and never conveyed by colour
  alone — pair red with text.
- Repeat groups use `<fieldset>` and `<legend>` so the grouping is conveyed
  non-visually.
- Adding or removing a repeat instance moves focus sensibly and announces the change
  via a live region. Silently mutating the DOM is disorienting for screen reader and
  keyboard users alike.
- The whole form is completable by keyboard.

## Interaction rules

**Step navigation.** Validate the current step before advancing. Do not block
backward navigation. Show progress as "Step 4 of 10" alongside any visual indicator;
completed steps are marked with green, the current step with orange.

**Conditional questions.** Appear and disappear in place without layout jumping.
Do not animate; on a form this dense, motion is noise.

**Repeat groups.** Changing a count adds or removes cards immediately. Reducing a
count truncates from the end and preserves surviving values (FR-6). Each card is
headed by its item label, for example "Audio Source 2". Because names are optional,
never present an empty name as an error.

**Live estimate.** Show the running hours total persistently — sticky at the bottom
on mobile, alongside the form on wider screens. Debounce the request by roughly
400ms. Never block input while it is in flight, and never show a spinner over the
form; a stale number briefly is better than a jumping layout. On request failure,
keep the last known value rather than showing an error, since the estimate is
informational.

**Submission.** Disable the submit button while in flight and show clear progress —
generating a PDF and sending mail is not instant. On success, show the reference and
confirm which address the proposal was sent to. On validation failure, move focus to
the first offending field and, if it is on an earlier step, navigate there.

## Copy

Preserve the existing form's help text verbatim (FR-10). It encodes domain knowledge
that took real experience to write — "Include outdoor heaters, garage heaters or
fireplaces" tells a dealer exactly what counts as a heater zone, and rewording it
risks changing what gets counted.

Carry over the intro text from the current form's first page as introductory copy on
the page.
