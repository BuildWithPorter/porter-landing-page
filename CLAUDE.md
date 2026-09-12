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
