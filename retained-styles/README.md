# Retained production styling

Reason: Clarity replays reconstruct recorded HTML using its original stylesheet
URLs. A Vite rebuild removes older hashed CSS from the next Vercel deployment,
leaving recordings without styling. Keep these files at their original URLs.

`files/` contains unchanged production CSS and its local dependencies. The first
snapshot was recovered from the preceding 30 days of successful production
deployments. `sources.json` records their deployment origins and CSS checksums.
Future snapshots are generated from the build and recorded in Git history.

When a change produces new CSS or dependencies, run `npm run archive:styles` and
commit the added files. Existing files are immutable and must never be removed.

`npm run build` requires the current styling to be retained, validates historical
dependencies, and copies the full archive into `dist` after Vite clears it.
CI runs that build and compares archived files with the PR base commit. Tests
exercise missing CSS, missing fonts, conflicting content, removal, and the
restoration of previous styles after a later build.
