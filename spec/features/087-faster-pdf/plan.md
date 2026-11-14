# 087 · Plan

## Approach

- `src/services/export/pdf.ts`: when paged.js is first loaded, its `Chunker.prototype.loadFonts` is
  replaced by one that waits for `document.fonts.ready`. Every caller of `paginateInto` has just
  rendered the same CV through `renderTemplateHtml`, which lays it out off-screen and waits for the
  fonts it asked for (spec 026), so the faces the pages need are loaded; the rest are never asked
  for. `Chunker` is declared in `src/pagedjs.d.ts`.
- `src/services/export/pdfDirect.ts`: `woffToSfnt(buf)` turns a WOFF 1.0 file into the sfnt it wraps:
  each table inflated with the browser's `DecompressionStream('deflate')` when it is compressed, laid
  out again behind a 12-byte offset table and 16-byte records, 4-byte aligned, checksums kept.
  `loadFont` applies it once and keeps the result in its cache, so fontkit reads plain tables.

## Decisions

- **Patch paged.js's method, not fork or upgrade it.** It is one method, on the one module that loads
  paged.js; an upgrade of paged.js would need checking anyway.
- **Convert in the browser, not ship TTF files.** The WOFF twins stay as they are (smaller to
  download and cache); the conversion takes milliseconds.
- **Speed never costs the PDF.** Found in review: the conversion needs `DecompressionStream`, which
  the app's oldest browsers (Safari 16.2–16.3) lack, and a failure rejected the whole export. The
  conversion now hands the WOFF on untouched when it cannot run or fails; fontkit reads it as before.

## Verification

- Unit tests: `woffToSfnt` on a bundled WOFF — fontkit reads the result as TrueType with the same
  glyphs and advances, a non-WOFF buffer comes back untouched; `paginateInto` replaces `loadFonts`
  so it no longer loads unused faces.
- The 19 templates × a normal and a long CV, before and after: text, fonts, pages, pixels.
- Timings: per phase (cold, warm, CPU ×6) and click → download under network emulation.
- `npm test`, build, `qa:e2e`, `qa:pdf`.

## Files

- `src/services/export/pdf.ts`, `src/services/export/pdfDirect.ts`, `src/pagedjs.d.ts`
- `tests/pdfFastFonts.test.ts` (new)
- `spec/constitution/roadmap.md`
