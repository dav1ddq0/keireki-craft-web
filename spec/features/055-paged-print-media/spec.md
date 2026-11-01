# 055 · The paginated view turned the dark theme white

**Status:** done

Reported by the user: with the dark theme, opening the paginated view of the Export step turned the
form's background white.

## Cause

paged.js takes the rules out of every `@media print` block of the CSS it is given and adds them,
unconditionally, to the `<style>` it puts in `<head>` (`pagedjs/src/modules/paged-media/print-media.js`).
We give it print.css, last so that it has the last word (spec 041), and print.css's print block holds
the rules for printing the whole document:

```css
html, body { margin: 0; padding: 0; background: #fff; }
body > #app { display: none !important; }  /* rewritten to [data-id="app"]: it matched nothing */
a { text-decoration: none; color: inherit; }
```

Unwrapped, they applied to the whole interface for as long as the pages existed: the white
background (and the body margins and link rule) while the paginated view was open, and also for the
moment the direct PDF download paginates off-screen. The copy of the document's CSS paged.js gets
carried the same rules.

## Fix

`exportCss()` (`services/export/pdf.ts`) hands paged.js both sheets without their print-only `@media`
blocks (`print`, `only print`, `print and (…)`; `screen, print` and `not print` stay), through
`withoutPrintMedia`. They are not needed there: when the pages are printed, the document's own
print.css, loaded by `main.ts`, applies them. The HTML export, which uses print.css on its own, does
not change. All templates set their links' colour and decoration, so the paginated pages look the same.

## Acceptance

- With the paginated view open, or while the direct PDF is built, the page background is the theme's.
- The printed and the direct PDF are unchanged (same pages, no blank last page).

## Verification

- `tests/pdfPrintMedia.test.ts`: print-only blocks dropped and the rest kept, nested blocks, braces
  and `@media print` inside strings and comments, print.css itself. Fails if no block is dropped.
- `qa:e2e`, layout block: the background of `html` and `body` does not change while the direct PDF is
  built or the paginated view opens. Without the fix both fail (`rgb(255, 255, 255)`); with it 125/125.
- `qa:pdf` 128/128 (every template: same pages as the print, no text missing, no blank last page).
- Dark theme, 1440 × 900, paginated view open (Chromium): `body` stays `rgb(17, 19, 23)`.
