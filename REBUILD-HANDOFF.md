# Porter Website Rebuild: Handoff for Claude Code

> Purpose: everything you need to rebuild buildwithporter.com from scratch. Read this top to bottom before writing code. It carries the positioning, the messaging rules, the page structure with real copy, and the full visual direction (dark, luxury, Bible-consistent). Companion source docs are listed in Section 11.
>
> Style note for this file and all copy you write: do not use em dashes. Use colons, commas, parentheses, or periods.

---

## 0. How to use this document

1. Read Section 2 (positioning) and Section 4 (messaging rules) first. They are inviolable. The single most common way to get this wrong is to mention AI in customer-facing copy. Do not.
2. Build the design system tokens from Section 6 before any components.
3. Build the page section by section from Section 5, taking copy verbatim or near-verbatim.
4. The canonical design law is the Porter Design Bible (`../porter-corporate-memory/design/BIBLE.md`, mirror at `../porter-frontend/design-system/BIBLE.md`). When this doc and the Bible disagree, the Bible wins. If neither covers something, choose less.

---

## 1. The company, in one paragraph

Porter gives startups and SMBs an enterprise-grade finance team at a fraction of the cost. It is two things in one product: the modern accounting software your finances live in (a successor to QuickBooks, built for operators instead of accountants) and the finance team that runs it for you (bookkeeping, invoicing and collections, bill pay, payroll, and more). The promise: finance stops being a compliance headache and becomes something you actually understand and use to run the business. The guiding line, true for everyone: finance is just the simple story of how a business makes and spends money.

---

## 2. Positioning: the inviolable rules

**This is a CUSTOMER-facing website. The customer rules apply to every word and pixel on it.**

### Rule 1: No AI. Anywhere. Ever.

Founders and SMB owners want a competent, trustworthy finance team running their money. To that audience, "AI bookkeeping" reads as cheap, risky, or not-real. So the public site never says: AI, AI agents, agents, automation, machine learning, LLM, MCP, copilot, "AI-native." Porter is "powered by AI, delivered by humans" internally, but the technology is invisible on the customer site. We sell the outcome and the team, not the engine.

(The AI story is real and central, but it is the INVESTOR story, told in private materials. It does not belong on the marketing site. If you find yourself reaching for "AI" to make a section sound impressive, you are writing the wrong site.)

### Rule 2: Lead with the finance team and the outcome.

The headline idea is "your entire finance team, at your fingertips, at a fraction of the cost." Lead with relief and control: someone competent has this handled, and for the first time you understand your numbers.

### Rule 3: Make the software unmistakable.

A real prospect once asked us to recommend "a modern accounting software," not realizing Porter IS one. Fix that on the site. Porter is both a service (the team) and software (the system of record, a QuickBooks replacement you log into). Both must be obvious. There should be a section a visitor cannot miss that says, in effect, "this is also your accounting software."

### Rule 4: Never mention margins, unit economics, "50+ clients per CFO," or how we make money. That is investor-only.

### Rule 5: Speak operator, not accountant.

No debits, credits, journal entries, GAAP, reconciliation jargon in visible copy. Finance is the story of how the business makes and spends money. Say it that way.

---

## 3. What Porter actually is (so your copy stays accurate)

**The two halves, one product:**

- **The software:** the system of record your finances live in. A modern replacement for QuickBooks, built for operators. Log in and ask it anything, or tell it to do anything, in plain language. It guides you, it is proactive (it tells you what is missing, what changed, what is due), it sends invoices, chases payments, books transactions, and shows you how to categorize the ones it cannot.
- **The team:** a complete finance function delivered for you. The full roster, staffed to the company's complexity: bookkeeper, accounts payable, accounts receivable and collections, revenue accountant, payroll, treasury, staff accountant, controller, technical accounting, internal audit and controls, FP&A, CFO, and tax. (On the customer site, do not dump the full org chart as jargon. Translate to outcomes: keep your books clean, get paid, pay smart, run payroll, understand your numbers, stay ready for tax.)

**Real proof points you can use (get permission before publishing names):**
- A multi-entity professional-services firm: was missing payments, letting receivables age, overpaying for unused tools. Porter centralized AR, AP, payroll, and vendor spend, and showed them what to cancel.
- A proptech startup: needed complex revenue and depreciation schedules done right. Porter builds and maintains them.
- A home-services operator: drowning in payment booking. Porter took it off their plate.

