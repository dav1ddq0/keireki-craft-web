# 082 · Fixes from the template consistency review

**Status:** done

## What it does

A review of the 18 templates (every one downloaded as a PDF from Export, with the sample, a photo,
a long CV, a very long name, another accent and font, light and dark theme) found three defects.
Everything else passed: the suites, the PDFs (valid, A4, fonts embedded, all the text, the file
name) and the live preview against the PDF. This fixes the three:

1. **Amber: the downloaded PDF covers page 1.** With a name that wraps to four lines and Amber's own
   style (orange accent, Raleway, as picked in the gallery), page 1 of the direct PDF shows only the
   side column; the rest is under a block of orange and charcoal. The text is still in the file, so
   no text check sees it. The print and the paged view are right.
2. **Retro: in the live preview, a CV longer than a page runs onto black.** The white sheet is one
   page high; text past it lies on the frame's ink part (unreadable), and further down on nothing.
   A long CV, a long name or a wider font (JetBrains Mono) is enough. The PDF is right.
3. **Ledger: with a long CV, page 1 holds only the header and the summary.** About 75 % of the sheet
   is empty and the whole of Experience starts on page 2, in the print and the PDF alike.

## Why

1 breaks the file the user sends, with no warning anywhere. 2 makes the preview unreadable for any
CV of two pages. 3 wastes most of the first page, the one a recruiter reads.

## Cause (investigated)

1. **The direct PDF measures a box as the union of its fragments.** paged.js lays each page out in
   CSS columns; what it cuts off can leave a sliver of a box (here 9 px of `.amber` and its side
   column) in the next column, off the sheet. The print never shows it. `drawBox` in
   `pdfDirect.ts` reads `getBoundingClientRect()`, which spans every fragment: the side column was
   measured some 2,080 px wide and its background painted over the page. Ledger's long CV leaves
   such slivers too, without a visible effect today.
2. **Retro's sheet has a fixed height.** The `::before` that draws the sheet, the side band and the
   frame is `297mm` minus the frame, right for one paged page; the live preview is one tall sheet.
3. **A grid section is not split by Chrome inside paged.js's columns.** Each Ledger section is a
   grid, its title beside the content. When Experience does not fit on page 1, Chrome moves the
   whole grid to the next column instead of breaking between entries, and paged.js then cuts before
   it. As a block the same section breaks between entries (tried: page 1 then holds 5 of 6 entries).
   - **And Chrome keeps a stale layout after the cut.** As blocks, a page that only just fits
     (spec 075's growing side column, 2 to 7 extra skills) drew its last row («Francés»,
     «Backend») in the column past the sheet with 45 px still free. paged.js's breaks were right;
     after it removes what it cut, Chrome reuses the page's old fragmentation. Laying the page's
     content out afresh (hidden and shown once) puts the row back; a width change or a style on
     the sections does not.

## Acceptance criteria

- [x] Amber, four-line name, Amber's style: the direct PDF's page 1 matches the print (`qa:pdf`
      diff ≤ 4 %), side column, header and main column visible.
- [x] The direct PDF draws a box only where it is on its page: a fragment outside the sheet is not
      painted (a unit-level check on the measuring, and `qa:pdf` across all templates).
- [x] `qa:pdf` covers a four-line name with each template's own style, so 1 cannot come back
      unseen.
- [x] Retro, live preview, a CV of 2 and 3 pages, a long name, JetBrains Mono: every line of text on
      the white sheet; the frame (accent above, ink below) down to the foot of the content; nothing
      painted past the page box.
- [x] Retro, one-page CV: the live preview unchanged (as fixed in 080 task 4).
- [x] Retro, paginated (print, direct PDF, paged view): unchanged, `qa:pdf` identical.
- [x] Ledger, the sample CV: unchanged to the eye (section heights equal within 1 px).
- [x] Ledger, sample with its experiences ×3 and ×4: Experience starts on page 1 and breaks between
      entries; no entry split; print and direct PDF agree (`qa:pdf`).
- [x] Ledger, spec 075's growing side column (0 to 20 extra skills): no text off its page.
- [x] No other template changes: `qa:pdf` and `qa:e2e` as before, `npm test`, `npm run build` pass.

## Out of scope

- The observations of the review that are by design: samples that take two pages in some templates,
  Monogram's warning when its side column cannot fit page 1 (spec 033), Classic without a font
  choice, the gallery thumbnails' dark colours.
- Why paged.js leaves slivers in the next column at all: the print hides them, and after 1 the
  direct PDF does too.
- Other templates' bands in a multi-page live preview: the review found no defect there.
- Monogram, four-line name with its own style: the print sets the entry titles of page 2 in a
  fallback italic, the direct PDF in the right one (`qa:pdf` "every word where the print has it").
  A font matching question, found by the new mode, not one of the three defects; as before 082.
