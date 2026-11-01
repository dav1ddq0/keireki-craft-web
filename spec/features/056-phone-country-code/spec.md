# 056 · Phone: country code selector with flag

**Status:** proposed

In "Personal data" the phone is a free text box: the country code has to be typed by hand
(`+34 600 123 456`). Many sites give a country selector with the flag next to the number; this
does the same.

## What it does

- Next to the phone number there is a selector showing the flag and the dial code (🇪🇸 +34). It
  opens a searchable list of countries (name, flag, code).
- The selected country sets the code the phone is saved with; the number is typed after it.
- The default country is detected, in layers:
  1. At once and offline, from the browser language and time zone.
  2. In the background, from the connection's IP (a single request to `ipwho.is`), with a short
     timeout. If it answers and the user has not chosen a country, it replaces the first guess.
  3. If the request fails (offline, blocked, rate limit), the first guess stays; no error is shown.
- A country the user picked, or a phone that already has a code, is never overwritten by the
  detection.
- The phone is still stored as one string (`+34 600 123 456`): CVs already saved, imports and
  templates keep working unchanged.

## Why

Typing the code by hand is slow and easy to get wrong; a flag makes the country easy to find, as
users already know from other sites.

## Acceptance criteria

- [ ] The phone field has a country selector with flag and dial code, searchable by name and code.
- [ ] A new, empty phone starts on the detected country (offline: language/time zone; online: IP).
- [ ] The IP lookup never overwrites a country the user chose, nor a phone that already has a code.
- [ ] Offline, blocked or failing lookups leave the form fully working and show nothing.
- [ ] An existing phone (`+34 600 123 456`, or without a code) opens with the right country
      selected (or none) and is saved as it was typed if untouched.
- [ ] The stored value stays a string; no change to `src/types/cv.ts`, no migration.
- [ ] The lookup requests only the country code (no IP in the response) and is made at most once
      per session; the result is not persisted.
- [ ] Keyboard: the selector opens, filters, moves and picks with the keyboard; labels and focus
      are accessible. Works on the phone layout.
- [ ] Flags look the same on every OS (no emoji flags).

## Out of scope

- Validating or formatting the number per country (national patterns, libphonenumber).
- Detecting the country from the CV's location text.
- Any other use of the IP.