---

## 4. Messaging kit (customer-facing, AI-free)

**Primary hero line candidates (lead with the first):**
1. "Your entire finance team. At your fingertips."
2. "Your finance team. At a fraction of the cost."
3. "An enterprise-grade finance team, without the enterprise price tag."

Pair when there is room: "Your entire finance team, at your fingertips, at a fraction of the cost."

**Words to use:** finance team, your numbers, how your business makes and spends money, built for operators, get paid, pay smart, no more chasing, modern accounting software, a fraction of the cost, focus on your business, we handle it.

**Words to ban (customer site):** AI, agents, automation, machine learning, LLM, MCP, AI-native, copilot, debits, credits, GAAP, journal entries, reconciliation, margins, unit economics.

**The feeling to sell:** relief and control.

**Honesty guardrail:** never claim "100% human." Just do not foreground the technology. Lead with the outcome and the human relationship.

---

## 5. Site structure, section by section (with copy)

Build a single long-scroll landing page plus standard legal pages. Sections in order:

### 5.1 Nav (sticky, transparent over hero, solidifies on scroll)
- Left: Porter logo (use the light/white logo on dark, see Section 8).
- Center or right links: How it works, What we do, Pricing, About (use a dark mega-menu like Resend if you build dropdowns; see Section 6).
- Right CTA: a pill button, "Get your finance team" (primary) and a quiet "Sign in".

### 5.2 Hero
- Headline (EB Garamond, large, regular weight): **Your entire finance team. At your fingertips.**
- Subhead (DM Sans): "Porter is the modern accounting software and the finance team that runs it: bookkeeping, invoicing, bill pay, payroll, and the numbers you actually need. Log in and ask it anything, or let it handle the work, so you can get back to running your business. An enterprise-grade finance team, at a fraction of the cost."
- CTAs (pills): "Get your finance team" (primary), "See how it works" (secondary, hairline outline).
- Trust line (small, uppercase tracked): "Trusted by founders in proptech, professional services, and home services."
- Hero visual: ONE signature object (see Section 6.4). This is the centerpiece. Make it crafted and, ideally, gently animated.

### 5.3 The reframe (the thesis)
- Big editorial line: **Finance is just the story of how your business makes and spends money.**
- Supporting paragraph: "Somewhere along the way it became a compliance headache: software you cannot use, bookkeepers who do not know you, reports that arrive late and tell you nothing. Porter changes that. We make your finances something you actually understand and use to run the business."

### 5.4 The problem (four pain cards)
Section label (uppercase tracked): "Sound familiar?"
1. **"I dread looking at my books."** QuickBooks, Xero, Sage: they were built for accountants. Debits, credits, jargon you never wanted to learn. So you avoid them, and you feel disconnected from your own numbers.
2. **"My bookkeeper doesn't know my business."** They juggle dozens of clients, reply slowly, and scatter the conversation across email, Slack, and text. You re-explain your business every month and still get a stale report weeks late.
3. **"Invoices and bills fall through the cracks."** Customers pay late because no one is chasing them. Vendors get paid twice, or too early, or not at all. There is no process, just you, remembering.
4. **"I'd rather spend on growth than finance."** So you settle for a patchwork of half-tools that does not help you run the business. But finance is supposed to be a business tool: it should tell you how to make more and spend less.

### 5.5 What Porter does (the finance team)
Section line: **One team. Your whole finance function.**
- Bookkeeping that actually understands you. Clean, current, readable, in plain language.
- Get paid faster. We send your invoices and chase what you are owed.
- Pay smarter. We manage what you owe your vendors, never too early, never late, and clean up scattered subscriptions and cards.
- Payroll, handled.
- A modern financial stack. One organized system, plus the insights you need to make decisions.
- Result line: "A world-class finance team, working for you, at a fraction of what it would cost to hire one."

