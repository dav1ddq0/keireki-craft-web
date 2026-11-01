# 058 · The GitHub link shows GitHub's mark

**Status:** done

Reported by the user: the GitHub link of Monogram and Cobalt showed a branch glyph, not GitHub's
icon.

## Cause

Spec 049 drew a code host as a generic branch glyph on purpose ("not any company's logo"). People
do not recognise it as GitHub.

## Fix

- `templates/contactIcons.ts`: `CONTACT_ICONS.github` is GitHub's own mark (the Octicon
  `mark-github` path, 24 units). It is a filled shape, unlike the stroked icons, so it is listed in
  the new `FILLED_ICONS`.
- Monogram and Cobalt give a link icon's `<path>` the class `filled` when its kind is in
  `FILLED_ICONS`; `.icon .filled` fills it with the icon colour, drops the stroke and scales it to
  0.78, the 18 units the stroked icons take.

## Acceptance

- In both templates, on screen and in the PDF, the GitHub link shows GitHub's mark in the icon's
  colour, the same size as the other icons.
- The other icons do not change.

## Verification

- `tests/monogramTemplate.test.ts`: `FILLED_ICONS` holds only GitHub; in both templates the GitHub
  path is filled and the LinkedIn one is not.
- Screenshots of both templates' contact block (Chromium, 1440 × 900) and of Monogram's direct PDF.
- `npm test` 753 passing, `npm run build`, `qa:pdf` 128/128.
