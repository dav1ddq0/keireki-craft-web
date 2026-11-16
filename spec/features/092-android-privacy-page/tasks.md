# 092 · The Android app's privacy policy, published on the site: Tasks

- [x] 1 · `public/android/privacidad.html` and `privacy.html`; left out of the precache; the marker test
- [x] 2 · Verification: build, preview, both pages; criteria marked; roadmap
  - `vite preview`: both pages 200, no console errors, each links to the other (200); light and dark checked. `dist/sw.js` lists them as known files, not in the precache.
  - The deploy runs `npm test`: until the markers are filled in, a push to `main` does not deploy.
- [ ] 3 · The user fills in `[RESPONSABLE]`, `[CORREO]` and `[FECHA]` and publishes
