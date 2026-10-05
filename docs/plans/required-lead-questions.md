# Require landing lead questions

Objective: Require every visible lead-form answer before submission.
Evidence: All landing lead buttons use WaitlistDialog. Its noValidate form bypasses native validation; radios and textarea lack required. Financial-health-audit email form already requires email.
Decision: Keep shared form and styling. Mark question primitives required and validate trimmed text plus native constraints in onSubmit, before requests or conversion tracking.
Plan: Add regression coverage for missing/blank answers and invalid email; run focused tests and build; deliver a PR into develop. Preserve unrelated primary-checkout recommendation edits.
Owner: This Codex chat, branch fix/required-lead-questions.
