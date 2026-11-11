# 087 · A faster PDF

**Status:** in progress

## What it does

The PDF (and the print, the paginated preview and the JPG, which paginate the same way) is ready
sooner:

- The first export of a visit no longer downloads every font of the app, only waits for the ones the
  CV uses (already loaded by then).
- The direct PDF reads each font file once, instead of unpacking it again for every glyph it draws.

## Why

Reported by the user: "a veces se demora mucho generar el PDF". Measured on the production build,
clicking "Descargar PDF":

- paged.js 0.4.3 loads every `@font-face` of the document before paginating (`Chunker.loadFonts`):
  105 faces of 17 families, about 3.4 MB, because the font picker declares them all. The CV uses two
  or three. First export of a visit: 3.2–4.0 s at ~9 Mbit/s, 13–20 s at ~1.6 Mbit/s.
- fontkit 2.0.4 inflates a WOFF table whole, in plain JavaScript and without keeping it, each time it
  reads a glyph (`WOFFFont._getTableStream`): about half the drawing time of a PDF.

## Acceptance criteria

- [ ] A pagination does not request fonts the CV does not use; it still waits for the ones it does.
- [ ] The direct PDF hands pdfkit each bundled font as plain TrueType/OpenType (converted from its
      WOFF once per visit, in the browser, with no new dependency); a file that is not WOFF goes as
      it is.
- [ ] The PDFs are the same as before: the 19 templates, a normal and a long CV — same text, fonts,
      page count and pixels.
- [ ] First export at ~1.6 Mbit/s well under the 13–20 s of now; later exports faster than now.
- [ ] `npm test`, `npm run build`, `qa:e2e`, `qa:pdf` as before.

## Out of scope

- The DOM probe the drawing uses to measure each text's descent (≈10 % of the drawing).
- Declaring fewer fonts in the app, or loading the font picker's lazily.
