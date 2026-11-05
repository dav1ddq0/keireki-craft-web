# 072 · Fixes from the Amber stress test: Plan

## Approach

Two small fixes, one per fault, each with the check that would have caught it.

## Implementation

### 1 · The baseline in the direct PDF
1. `services/export/pdfDirect.ts`, `descentOf`: measure on a probe that cannot land on another line.
   An absolutely positioned, hidden, `nowrap` span inserted where the old probe went (so the child
   list changes exactly as before), inheriting the element's font, holding a letter and the
   zero-size baseline marker: the descent is the letter's box bottom minus the marker's bottom.
   It is a property of the font, not of where the text wrapped. `firstRect` is no longer needed.
2. `qa/pdf-compare.cjs`: a `longname` mode — a two-word name whose last word is too long for a line,
   and positions long enough to push " · company" onto a new line — compared print against direct
   like the others, every template.

### 2 · Long words in Amber's side column
1. `templates/amber/Template.vue`: `overflow-wrap: anywhere` on the side column's text (entries and
   metadata); the level rows keep `break-word`, so a language name does not shrink to a few letters
   before its marks wrap.
2. `tests/amberTemplate.test.ts`: the side column's text rules carry `overflow-wrap`.

## Decisions

- **Measure the font, not the line**: the descent is the same wherever the text wrapped; measuring it
  away from the line removes the break opportunity instead of guessing which line the probe took.
- **Same insertion point as before**: selectors like `:first-child` see the same children while the
  probe is in.

## Risks

- **A one-pixel shift in every PDF** if the new measurement differs from the old one where the old one
  was right: `qa:pdf` compares all templates; the differences must stay where they were.
