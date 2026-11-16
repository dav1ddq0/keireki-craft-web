# 092 · Plan

- **Pages:** plain HTML files in `public/android/`, copied as they are by Vite. Inline CSS (system
  fonts, the site's blue `#1d4ed8`, `prefers-color-scheme: dark`), `<html lang>`, a link to the
  other language and to the site. No script, no tracking.
- **Service worker:** `NOT_FOR_THE_APP` in `build/serviceWorker.ts` is a set of exact names; the
  pages are left out by their `android/` prefix instead, so a third language needs no change. A
  navigation to them goes to the network as any other (online); offline the browser shows the app,
  as for any page not cached.
- **The markers:** `tests/androidPrivacy.test.ts` reads both pages and fails on any of the three
  markers. It is the guard against publishing an unfilled page; the user's data never passes
  through the assistant.
- **Android repository:** its drafts take the same text, so both say the same; its spec 058 task 7
  points to the URLs.

## Decisions (the user's)

- Published on the site's own domain (rather than a file shown on github.com).
- The name, e-mail and date are filled in by the user, by hand.