### 5.6 Porter is your accounting software, too (THE dual-nature section, do not skip)
- Line: **More than a service. It's where your finances live.**
- "Porter is not just a team working behind the scenes. It is the software you run your finances on: a modern replacement for QuickBooks, built for operators instead of accountants. Your books, your numbers, your whole finance function in one place. Log in and talk to Porter the way you would talk to your finance team. Ask 'how much did we make last month?' or 'which customers owe us?' and get a clear answer, no spreadsheets, no jargon. And it does not wait for you: Porter tells you what is missing, flags what changed, and reminds you what is due."
- Visual: a real product mockup rendered as a dark hairline card (see Section 6.5). Show the dashboard, an "ask anything" answer, and an AR view.

### 5.7 Built to scale with you
- Line: **From your first invoice to your finance department.**
- "When you are small, Porter keeps your books clean and your cash flowing. As you grow, your team grows with you to cover collections, vendor management, payroll, schedules, controls, and planning, all without you ever hiring, onboarding, or managing a finance department. You scale the function in a click, not a hiring cycle."

### 5.8 Proof (case snapshots, names pending permission)
- "A multi-entity professional-services firm was missing payments, letting receivables age, and overpaying for tools no one used. Porter centralized AR, AP, payroll, and vendor spend, and showed them exactly what to cancel."
- "A proptech startup needed complex revenue and depreciation schedules done right. Porter builds and maintains them."
- "A home-services operator was drowning in payment booking. Porter took it off their plate."

### 5.9 How it works (three steps)
1. Connect your accounts. Hook up QuickBooks, or start fresh with Porter. Setup takes minutes, not weeks.
2. Meet your finance team. We learn your business and take finance off your plate.
3. Run your business. Clean books, money collected, bills handled, and insights you can use.

### 5.10 Pricing teaser
- Line: **An enterprise-grade finance team, without the enterprise price tag.**
- "Plans scale with your business, from founders who want clean books and clear numbers, to teams that want their entire finance function run for them."
- CTA: "Talk to us about your finance team."

### 5.11 Final CTA
- Line: **Stop worrying about finance. Start using it.**
- CTA pills: "Get your finance team", "Talk to us".

### 5.12 Footer
- Logo, short tagline, nav columns, legal links (privacy-policy.html, terms-of-service.html already exist in this repo), contact: support@buildwithporter.com.

Full copy, plus one-pagers, video scripts, LinkedIn, and ad variants, lives in `../strategy-synthesis-2026-05-19/content-kit.md`.

---

## 6. The design direction: dark, luxury, futuristic, Bible-consistent

### 6.0 North star

"Hermès meets financial software." Porter is a creative product that happens to do accounting. The new site is dark, modern, and luxury-grade. Take the grammar of the Porter onboarding studio (`../porter-static-studio-onboarding`: EB Garamond serif, DM Sans, sharp corners, ghost hairlines, green-only accent, generous asymmetric whitespace, tonal layering instead of shadows) and render it in the Bible's dark palette. The premium feel is not what you add, it is what you refuse to add. Every pixel earns its place.

### 6.1 Color tokens (dark appearance, from BIBLE.md POR-1291)

Define these as CSS variables on `:root` (the site is dark by default; no theme toggle needed for marketing). Do not invent colors. Do not use Tailwind default grays, blues, or bright reds.

```css
:root {
  /* Surfaces (obsidian, slightly warm-green, never pure cold black) */
  --bg:            #101211;  /* page body */
  --surface:       #1A1D1B;  /* card on body */
  --container:     #202421;  /* raised container */
  --recessed:      #171A18;  /* recessed */
  --elevated:      #1C231F;  /* floating / tooltip */

  /* Ink (warm ivory, never pure white) */
  --ink:           #F2F0EA;  /* primary text */
  --ink-2:         #C8C6BE;  /* secondary */
  --ink-muted:     #9EA79F;  /* muted, micro-labels */
  --ink-disabled:  #636D66;

  /* Hairlines (the only borders, 0.5px) */
  --hair:          #38423C;  /* default, visible obsidian-green */
  --hair-subtle:   #242B27;

  /* Green ramp (the only accent, lifted so it glows on obsidian) */
  --green:         #95D4B3;  /* primary accent: active, links, CTA fill option */
  --green-light:   #B7E6CC;
  --green-deep:    #5FB893;  /* container / bar fill */
  --green-wash:    rgba(149,212,179,0.08); /* hover tint, never gray */

  /* Semantic (only when it carries meaning) */
  --error:   #D99B9D;  /* softened crimson, never #DC2626 */
  --warning: #D6A56F;  /* softened amber */

  /* Obsidian accents */
  --obsidian:      #000000; /* deepest panels, AI-signature equivalents (used sparingly on a dark site) */
}
```

