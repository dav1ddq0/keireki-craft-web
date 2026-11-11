# 087 · A faster PDF: Tasks

- [x] 1 · paged.js waits only for the fonts in use; the direct PDF converts each WOFF once; unit tests — commit: 489fdb4
- [x] 2 · Verification: PDFs compared, timings, `npm test`, build, `qa:e2e`, `qa:pdf`; criteria marked; roadmap to "Done"
  - The 19 templates with the user's CV, normal and four times longer (38 PDFs), against the ones
    made before the change: the same text, embedded fonts, page count and pixels (80 dpi), all 38.
  - Click on "Descargar PDF" in the production build, network emulated, a fresh visit: first export
    0.86 s at ~9 Mbit/s (was 3.2–4.0 s), 3.1 s at ~1.6 Mbit/s (was 13–20 s); later ones 0.18–0.20 s
    (was ~0.35 s). The same with the service worker allowed or blocked.
  - Two older tests mocked paged.js without `Chunker`; it was added to their mocks.
  - `npm test` 1214/1214, build OK, `qa:e2e` 231/231, `qa:pdf` 482/483: the one failure
    (`monogram-longname4`, words on page 2) is the same as before this change.
