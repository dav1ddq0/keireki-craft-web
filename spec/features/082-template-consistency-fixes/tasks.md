# 082 · Fixes from the template consistency review: Tasks

- [x] 1 · Direct PDF: `boxOnPage` and its tests; `drawBox` and `drawImage` measure only the page; `qa:pdf` mode `longname4` with each template's style — commit: 4368a23
- [x] 2 · Retro: the live sheet follows the content, paginated unchanged; screenshots with 1, 2, 4× the experiences, light and dark — commit: facf0fd
- [ ] 3 · Ledger: sections as floats instead of grids; the sample unchanged, Experience splits on page 1
  - Blocked: as floats (and as blocks with an absolute title) the long CV is fixed (3 → 2 pages) but
    `ledger-sidegrow` (spec 075) loses a line off page 1 with 2 to 7 extra skills. The 075 trial sees
    the page fit (Francés ends at 1078 of 1123 px); after paged.js's real cut Chrome still moves the
    last row to the overflow column. Lead: the column container is `column-fill: balance`. Change
    reverted; needs its own investigation.
- [ ] 4 · Verification: `npm test`, build, `qa:pdf` against the baseline, `qa:e2e`; criteria marked; roadmap to "Done"