Discipline: monochrome obsidian foundation, green is the only decorative-feeling color and even it should mostly signal state (active link, CTA, "done"). Error and warning appear only on real status. Everything else is the ivory-on-obsidian ramp.

### 6.2 Typography (two faces, no exceptions, per Bible)

- **EB Garamond** (regular 400, never bold, never italic outside true editorial accents): hero headline, big section lines, large statement type. This is the magazine voice and it earns its place through scarcity. Load from Google Fonts.
- **DM Sans**: everything functional, body, subheads, nav, buttons, labels, captions.
- **Micro-labels:** DM Sans, 9 to 12px, UPPERCASE, letter-spacing 0.05em to 0.10em, color `--ink-muted`. These tracked kickers carry the structure (for example "SOUND FAMILIAR?", "HOW IT WORKS"). They do the job most sites do with a bold H2 and a rule.
- **Do not** substitute Inter for DM Sans or Instrument Serif for EB Garamond. Do not set EB Garamond bold.

Scale (px): 11 to 14 body, 20 section title, 28 page title, 36 secondary hero, 48 hero, and you may go larger (64 to 96) for the editorial hero on a marketing page since reference luxury sites push display type big. Keep hero weight at 400 and use tight negative letter-spacing (around -0.02em) so large EB Garamond reads as couture, not clunky.

Note on the monospace trend: several reference sites use a monospace for micro-labels (a nice "technical luxury" signal). The Bible currently mandates only DM Sans and EB Garamond. Achieve the same effect with DM Sans uppercase tracked. If Michael wants a true mono accent face, that is a Bible change to propose first (via the design-update process), not something to introduce unilaterally.

### 6.3 Form language (from Bible)

- **Zero border radius** on everything (cards, inputs, mockups, sections). The only exception is the pill (9999px) for status badges and CTA buttons.
- **Borders:** 0.5px solid `--hair`. Never 1px. Never a gray hex. The hairline is a whisper, the corner is a chisel.
- **Depth via tone, not shadow.** Stack `--bg` to `--surface` to `--container` for elevation. Avoid box-shadows except a single barely-visible one on a true floating dialog.
- **Whitespace:** generous and asymmetric. 32px page gutters, 32px+ section gaps, hero metrics floating in air. Left-aligned editorial layout beats centered for everything except possibly the hero.
- **Icons:** thin outlined (Material Symbols Outlined, weight 300) in `--ink` or `--ink-muted`, green only when signaling an active state. No chunky filled icons.

### 6.4 The hero object (the centerpiece)

Every reference luxury site has ONE crafted, often-animated hero object: Resend's lit 3D cube, Spade's 3D transaction-contour visualization, Browserbase's dithered launch, Goldsand's canvas film. Porter needs one signature visual. Options, in order of preference:
1. A living, softly-animated rendering of the finance team working: the product surface (dashboard / ledger / AR view) shown as a dark hairline card, with numbers, a clean line chart in the green ramp, and subtle motion (a value updating, an invoice marked paid, a status pill flipping to green). This doubles as proof that Porter is software.
2. An abstract obsidian object lit with a single soft green-tinted light source, slow rotation (the Resend approach), evoking craft and depth.
3. A restrained data-viz centerpiece (the Spade approach): a topographic or ledger-like form rendered in the green-on-obsidian ramp.

Whatever you choose: dark, one accent (green), considered slow motion, no neon, no rainbow, no glassmorphism.

### 6.5 Product UI as dark hairline cards

When showing the product (Sections 5.6, 5.5), render real-looking Porter UI as cards: `--surface` fill, 0.5px `--hair` border, zero radius, generous padding, DM Sans, numbers in tabular figures, EB Garamond only on a hero metric or total. Status uses pills: green for done/paid/current, amber `--warning` for needs-attention, soft `--error` for overdue. This is exactly Resend's move (their email-composer mockups) and it is the most credible way to show the software without a screenshot dump. Match the studio and Bible primitives, do not invent a new visual language for these mockups.

