# 069 · Plan

1. `deploy.yml`: `npm ci --ignore-scripts`, `persist-credentials: false`, the four actions at
   their latest release, pinned by commit.
2. `.github/dependabot.yml`: npm with no version-update PRs (security updates only), and
   github-actions monthly.
3. `services/export/html.ts`: a CSP meta first in `<head>`; a unit test on `buildStandaloneHtml`,
   and `qa:security` reads it from the downloaded file.
