# 068 · The published site, checked after each deploy

**Status:** done

## What it does

`npm run qa:live` checks the site where it is published (by default <https://keireki-craft.eu/>):

- every address ends at the one home over HTTPS (`http://`, `www.`);
- the files of 066 and 067 are served with their types (`robots.txt`, `sitemap.xml`,
  `og-image.png`, `manifest.webmanifest`, `sw.js`, the icons);
- in Chromium, on a laptop and a phone: the page opens with its CSP, the sample opens, the preview
  follows the form, an edit survives a reload, the service worker installs, the page is installable
  and opens offline; no errors, no 404, no request to another site but ipwho.is.

The deploy workflow runs it in a last job, `verify`, once the site is live. With
`QA_LIVE_COMMIT`, it first waits (up to 5 minutes) until `sw.js` names that commit: the first run,
right after a deploy, failed while the same check passed minutes later, and nothing showed the CDN
was already serving the new build.

## Why

The QA suite runs on a local build; what is published can still break on its own (the base path,
a missing file, the domain or its certificate). On 2026-11-02 the move to the custom domain would
have shown a blank page had the base path not been changed with it.

## Acceptance criteria

- [ ] `npm run qa:live` passes against the published site, and against a local `vite preview`
      (`npm run qa:live -- <url>`; the address checks are skipped there).
- [ ] The workflow's `verify` job runs after `deploy`, without the deploy's permissions, on the
      deployed URL.
- [ ] A failure exits non-zero and names what failed.

## Out of scope

- Monitoring between deploys (an uptime service).
