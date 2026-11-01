# 058 · The GitHub and LinkedIn links show the networks' marks

**Status:** done

Reported by the user: the GitHub link of Monogram and Cobalt showed a branch glyph, not GitHub's
icon. Then asked for LinkedIn's own mark too, in place of the stroked "in".

## Cause

Spec 049 drew both links with generic glyphs on purpose ("not any company's logo"): a branch for a
code host, a stroked "in" for a professional network. People do not recognise the branch as GitHub.

## Fix

- `templates/contactIcons.ts`: `CONTACT_ICONS.github` is GitHub's own mark (the Octicon
  `mark-github` path, 24 units). It is a filled shape, unlike the stroked icons, so it is listed in
  the new `FILLED_ICONS`. So is `CONTACT_ICONS.linkedin`: LinkedIn's mark, the "in" cut out of a
  rounded square (the Simple Icons path, 24 units). Task 2.
- Monogram and Cobalt give a link icon's `<path>` the class `filled` when its kind is in
  `FILLED_ICONS`; `.icon .filled` fills it with the icon colour, drops the stroke and scales it to
  0.78, the 18 units the stroked icons take.

## Acceptance

- In both templates, on screen and in the PDF, the GitHub and LinkedIn links show the networks' marks
  in the icon's colour, the same size as the other icons.
- The other icons do not change.

## Verification

- `tests/monogramTemplate.test.ts`: `FILLED_ICONS` holds LinkedIn and GitHub; in both templates
  their paths are filled and the e-mail one is not.
- The LinkedIn path rendered alone at 200 px: the mark, the "in" cut out.
- Screenshots of both templates' contact block (Chromium, 1440 × 900) and of Monogram's direct PDF.
- `npm test` 753 passing, `npm run build`, `qa:pdf` 128/128.
