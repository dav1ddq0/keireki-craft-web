# 062 · The CV as an image: download as JPG, copy to the clipboard

**Status:** in progress

Asked for by the user: download the CV as an image (JPG) from the export options, and a button to
copy the current CV to the clipboard as an image.

Decisions (asked of the user):
- **One image** for a CV of several pages: the pages one under the other.
- **JPG only** for the download.
- **Copy** goes in the preview toolbar (task 2). The clipboard takes PNG only, so it copies PNG.

## 1 · Download as JPG

- `services/export/image.ts`, loaded on demand: `buildCvImage(data, templateId, type)` builds the
  direct PDF (spec 031), draws each page with pdf.js (already in the app for the PDF import: no new
  dependency) and stacks them on one canvas, on white, with an 8 pt grey strip between pages.
  - About 192 dpi: an A4 page is 1587 × 2245 px. `layoutPages` scales a long CV down so the image
    stays under 16 M pixels, the canvas limit of Safari on iOS.
  - Each page is drawn on a canvas of its own and copied in: pdf.js paints its white background
    over the whole canvas it gets, and on a shared one it wiped the pages drawn before.
- `useCvExport`: the `jpg` kind downloads "<name> – CV.jpg". A failure is caught like the direct
  PDF's, and the three export views say so (`exportView.imageFailed`), without offering to print.
- An "Image (JPG)" option in the export step, the desktop dialog and the phone sheet, after the
  two PDFs, with its hint: to share or upload where a PDF is not accepted; to apply, the PDF.
- Texts in the six languages.

Verification:
- `tests/cvImage.test.ts`: the layout (192 dpi, the gaps, none after the last page, scaled under
  the iOS limit for a long CV, unchanged for a short one); the dialog downloads "Ana – CV.jpg" and
  closes, or stays open with the message and no print offer when the image fails; the sheet row
  and the export step card download it.
- `qa:e2e` (perf block, long CV of 3 pages): the download is a JPEG named "<name> – CV.jpg",
  1587 × 6777 px (every page of the direct PDF), and every page band has ink — this is what caught
  the wiped pages, which the unit tests (with a mocked image) could not. 128/128.
- Screenshots: the Monogram sample in German (2 pages) and Modern in Spanish; the dialog, the
  export step and the phone sheet.
- `qa:consistency` 12/12 over 365 views; `npm test` passing; `npm run build`.

## 2 · Copy to the clipboard

Pending.
