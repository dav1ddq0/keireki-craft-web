# 086 · The live preview shows where a page break is

**Status:** done

## What it does

The live preview marks each section that starts on a new page of the PDF (spec 022): a dashed line
across the section, just above it, with the label "New page in the PDF".

## Why

Reported by the user with a real CV (Minimalist, a break before the Summary): the preview showed one
page, the PDF two. The break was set in the order list, but the live preview is one continuous sheet
and never showed it (out of scope in 022), so it looked like a fault of the template. Changing the
template made it worse: where the Summary sits in a side column or the header (Banner, Chevron,
Freelance, Monogram, Retro) the break does not apply, so the same CV came out in one page there.

## Acceptance criteria

- [x] A section the template marks with `data-page-break` gets a mark in the live preview: a dashed
      line above it as wide as the section, and the label in the interface language.
- [x] No mark where the break does not apply: no break set, the first section, or a section the
      template puts in a side column or the header (they carry no `data-page-break`).
- [x] The mark follows the page: set and unset the switch, edit the content above, change template,
      zoom, resize the panel, a font that loads late.
- [x] The label reads the same at any zoom (phone included): the marks are not scaled with the page.
- [x] The page itself does not change: the marks are drawn over it, never in the template's DOM; the
      PDF, the print, the paginated preview, the HTML export and the copied image are as before.
- [x] Hidden from assistive technology (the switch in the form already says it); no pointer events.
- [x] Light and dark theme, desktop and phone: the mark is legible over the page.
- [x] `npm test`, `npm run build`, `qa:e2e` as before. `qa:pdf` not run: the change is in the live
      preview only, which no export renders.

## Out of scope

- Showing how many pages the PDF will have, or where the automatic breaks fall: that needs paginating
  on every edit.
- Changing which sections a template lets break (spec 022's rule stays).
