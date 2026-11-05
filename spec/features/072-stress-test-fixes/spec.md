# 072 · Fixes from the Amber stress test

**Status:** proposed

## What it does

Fixes the two faults a stress test of Amber (spec 071) found: eleven extreme CVs compared print
against direct PDF, and Amber driven on phones and tablets.

1. **Text drawn one line too high in the direct PDF.** When an inline element's text starts on a new
   line (a long last name in Amber's header, " · Remoto" after a long position in Ledger), the direct
   PDF draws it one line up, over the line before. The print is right.
2. **Long words lost in Amber's side column.** A word longer than the column (a German compound in
   the education entry) runs past the charcoal band; it is white, so on the white page it vanishes.
   Preview, print and PDF alike.

## Why

Both lose text the user wrote, in the file they send: one overlaps it, the other hides it.

## Cause

1. `descentOf` (`services/export/pdfDirect.ts`) finds the baseline with a zero-width inline-block
   probe inserted before the element's text. The probe is a break opportunity: when the text wraps to
   a new line, the probe stays at the end of the line before, and the measured descent is off by a
   whole line.
2. Amber's side entries have no `overflow-wrap`, so an unbreakable word overflows (Harbor's and
   Monogram's side columns already break them).

## Acceptance criteria

- [ ] In the direct PDF, a long last name in Amber and a wrapped " · company" in Ledger sit on their
      own line, as in the print; a check in the stress script finds no element whose baseline probe
      lands on another line than its text, in any template.
- [ ] Every other template's direct PDF is unchanged (`qa:pdf` passes with the same differences).
- [ ] `qa:pdf` gains a case with a long name and long positions, so the fault cannot come back.
- [ ] In Amber, a word longer than the side column breaks inside it: nothing leaves the charcoal band
      (education title, institution, dates, description, language names, contact).
- [ ] `npm test`, `npm run build`, `qa:pdf`, `qa:roundtrip` pass.

## Out of scope

- The spec 033 warning's wording ("shorten skills or languages"), which does not fit Amber's side
  column (education and languages): not asked for.
- Empty level marks hard to see with very light accents (all templates): not asked for.
