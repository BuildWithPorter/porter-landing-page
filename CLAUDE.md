# porter-landing-page

Marketing site for buildwithporter.com. Vite + React 19 + TypeScript, pre-rendered
to static HTML by `vite-react-ssg`, deployed on Vercel. Serverless handlers live in
`api/` and delegate to `server/`.

```bash
npm run dev      # local
npm run build    # check:legal && tsc -b && vite-react-ssg build
npm run lint     # currently red on main: 20 pre-existing problems, mostly
                 # react-hooks/set-state-in-effect. Re-baseline before blaming a change.
```

---

## Copy rules — these bind every word on this site

Distilled from `REBUILD-HANDOFF.md`, the v2 rebuild spec written by Michael on
2026-05-23. That rebuild shipped in the same commit and the spec was retired on
2026-08-24; the sections below are the part that outlived it. The full original is
in git history if you need the section-by-section copy deck.

**This is a CUSTOMER-facing website. These rules apply to every word and pixel.**

### 1. No AI. Anywhere. Ever.

The public site never says: AI, AI agents, agents, automation, machine learning,
LLM, MCP, copilot, "AI-native." Founders and SMB owners hear "AI bookkeeping" as
cheap, risky, or not-real. Porter is "powered by AI, delivered by humans"
internally, but the technology is invisible on the customer site. Sell the outcome
and the team, not the engine.

The AI story is real and central — it is the **investor** story, told in private
materials. If you reach for "AI" to make a section sound impressive, you are
writing the wrong site.

### 2. Lead with the finance team and the outcome.

"Your entire finance team, at your fingertips, at a fraction of the cost." Lead
with relief and control: someone competent has this handled, and for the first
time you understand your numbers.

### 3. Make the software unmistakable.

A real prospect once asked us to recommend "a modern accounting software," not
realizing Porter is one. Porter is both a service (the team) and software (the
system of record, a QuickBooks replacement you log into). Both must be obvious.

### 4. Never mention margins, unit economics, "50+ clients per CFO," or how we make money.

Investor-only. It does not go on the customer site.

### 5. Speak operator, not accountant.

No debits, credits, journal entries, GAAP, or reconciliation jargon in visible
copy. Finance is the story of how the business makes and spends money. Say it
that way.

---

## Messaging kit

**Hero line (lead with the first):** "Your entire finance team. At your fingertips."
· "Your finance team. At a fraction of the cost." · "An enterprise-grade finance
team, without the enterprise price tag."

**Words to use:** finance team, your numbers, how your business makes and spends
money, built for operators, get paid, pay smart, no more chasing, modern accounting
software, a fraction of the cost, focus on your business, we handle it.

**Words to ban:** AI, agents, automation, machine learning, LLM, MCP, AI-native,
copilot, debits, credits, GAAP, journal entries, reconciliation, margins, unit
economics.

**The feeling to sell:** relief and control.

**Honesty guardrail:** never claim "100% human." Just do not foreground the
technology.

**Style:** no em dashes. Use colons, commas, parentheses, or periods.

---

## Industry landing pages (POR-3087)

One page per industry (Porter Design at `/design` and `design.buildwithporter.com`,
with Home Services, Recruiting, Restaurants and SaaS to follow), each paired with its
own Meta campaign. Each page is the homepage template with its copy swapped.

- **Add an industry:** add a content file `src/industries/<key>.ts` and register
  it in `INDUSTRIES` (`src/industries/index.ts`). Then add its two host routes to
  `vercel.json`, a `<loc>` to `public/sitemap.xml`, and the subdomain in the Vercel
  project's domains. `tests/industries.test.tsx` fails until the repo-side pieces
  agree, and it also enforces the copy rules above on every industry's content.
- **A subdomain root is chosen by hostname in the browser.** `vercel.json` rewrites
  `/` to the industry path, but the client router only sees `/`. So the `/` route is
  `RootPage` (`src/pages/RootPage.tsx`), which renders the industry page on a
  registered host. Without it, the homepage replaces the industry page as soon as
  the JavaScript loads. `tests/industryHostRoot.test.tsx` pins this.
- **Sections take optional props that default to the homepage copy.** Never fork a
  section for an industry; add an optional prop.
- **Every claim in industry copy must be something Porter does today.** Each content
  file lists the claims deliberately left out. The reviewed decks and evidence are
  at https://claude.ai/artifact/1M7n4uebKfJQPt4TPG7vfk
- **The audit runs only on the apex.** Its QuickBooks return URL is built from the
  current origin. On a subdomain, the CTA sends the visitor to
  `https://buildwithporter.com/financial-health-audit?business_type=…`. That query
  pre-selects the tile, but only for a fresh audit (`businessTypeFromQuery`).
- **Attribution crosses subdomains.** On production marketing hosts (the apex, www,
  and registered industry hosts), attribution cookies use
  `Domain=.buildwithporter.com`, and the Meta pixel fires. Every other host keeps
  host-only cookies and no pixel. Never widen either check to `*.buildwithporter.com`,
  because dev-landing and preview hosts share that parent domain.
- **Measure with** PostHog `industry_cta_clicked` (`industry`, `placement`). The
  first-touch `landing_path` records a subdomain visit as the industry path.
