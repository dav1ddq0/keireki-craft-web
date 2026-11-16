# 092 · The Android app's privacy policy, published on the site

**Status:** in progress · waiting for the user to fill in the markers and publish

## What it does

Google Play asks for a public URL with the privacy policy of the Android app (Keireki Craft for
Android, `com.dav1ddq0.keirekicraft`). The site publishes it as two static pages, outside the Vue app:

- `https://keireki-craft.eu/android/privacidad.html` (Spanish)
- `https://keireki-craft.eu/android/privacy.html` (English)

Each links to the other. They work without JavaScript, follow the light or dark theme of the system,
and do not load the app.

The text is the Android repository's draft (`docs/politica-de-privacidad.md`, `docs/privacy-policy.md`,
its spec 031) brought up to date with what the app does now:

- The cloud copy is made only when it is encrypted with the screen lock (Android 9 and later; its spec 058).
- "Back up all CVs" writes one file with every CV.
- The CV can be exported as a JPG image or copied as an image.
- Files shared with another app are deleted from the app's cache after an hour.
- An imported photo that is not an image of sane size is dropped.

The developer's name, contact e-mail and date are **not** written by the assistant: the pages carry
the markers `[RESPONSABLE]`, `[CORREO]` and `[FECHA]`, which the user fills in by hand before
publishing. A test fails while any marker is left.

The service worker does not precache the pages (the app never asks for them), as with `og-image.png`.

## Why

Asked for by the user: Play Console refuses to submit the app without the link, and the
`keireki-craft-android` repository is not public. The site's domain already deploys on every push.

## Acceptance criteria

- [x] Both pages are in the build output under `android/`, open from `npm run preview` and link to each other
- [x] Their text matches the Android app's behaviour (backup, exports, AI assistants, no Internet permission)
- [x] `precacheOf` leaves them out
- [x] A test fails while `[RESPONSABLE]`, `[CORREO]` or `[FECHA]` is in either page
- [x] `npm run build` passes; `npm test` passes except that test until the markers are filled in (1235 passed, 2 failed: the markers, 3 skipped)
