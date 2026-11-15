# 088 · Plan

## Approach

- `src/services/export/pdfDirect.ts`: `syntheticBold(face, weight)` is true when the weight asked
  for is 600 or more and the bundled face picked is lighter than 600: what the print shows for
  Monogram's 700 and Minimalist's 600 italic titles. `drawRun` then draws the run with text render mode "fill and stroke", inside
  `save()`/`restore()`: line width `size / 32`, miter joins, limit 4, the text's colour.
- `qa/pdf-compare.cjs`:
  - `misplacedWords`: where the print's box is taller than the direct PDF's by more than the
    tolerance (a Type 3 font), the word must start at the same x and lie within the print's box.
  - `compareSyntheticBold`: a page in Gelasio 400 italic only, one line at 700 and one at 400,
    printed by Chromium and converted; the ink of each line within ± 6 % of the print's.

## Decisions

- **Stroke the outline, not draw a bolder font.** There is no bolder file to draw; a filled and
  stroked outline is how Skia makes a bold up. The width was measured, not assumed: at 1200 dpi
  against Chromium's print (Gelasio italic, 10 pt), a stroke of 1/32 of the size gave the print's
  ink; 1/64 to 1/36 gave less.
- **The QA rule follows the measuring tool.** The words are drawn where the print has them (same x,
  same baseline in the rendered pages); only pdftotext's box of a Type 3 word is taller.

## Verification

- Unit tests for `syntheticBold` with the faces picked by `pickFace`/`faceFor`.
- `qa:pdf`: the new bold check, and a mutation (no stroke) that makes it fail.
- `npm test`, build, `qa:e2e`, full `qa:pdf`.

## Files

- `src/services/export/pdfDirect.ts`, `tests/pdfDirect.test.ts`, `qa/pdf-compare.cjs`
- `spec/constitution/roadmap.md`
