# 085 · A pagination releases only paged.js's styles

**Status:** draft

## What it does

Now and then `qa:pdf` failed a template's first case with "RangeError: Offset is outside the bounds
of the DataView" (seen on cobalt, facet and editorial; four times in 25 minutes of four runs at once
over four templates). This
finds why and fixes it.

## Cause (investigated)

- **The direct PDF fails in fontkit.** Building the PDF, fontkit subsets Roboto Flex: a composite
  glyph (gid 172) is copied as 30 bytes and its component written at offset 616. Roboto Flex
  is the interface font and has no WOFF twin, so it goes in as WOFF2, which fontkit cannot subset
  (`pdfFonts.ts`, spec 031).
- **The whole CV was in the interface font.** At that moment no `<style>` held the template's rules:
  the article had its `--cv-font`, but nothing applied it, so it inherited Roboto Flex.
- **Our own release removed them.** `paginateInto` took every `<style>` that appeared in `<head>`
  while paged.js worked for one of paged.js's, and `releasePagination` removed them all. In the
  failing runs Vite's dev server had put the template's style there in that window; it is never put
  back, so the next export of that template (the direct PDF after the print) was unstyled. Traced
  with a hook on `remove`: `releasePagination` from `printCv` and from `buildDirectPdf`.
- The production build loads a template's CSS as a `<link>`, which that count never included; the
  fault shows in the dev server and in `qa:pdf`, which runs on it. The same miscount also tagged such
  a style as paged.js's, so `collectDocumentCss` left it out of later exports.

## Acceptance criteria

- [ ] `releasePagination` removes the styles paged.js inserted (its polisher's list) and no other:
      a style added to `<head>` while paged.js works stays (unit test, failing before the fix).
- [ ] The rest of spec 022 and 041 holds: paged.js's styles tagged and released, the copy of the app
      CSS first, the print rules last (the existing tests).
- [ ] `qa:pdf` under load (four runs at once over classic, cobalt, editorial and facet, 25 minutes)
      shows no "converts" failure; before the fix the same load showed four.
- [ ] `npm test`, `npm run build`, `qa:pdf`, `qa:e2e` as before.

## Out of scope

- A WOFF twin for Roboto Flex: no CV text should be in the interface font; with the template's style
  in place none is.
- Monogram's fallback italic in the print with a four-line name (spec 082, out of scope there).
