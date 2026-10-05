# Required landing lead answers and release

Objective: Require all landing-page lead answers; merge all current develop changes to main as Ben authorized.
Owner: This Codex chat. Release branch release/develop-20261005; PR 130.
Evidence: Main had newer campaign pages, attribution/exclusion receipts, and optional question sections absent from develop. Develop had older multi-entity implementations and completed-booking tracking.
Decisions: Merge main into the frozen develop release, preserve main's newer routing/pages/attribution on conflicting seams, retain design hero copy and completed-booking conversion from develop. Require shared-dialog text/radio answers plus separate Sale-Ready and Books Cleanup button choices. Render required questions openly; remove optional copy. Respect conversion exclusions for booking tracking.
Verification: Focused form tests and release build in progress; CI/preview to rerun after resolution. Earlier develop tests/build passed, but do not establish the merged release's result.
Next: Commit resolved release, rerun GitHub checks, merge into main without bypass, inspect production deployment.
