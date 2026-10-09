# Campaign tracking reconciliation

Objective: diagnose and repair Google/Meta campaign tracking, verify provider receipt and campaign configuration, reconcile real submissions.
Owner: Codex task 01a1215e-7070-74e0-aa44-f028c4ec970c, authorized by Ben 2026-10-09.
Repository: porter-landing-page; isolated codex/ads-tracking-reconciliation. No integration branch exists in this sibling repository. Started from develop, fast-forwarded released main to preserve production fixes before returning changes to develop.

## Observed evidence
- Three non-test Sale-Ready emails Oct4–5 carry Meta campaign tags, but Ads Manager Sep9–Oct8 reports no attributed Website Leads.
- Dataset 1383684593949468 receives Lead via browser/server; 79 raw events Sep11–Oct8, not prospect count. Meta Core Setup restricts custom parameters and URL paths. No traffic allow/block list configured. Advanced matching off. Match-quality detail lacks recent score; 0.0 display is not proof of universal match failure.
- Server handler has matching browser/server event IDs. Missing token silently skips; HTTP errors log only status; network errors caught; form returns success after email regardless.
- Production Vercel META_CAPI_TOKEN exists. Deployment dpl_Ap6L3JUiMWhpHxG2E1PaFk4CLBd2 READY created Oct7. Must verify deployed source SHA.
- Checklist forms read pixel cookies only, unlike shared helper that captures fbclid. UTMs read current URL only. Server tracking has no retained delivery receipt.
- Google call actions marked Misconfigured previously; cause not yet established.
- Open landing PR111 tracks bookings, owned by Ben; do not merge/rewrite it incidentally. No competing tracking worktree or current native task found; Linear search had no relevant issue.

## Plan
1. Verify dataset/ad-set identities, provider credential validity, source domains, historic logs where retained, Google labels and booking definitions.
2. Reproduce specific missing click-ID and delivery-error behavior using deterministic tests before fixing.
3. Narrow repair: preserve attribution, verify provider response, bounded retry for transient failures with same event identity/time, sanitized structured delivery receipt/diagnostics. Avoid new persistence schema until existing canonical storage path is established.
4. Test seams and build; compare baseline failures. PR to develop with gated merge; prepare normal frozen release if required. Production config changes/replays/hotfix need exact action authorization once concrete.
5. Verify deployed tracking and explain irrecoverable historical gaps without fabricated attribution.

## Decisions
- Email success must remain successful even when analytics fails; tracking failure must be separately observable.
- Do not disable Meta restrictions or turn on automatic advanced matching without a concrete verified need and exact authorization.
- Do not replay original leads as new conversions or use a fresh timestamp.
- No production customer data writes or campaign changes yet.

## Next
Inspect retained runtime logs and active ad set conversion, validate token, implement tested narrow repairs after cause experiments.

## Verified 2026-10-09 and implementation
- Sale Ready ad set 120253563280490666 selects Website, Lead, the correct pixel, and 7-day click attribution; no configuration mismatch found.
- Protected preview deployment dpl_3suRNV5MQpQXLSfLeRkmTZu1GCmE used the shared production/preview META_CAPI_TOKEN and returned HTTP200/events_received1 in Meta Test Events. Credential is valid. Earlier local probe used an empty redacted secret export and is invalid evidence; do not rotate token based on it.
- Historic Oct4-5 delivery cannot be established from currently accessible retained logs. No exact cause assigned to these three missing campaign credits.
- Deterministic regressions establish forms previously did not construct fbc from fbclid before a pixel cookie existed, and lost URL campaign tags on internal navigation. Implemented entry capture, bounded cookie persistence, same-campaign tuple preservation and duplicate-cookie exact-click selection. First-touch reporting remains separate.
- Implemented bounded transient retries retaining event ID/time/payload, accepted-event count verification, and sanitized API/log receipts. Email delivery success remains independent. Checklist analytics records provider status and ID-presence flags without raw Meta IDs.
- Temporary credential diagnostic endpoint removed from source before delivery.

- Google live diagnostics: Sale-Ready Checklist Submitted action 7807444721 last event ping Oct5 08:44, Awaiting conversions; YEC Call booked last ping Sep30 18:16 and warning explicitly says no pings in seven days. No evidence of a wrong Google conversion label or missing checklist tag. Do not change bidding or fabricate a booking event to clear warnings.
- Local full suite passed (20 Vitest files/155 tests plus server/script tests); build and retained styling passed. Independent review led to classifying exhausted transient provider errors as unavailable rather than definitive rejection and preserving full receipt shape on exceptional booking paths.
- Preview dpl_4VX8fLg85siwrpJfC2UoejkU7Fof READY, Sale Ready rendered correctly in Chrome; deployed API rejects incomplete submission with HTTP400. Earlier credential-only preview was removed after use. Final cookie guard review pending before final preview/commit.
- User unlocked iCloud Passwords: targeted searches found no identifiable Meta/Google Ads/Vercel API credential entries. Vercel CLI already authenticated. No credentials exported or rotated.

## Final source validation
- Cookie guard prevents oversized encoded values and invalid Unicode from breaking entry capture; opaque Meta IDs are omitted rather than truncated. Focused campaign/first-touch tests: 17 passed. Final full test run: 20 Vitest files / 160 tests plus 11 checklist server tests and remaining server/script tests all passed.
- GitHub repository had auto-merge disabled. Enabled allow_auto_merge (required status/review protections unchanged) to satisfy the mandatory gated develop delivery path; this does not bypass required checks.
- Porter monorepo API fast gates and authenticated Porter MCP are not applicable to this separate marketing repository; its required npm test, TypeScript, legal/readiness and retained-style production build checks are used instead.
- Next: commit reviewed source, gated develop PR, frozen release candidate PR with only tracking diff against main; obtain exact production action authorization before merging production.

- PR132 required tests passed, but CodeQL flagged two URL substring checks used only in the fetch mocks. Replaced them with exact parsed hostname comparison; no security checks or protections bypassed.
