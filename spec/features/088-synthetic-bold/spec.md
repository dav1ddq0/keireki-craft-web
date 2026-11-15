# 088 · A made-up bold in the direct PDF

**Status:** done

## What it does

Where a template asks for bold of a font that has no bold file for that style, the direct PDF draws
the text as bold as the browser shows it, instead of in the plain face.

## Why

Reported by `qa:pdf` since spec 082 as its one failure, `monogram-longname4` ("every word where the
print has it": Desarrolladora, Senior, Full-Stack, Grado, Ingeniería on page 2). The cause:

- Monogram's entry titles are bold italic (700), Minimalist's semibold italic (600). No bundled
  family has a bold italic file, only a 400 italic. Chromium makes the bold up (Skia thickens the
  outlines) and the print carries it as a Type 3 font; the direct PDF drew the 400 italic as it is:
  those titles came out 19–31 % lighter, in every Monogram and Minimalist PDF.
- pdftotext boxes a Type 3 word with the whole font's height. With Gelasio (Monogram's own font,
  `longname4`) that is twice a line, so the word's top seemed 9.5 pt off; with Source Sans 3 (the
  other modes) about 2 pt, under the 3 pt tolerance. The words were where the print has them: same
  x, same baseline.

## Acceptance criteria

- [x] Bold asked for (600 or more) of a bundled face lighter than that is drawn filled and stroked,
      the stroke a 32nd of the size: the ink of the print, ± 6 %. A real bold face, bold not asked
      for, and the PDF standard fonts are drawn as before.
- [x] `qa:pdf` compares a Type 3 word of the print by its x and by lying within its box; a word drawn
      a line off still fails.
- [x] `qa:pdf` checks the ink of a made-up bold (and of the italic beside it) against the print.
- [x] `npm test`, `npm run build`, `qa:e2e`, `qa:pdf` pass, `monogram-longname4` included.

## Out of scope

- A made-up italic (oblique) for families with no italic file (Roboto Slab, Dela Gothic One): no
  template asks for it.
- `font-synthesis: none`: no template uses it.
- Semi-transparent text with a made-up bold (found in review): a PDF fills and strokes the outline
  as two paints, so where they overlap, a band about half the stroke wide (≈ 0.15 pt at 10 pt), the
  text is darker: at an opacity of 0.85, 98 % against 85 %. Chromium paints one shape. pdfkit has no
  transparency groups to avoid it. No template reaches it today: the made-up bold titles (Monogram,
  Minimalist) are opaque; it would show in Modern's, Meridian's and Harbor's side group titles (650,
  opacity 0.85) with a font that has no bold, such as Dela Gothic One.
- Viewers that draw a thin stroke at least a pixel wide (poppler) show this bold a little heavier at
  low zoom.
