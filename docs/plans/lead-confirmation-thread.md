# Lead confirmation and follow-up thread

Owner: Codex chat 01a14f51-e36b-7b50-af0f-8495de322db7. User approved implementation and isolated landing-repo worktree from main, PR only, no deployment.

## Evidence and decision
- Production-base a83f64d, shared server/checklistLead.ts sends two unrelated Resend messages: checklist to visitor, internal notification to operators. Confirmation has no submitted answers; Michael cannot reply in a message the prospect received.
- Both Books Cleanup and Sale-Ready use this handler. Main-site demo/audit notifications are a different backend contract; this change targets the two paid checklist forms discussed and preserves their provider and conversion boundary.
- Keep one idempotent batch. Send a Porter-prefixed, offer-specific confirmation with escaped submitted answers, original checklist, and Michael in CC with Reply-To Michael. Michael uses Reply all on this shared original. Retain separate operator-only attribution notification and explicitly direct follow-up to the confirmation. Never expose attribution metadata in the prospect confirmation.
- Existing checkout edits untouched. No prospect email, production form submission, deployment or campaign change is authorized by this implementation.

## Plan
1. Complete shared confirmation/notification implementation and offer copy.
2. Exercise actual API handlers in local Node runtime with transport capture; render both resulting HTML messages and inspect visuals.
3. Then add focused regressions for both offers, headers, escaping, missing optional answers, retry key and conversion exclusions; run touched checks/build.
4. Independent review, PR, retain branch and teardown owned worktree. No production deploy.

## Verification boundaries
No authenticated Porter MCP command exists for these separate anonymous Vercel/Resend checklist forms. MCP acceptance lane is not applicable to their behavior, not substituted with monorepo tools. No real prospect fixture or outbound send. Local actual-handler transport capture verifies payload/runtime behavior but does not establish live inbox threading; explicitly retain that limit.

## State
Implementation starting. No other open PR identified in these files; existing open PRs #125 and #111 concern copy/booking tracking, preserve them.

## Completed verification
- Both actual API entrypoints invoked in Node 24 after TypeScript transpilation, synthetic reserved QA address, capture-only fetch transport. Both returned 200 with conversion_eligible=false. Captured confirmation To prospect / CC Michael / Reply-To Michael, internal Reply-To prospect, unchanged stable batch idempotency keys, no attribution in prospect HTML.
- Focused Node handler tests: 11/11 passed. Vitest campaign emails + existing form workflow: 9/9 passed, maxWorkers=2. Production build (including TypeScript, legal, agent-readiness and retained styles) passed. Changed-file ESLint and diff whitespace check passed.
- Independent review /root/email_review completed with no actionable findings. Child result recorded here; native close capability unavailable, child exact application thread id unavailable, so resource release is unverified and no unrelated chat archived.
- Browser visual preview of local HTML blocked by browser URL policy (file protocol). No alternate browser path or server workaround attempted. HTML artifacts opened in Codex file panel; visual email-client layout and live delivered threading remain unverified. No production mail sent.
- Artifacts: /Users/benjamin/.codex/visualizations/2026/10/18/01a14f51-e36b-7b50-af0f-8495de322db7/lead-email/ (HTML and focused validation logs).

## Delivery
PR only as approved. No deployment, merge, production lead replay or retrospective emails. Follow-up procedure: Michael opens the copied customer confirmation and uses Reply all. Existing internal notification is retained for private attribution context.

## Branding correction after Ben review
Ben asked whether the initial preview matched outreach. It did not: initial marketing header/serif style was replaced before publication. Compared actual origin/integration email_branding.py and production read-only invoice_branding_settings on the verified Supabase production host: Porter Agents, Inc. uses #2D6A4F accent, raster logo, no display-name override or email footer. New layout follows outreach's 560px white rounded card, #F6F7F6 canvas, 4px #2D6A4F top accent, DM Sans/system font stack, compact uppercase wordmark and 32px padding. Both checklists inherit this typography while keeping their original content.

Logo distinction remains explicit: production outreach embeds raster logo as a CID attachment; current Resend batch endpoint does not support attachments (https://resend.com/docs/api-reference/emails/send-batch-emails). Use outreach's supported wordmark treatment, not an unbacked CID, expiring signed URL, or external image load. This is consistent styling, not exact logo parity.

After completing the correction, actual-entrypoint rehearsal repeated, then branding regression added. Node 11/11, Vitest 10/10, full production build, changed-file ESLint and diff checks passed. Independent review repeated: no new findings. Live inbox rendering/threading remains unverified.