### 6.6 Motion

Premium motion is cinematic and scroll-driven, not parallax gimmickry. Patterns worth using:
- Quiet entrance reveals on scroll (opacity plus a small translateY, 0.4s, ease-out). The current site already uses this pattern.
- A scroll-scrubbed moment for one key statement (Extra.email scrubs text and color as you scroll). Use once, for the thesis line, not everywhere.
- A slow, looping ambient motion on the hero object only.
- Hover: the universal hover is a subtle green wash (`--green-wash`), never a gray fill, on rows, cards, nav items, buttons.
Keep it restrained. One or two memorable motion moments beat ten.

### 6.7 Nav and mega-menu

If you build dropdowns, use Resend's pattern: a dark panel (`--surface` or `--elevated`), 0.5px hairline, two columns of text links plus one or two small "preview tiles" with a mini line-art thumbnail. Sharp corners. Subtle.

### 6.8 CTAs

Pill buttons (9999px, the Bible's one rounded exception). Primary: a solid fill (either ivory `--ink` with `--bg` text for maximum contrast on dark, or green `--green` with `--bg` text). Secondary: transparent with a 0.5px `--hair` outline and ivory text. Keep button text DM Sans, can be uppercase tracked at 12px for the couture feel. Consider a "See how it works" or "Watch the film" secondary, premium brands present a film, not a demo (Extra, Retool both do this).

### 6.9 Anti-patterns (reject on sight, from the Bible)

Saturated gradient backgrounds, glowing neon, glassmorphism, frosted glass, heavy card shadows, decorative illustrations that do not earn their place, rounded 8px corners, blue links, bright red error states, Tailwind default theme, rainbow charts, eyebrow labels "for balance," badges that re-label things, helper text where whitespace would do. When in doubt, remove it.

---

## 7. Reference-site cheat sheet (what to take from each)

- **Resend (resend.com):** the dark template. Pure-dark canvas, warm-ivory text, big editorial serif hero at regular weight, product UI as dark hairline cards with green/amber status pills, dark mega-menu with preview tiles, lit 3D hero object. Closest to where Porter should land. Steal the most here.
- **Spade (spade.com):** the light-mode cousin of Porter's aesthetic. Pale wash, warm near-black ink, oversized editorial display, monospace transaction micro-labels, sharp corners, a single animated data-viz hero. Proof the Bible grammar works for a finance product. Translate its restraint to dark.
- **Retool (retool.com):** dark done with warm-ivory text (`#E9EBDF`), oversized thin display, product shown in dark frames, subtle gradient glow, "watch it" play button.
- **Anima (anima.ai):** massive editorial display with tight negative tracking, monospace tracked micro-labels, sharp 0px corners, motion hero, extreme restraint.
- **Browserbase Runtime (browserbase.com/runtime):** bold short hero headline, one striking custom hero illustration, pill CTAs, mono accents. A reminder that one strong visual beats many.
- **Goldsand (goldsand.fi):** cinematic, scroll-driven, custom type, near-empty restraint. The "treat the site like a film" end of the spectrum.
- **Daydream (withdaydream.com):** bespoke hand-drawn illustration as a craft/warmth signal, numbered editorial sections ("01 / 04"). Note: it is friendly and rounded, the opposite of Porter's sharp corners, so take the craft and the numbered storytelling, not the pastels or the radius.
- **Acquired (acquired.fm):** warm-paper editorial palette, high-contrast Reckless-style serif, uppercase tracked micro-labels, sharp-cornered card grid. The editorial-magazine flavor of luxury.
- **Extra (extra.email):** cinematic photographic/3D hero with text overlay, scroll-scrubbed text-and-color reveal for one statement, "Watch the film" CTA. Steal the one scroll-scrub moment for the thesis line.

The thread across all nine: oversized editorial display at the hero (never bold), monospace-or-tracked micro-labels, near-monochrome with meaning-only color, one crafted hero object, cinematic restrained motion, product shown as clean dark cards, sharp corners and hairlines. This is, almost exactly, the Porter Design Bible. The references confirm the direction; they do not override it.

---

## 8. Assets and technical notes

**Logos (in this repo, `porter-landing-page/`):**
- `porter-logo-light.svg` (light/white logo, use on the dark canvas).
- `porter-logo-dark-transparent.svg`, `porter-logo-nav.svg`.
- Full brand kit and variants: `../Brand/` (icon, wordmark, dark/light variants) and the brand guide at `../Brand/porter-style-guide-updated.md`. Note: that brand guide describes the LIGHT app system. For this site, the Bible's dark palette (Section 6.1) governs.

**Screenshots available** (in this repo, for product mockup reference, but prefer building clean dark hairline cards over dropping raw screenshots): `screenshot-dashboard.png`, `screenshot-invoices.png`, `screenshot-payments.png`, `screenshot-bank-transactions.png`, `screenshot-financial-report.png`, `screenshot-schedules-activity.png`, `screenshot-schedules-source.png`.

**Fonts:** EB Garamond and DM Sans from Google Fonts. Material Symbols Outlined (weight 300) for icons.

**Existing files:** `index.html` (current single-file site, the OLD light "AI financial copilot" version, to be replaced), `privacy-policy.html`, `terms-of-service.html` (keep, restyle to match), `porter-marketing-v4.jsx` (an in-progress React marketing draft, has Claude Code notes inline, worth reading before you choose an approach).

**Recommended stack:** match what exists. The current site is a single self-contained `index.html` with inline CSS and vanilla JS scroll animations, which is easy to host and fast. If Michael wants React, `porter-marketing-v4.jsx` is the starting point. Either way: dark by default, CSS variables from Section 6.1, no heavy framework needed for a marketing page. Keep it a single page plus the two legal pages.

---

## 9. Build sequence

1. Set up the dark token system (Section 6.1) and load the two fonts.
2. Build the primitives: pill button, hairline card, micro-label, section wrapper, nav.
3. Build the hero (Section 5.2) and the signature hero object (Section 6.4). This sets the tone; get it right before proceeding.
4. Build sections 5.3 through 5.11 in order, copy from Section 5 / content-kit.
5. Add the dual-nature software section (5.6) with a real product mockup card. Do not skip it.
6. Add restrained scroll-reveal motion (Section 6.6); one scroll-scrub moment on the thesis line.
7. Restyle the legal pages to match.
8. Verify against the checklist in Section 10.

---

## 10. Pre-ship checklist

- [ ] Zero occurrences of "AI", "agents", "automation", "MCP", "copilot" in customer-visible copy.
- [ ] No mention of margins, unit economics, or "50+ clients."
- [ ] The site makes it unmistakable that Porter is accounting software, not only a service.
- [ ] Dark canvas `#101211`, warm-ivory text `#F2F0EA`, green `#95D4B3` as the only accent.
- [ ] Zero border radius everywhere except pills.
- [ ] All borders 0.5px `#38423C`. No 1px gray borders. No Tailwind grays/blues/bright reds.
- [ ] EB Garamond only at hero/section statements, regular weight, never bold. DM Sans everywhere else.
- [ ] No shadows for depth (tonal layering instead). No glassmorphism, no neon, no gradient-soup.
- [ ] One signature hero object, one or two memorable motion moments, not ten.
- [ ] No em dashes in any copy.
- [ ] Reads legibly and feels premium at desktop and on mobile.

---

## 11. Source documents (read for depth)

- **Messaging and positioning (master):** `../strategy-synthesis-2026-05-19/messaging-strategy.md`
- **All channel copy (landing page, one-pagers, video scripts, social):** `../strategy-synthesis-2026-05-19/content-kit.md`
- **Investor narrative (the AI story, NOT for the public site):** `../strategy-synthesis-2026-05-19/investor-narrative.md`
- **Strategy memo (priorities, gaps):** `../strategy-synthesis-2026-05-19/strategic-memo.md`
- **Canonical design law:** `../porter-corporate-memory/design/BIBLE.md` (mirror: `../porter-frontend/design-system/BIBLE.md`)
- **Luxury baseline to echo:** `../porter-static-studio-onboarding/` (index.html, styles.css, app.js)
- **Vision (the finance team, org chart, proactive behavior):** `../porter-corporate-memory/vision/ai-finance-team.md` and `../porter-corporate-memory/vision/north-star.md`
- **Brand assets:** `../Brand/` and `../Brand/porter-style-guide-updated.md`
