# 089 · My CVs marks what the search matched: Tasks

- [x] 1 · `searchMatch.ts`, `HighlightedText.vue`, the per-field filter and the marks in `DocumentList`; unit tests — commit: 66ea20d
  - The unit tests caught an accent written apart (NFD): it folds to nothing and was left out of the
    mark, splitting "Martín" in two. It now goes with its letter.
- [x] 2 · Verification: screenshots light and dark, `npm test`, build, `qa:e2e`; criteria marked; roadmap to "Done"
  - Built site in Chromium, the sample CV and a copy renamed "Martin · versión corta": "na" marks
    "Na" in both names; "martin" marks "Martín" in both names and "Martin" in the title.
  - The mark: light #001551 over #d5e3fe, dark #d5e3fe over #0139b5 (the M3 primary container
    roles). The card's box is the same with and without a search. No console errors.
  - `forced-colors: active` (Chromium emulation): the mark takes the system's `Mark` / `MarkText`
    (black over yellow there), no shadow.
  - `npm test` 1226 passed (3 skipped), build OK, `qa:e2e` 231/231. `qa:pdf` not run: no export is
    touched.
