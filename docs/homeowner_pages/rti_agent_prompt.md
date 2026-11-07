# Prompt — continue the homeowner pages with RTI

Paste everything below the line into a new agent chat.

---

You're picking up the homeowner landing pages on my website (feenyPowerLanding). The Lutron pages are finished, approved and live. Next is **RTI**: bring `/vancouver/rti`, `/kelowna/rti` and `/los-gatos/rti` up to the same standard as Lutron.

**Read these first, in order:**
1. `continuity.md`: repo rules, local dev, deploy.
2. `docs/homeowner_pages/README.md`: how the pages work. It lists what every v2 brand already gets for free, what needs my input for each brand, the photo treatment and the open items.
3. The Lutron block in `backend/homeowner/content.js` (`brands.lutron`, especially `v2`). It's your template.

**What to do:**
1. Move RTI to the v2 layout (`layout: 'v2'` plus a `v2` block, following the Lutron pattern). Leave `published` off until I approve.
2. Before writing brand copy, ask me the questions in the README's "Needs Jamie's input" section. Ask **one at a time** in chat. Use the current v1 RTI copy as a starting suggestion, not as approved copy. For example: the title product name, which RTI products the hero names, the "Sound familiar?" symptoms, which two pieces of equipment to photograph (probably a handheld remote and a touchscreen or keypad), the "Adding or replacing system devices — …" list, and the testimonial order. Bob G (Whistler) is an RTI client, so he may belong first.
3. Process equipment photos as transparent cut-outs at the same height (see the Photos section of the README).
4. Keep `backend/homeowner/render.test.js` passing, and add RTI assertions like the Lutron ones. Run `cd backend && npm test`.
5. Check the pages locally at http://localhost:3000/vancouver/rti (drafts render locally because `HOMEOWNER_SHOW_DRAFTS=true` is in my local `backend/.env`). Restart the server after every content.js change. Show me screenshots of visual changes.
6. Lutron must not change. Check before and after that the three Lutron pages render byte-identical, unless I ask for a shared change.
7. If a decision applies to every brand, put it in `sharedV2` and add it to the README so Clipsal and Vantage get it.

**Rules:**
- Don't commit, push or deploy until I ask. When I do, follow `deployment.md`, set `published: true` on RTI, and confirm the pages return 200 in production.
- Keep the shared promises from the README: reply within 24 hours, diagnosis within 48 hours of receiving the project file, no hourly rate, no "repair", no guarantee, "Feeny Power and Control Ltd.".
- Use subagents for heavy exploration to keep context small.
