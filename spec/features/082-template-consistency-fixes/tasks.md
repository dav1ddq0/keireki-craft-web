# 082 · Fixes from the template consistency review: Tasks

- [x] 1 · Direct PDF: `boxOnPage` and its tests; `drawBox` and `drawImage` measure only the page; `qa:pdf` mode `longname4` with each template's style — commit: 4368a23
- [x] 2 · Retro: the live sheet follows the content, paginated unchanged; screenshots with 1, 2, 4× the experiences, light and dark — commit: facf0fd
- [x] 3a · Pagination: `relayoutPages` after paged.js, each page laid out afresh; its unit test — commit: d92739c
- [x] 3 · Ledger: sections as floats instead of grids; the sample unchanged, Experience splits on page 1 — commit: 83ce4c1
  - Was blocked: as floats `ledger-sidegrow` (spec 075) lost a line off page 1 with 2 to 7 extra
    skills. Not `column-fill` (it is `auto`): Chrome keeps the page's stale layout after paged.js's
    cut. Fixed by 3a.
- [x] 4 · Verification: `npm test`, build, `qa:pdf` against the baseline, `qa:e2e`; criteria marked; roadmap to "Done"
  - In a clean worktree of 83ce4c1: `npm test` 1206/1206, build OK, `qa:e2e` 231/231. `qa:pdf`
    482/483 against HEAD 3793e0b's 482/483: only Ledger's long (3 → 2 pages), break (4 → 3) and
    longname (5 → 3) change; `ledger-sidegrow` passes. The one failure, Monogram's longname4
    italic, is the same before and after (out of scope).
