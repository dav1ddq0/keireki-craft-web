# 088 · A made-up bold in the direct PDF: Tasks

- [x] 1 · The direct PDF strokes a made-up bold; `qa:pdf` measures Type 3 words by their box and checks the bold's ink; unit tests — commit: 7e7f99c
  - `src/types/pdfkit.d.ts` declares the two pdfkit calls it needed (`miterLimit`, text `fill`/`stroke`).
- [x] 2 · Verification: `npm test`, build, `qa:e2e`, `qa:pdf`; criteria marked; roadmap to "Done"
  - Entry title "Desarrolladora", ink of the direct PDF over the print's (600 dpi): Monogram sample
    1.000, Minimalist sample 0.988, Monogram longname4 1.011 (before: 0.68–0.81).
  - Fixture: made-up bold +2.9 %, the italic beside it +0.9 %. Mutation: without the stroke the
    bold check fails (−31.2 %).
  - `npm test` 1217 passed (3 skipped), typecheck and build OK, `qa:e2e` 231/231, `qa:pdf` 485/485
    (`monogram-longname4` passes; two new checks).
