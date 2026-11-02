# 067 · Plan

## Approach

1. `build/serviceWorker.ts`: `serviceWorkerSource({ version, known, precache })`, the source of
   `sw.js` as a string (pure, unit-tested):
   - **install**: caches the index fresh (`cache: 'reload'`) and every precache file not cached yet;
     `skipWaiting`.
   - **activate**: deletes the entries that are no longer in `known`; `clients.claim`.
   - **fetch**: only same-origin GET. Navigations network-first, the cached index offline. Other
     files cache-first (ignoring `Vary`: a module script asks with an `Origin` header the install
     did not send); a known file fetched from the network is stored.
2. `vite.config.ts`: a build-only plugin that, in `generateBundle`, lists the emitted files and
   `public/`, and emits `sw.js` (version = hash of the list).
3. `src/main.ts`: registers `sw.js` (`import.meta.env.BASE_URL`), production only, after `load`.
4. `public/manifest.webmanifest`, `<link rel="manifest">`; `docs/site-images.cjs` adds
   `icon-maskable-512.png` (the logo at 80 % on a white square).
5. QA: the shared context blocks service workers (the blocks measure the app, and a 10 MB install
   in each parallel context would skew the timings); a new `offline` block allows them and checks
   offline reload, sample and PDF download, and that Chromium sees a manifest with its icons.
