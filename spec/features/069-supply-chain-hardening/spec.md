# 069 · Hardening the build and the exported HTML

**Status:** in progress

From the security review of 2026-11-02. The app itself had no exploitable flaw; the risks were in
how it is built and published.

## What it does

- **No install scripts in CI.** `npm ci --ignore-scripts` in the workflow. A compromised dependency
  could otherwise run code in the build job, before `npm run build`, and change what is deployed to
  every user. The build needs none: the tests and the build pass without them (checked in a clean
  worktree: 876 tests, `dist/` complete). Five packages declare one (`core-js`, `es5-ext`,
  `esbuild`, `fsevents`, `vue-demi`); esbuild finds its binary through its optional platform
  package.
- **The checkout leaves no token behind** (`persist-credentials: false`): nothing later in the job
  can read it from `.git/config`.
- **Actions up to date**, still pinned by commit: checkout v7, setup-node v7, upload-pages-artifact
  v5, deploy-pages v5 (Node 24; GitHub warned that Node 20 is deprecated).
- **Dependabot**: security updates for npm and version updates for the actions, so a vulnerable
  dependency or an outdated action shows up as a pull request to review.
- **The exported HTML carries its own CSP**: `default-src 'none'`, inline styles, `data:` images and
  fonts. The file already has no script and loads nothing remote (`qa:security`); if a template ever
  let markup through, the file still could not run or fetch anything.

## Decisions

- **Not `npm audit signatures`**: on 2026-11-02 it fails for a package of the tree
  (`whatwg-url@17.1.1`: the registry announces a provenance attestation it then answers 404), so in
  the workflow it would block every deploy. Reconsider when it passes.

## Acceptance criteria

- [ ] Both `npm ci` of the workflow use `--ignore-scripts`; both checkouts `persist-credentials: false`.
- [ ] Every action pinned by commit at its latest major, running on Node 24.
- [ ] `.github/dependabot.yml` for npm (security) and github-actions.
- [ ] The exported HTML starts with a CSP meta that forbids scripts, frames, forms and any remote
      load; a unit test and `qa:security` check it.
- [ ] `npm test`, `npm run build`, `qa:e2e`, `qa:security` pass; the next deploy is green.

## Out of scope (for the owner)

- 2FA on GitHub and DonDominio, branch protection on `main`, the domain's transfer lock.
- DNSSEC and a CAA record (`0 issue "letsencrypt.org"`) at DonDominio.
- HSTS and response headers (Cloudflare in front): undecided.
