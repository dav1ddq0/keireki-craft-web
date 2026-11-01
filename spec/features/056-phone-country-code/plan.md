# 056 · Phone: country code selector with flag: Plan

## Approach

A new `PhoneField` component replaces the plain input in `StepPersonal`. The phone stays one
string; the component splits it (longest known dial code at the start) into country + number and
joins them back on every change. Country data and flags are static assets. Detection is layered:
sync and offline first, one best-effort network call after.

## Implementation

1. `src/core/countries.ts`: list of countries (ISO code, dial code, names in en/es), plus pure
   helpers: `splitPhone(value)`, `joinPhone(country, number)`, `countryFromLocale(language, timeZone)`.
2. `src/services/geo/ipCountry.ts`: `fetchIpCountry()` calls
   `https://ipwho.is/?fields=country_code` with `AbortController` (about 2 s timeout), validates the
   response against the country list, caches the result in memory for the session, returns `null`
   on any failure.
3. `src/components/form/PhoneField.vue`: selector (button with flag + code, searchable listbox)
   and the number input; emits the joined string; accessible and usable by keyboard and on mobile.
4. Flags: the `flag-icons` package (MIT, 4:3 SVGs), each flag a lazily loaded asset through `import.meta.glob('…/flags/4x3/??.svg')`; `components/ui/CountryFlag.vue` renders one.
5. `StepPersonal.vue`: use `PhoneField` bound to `cv.data.personal.phone`.
6. `vite.config.ts`: add `https://ipwho.is` to `connect-src` in the CSP. Note in the file why.
7. `src/i18n/en.ts` and `es.ts`: strings for the selector (label, search, empty result).
8. `tests/`: pure tests for `countries.ts` helpers; `ipCountry` with a mocked `fetch` (ok, timeout,
   bad payload, offline); component test for "never overwrite a user choice".

## Decisions

- **Country by IP, as an explicit exception to "everything local"**: requested by the owner. It is
  kept to one request for the country code only, only while the phone is empty and no country is
  chosen, never persisted. Discarded: sending nothing (language/time zone only), kept as the
  fallback layer.
- **`ipwho.is`**: free, HTTPS, no key, CORS-enabled, `fields=country_code` keeps the IP out of the
  response. Its limits and uptime are not verified; failure is silent and harmless by design.
- **Phone stays a string**: no change to `src/types/cv.ts`, so no migration and no template change.
- **SVG flags from the `flag-icons` package, not emoji, not copied files**: emoji flags render as letters on Windows; installing the package (approved by the owner) keeps the 1.7 MB out of git and updates with `npm update`. Discarded: copying the SVGs into `src/assets/flags/`.

## Risks

- **Flag assets**: 257 two-letter SVGs (about 1.7 MB) end up in `dist`, loaded one by one only when shown. The glob is limited to the two-letter files, so the extras of the package (EU, UN, regions) stay out. Vite does not write the MIT notice into `dist`: it is credited in the README.
- **Wrong country by IP (VPN, travel)**: the selector is always one click away; a user's choice
  wins.
- **Privacy**: a third party sees the IP of whoever opens the step. Mitigated by the minimal use
  above and by documenting it in the spec and the UI copy if the owner wants a notice.
- **Dial codes shared by several countries (+1, +7)**: the split picks a default per code and the
  selector lets the user change it.
