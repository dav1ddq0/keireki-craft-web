# 082 · Fixes from the template consistency review: Tasks

- [x] 1 · Direct PDF: `boxOnPage` and its tests; `drawBox` and `drawImage` measure only the page; `qa:pdf` mode `longname4` with each template's style — commit: 4368a23
- [x] 2 · Retro: the live sheet follows the content, paginated unchanged; screenshots with 1, 2, 4× the experiences, light and dark — commit: facf0fd
- [ ] 3a · Pagination: `relayoutPages` after paged.js, each page laid out afresh; its unit test
- [ ] 3 · Ledger: sections as floats instead of grids; the sample unchanged, Experience splits on page 1
  - Was blocked: as floats `ledger-sidegrow` (spec 075) lost a line off page 1 with 2 to 7 extra
    skills. Not `column-fill` (it is `auto`): Chrome keeps the page's stale layout after paged.js's
    cut. Fixed by 3a.
- [ ] 4 · Verification: `npm test`, build, `qa:pdf` against the baseline, `qa:e2e`; criteria marked; roadmap to "Done"
