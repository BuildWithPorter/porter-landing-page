# Lead email reply routing

Owner: Codex 01a1588b-9da4-7523-98fd-55b131c8b83d. Ben requested removal of the internal notification Reply-To and support BCC on prospect confirmations, retaining Michael CC. No production deploy authorized.

Evidence: Resend message 01a155d5-ed19-75c4-a6be-95b7d07cc685 delivered October 19 20:24 UTC to Elaine and Michael. Its preview contains answers/checklist and no attribution. Internal message sets Reply-To to prospect, creating a quotation leak risk. A copy of customer content was sent to Ben via Gmail 1a1589385ed9fd71 as requested.

Plan: change shared routing and clarify internal follow-up instruction; exercise both actual API entrypoints with capture-only transport; update existing regressions and validate focused tests/type checks; open PR for review. No real prospect sends.

Reused clean companion landing worktree porter-books-cleanup after confirming former HEAD is merged into origin/main; new branch codex/lead-email-reply-routing. No new worktree created, no monorepo branch touched. Anonymous Vercel email handlers have no Porter MCP contract; authenticated MCP and Porter frontend evidence N/A. Resend live preview supplies before evidence.

Runtime proof completed before regression edits: both actual API handlers returned 200/conversion_eligible=false with capture-only transport. Confirmation To synthetic lead, CC Michael, BCC support, Reply-To Michael; internal alert has no Reply-To; tracking remains internal.

Verification: campaign API regressions 6/6, shared handler tests 11/11, changed-file ESLint, TypeScript build and whitespace check passed. Lead reviewed routing/attribution isolation and partial-send idempotency coverage. Gmail read-back confirmed Ben copy in SENT and INBOX. Delivery: PR only; live routing still unchanged pending deployment approval.

## Customer welcome revision
Ben expanded scope before deployment: make the confirmation friendly, clear and less overwhelming; verify the checklist promise. Live books-cleanup page explicitly offers The Year-End Books Checklist, eight items, and Send me the checklist. Both campaign pages promise the checklist; preserve the shared canonical checklist and Michael's existing wording. Remove the customer-facing answer table (operators keep the details), remove the receipt-style heading, use a short welcome/reassurance and personal follow-up, and shorten both offer subjects. No meeting commitment, booking CTA or invented response deadline. Complete runtime proof before editing regressions again.

Welcome runtime proof completed before regression edits: both actual handlers return 200; 8/10 original checklist items retained, short greeting present, answer table removed, internal answers preserved, CC/BCC and internal Reply-To correct.

Final welcome verification: 6/6 campaign email tests and 11/11 shared handler tests passed; changed-file ESLint, TypeScript build, and whitespace checks passed. PR136 updated with the welcome copy and subjects. Customer checklist wording unchanged; no production deploy or new prospect send.
