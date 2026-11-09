# 084 · The PDF import: the e-mail, and the summary in Freelance and Retro: Plan

## Approach

Three small fixes in `src/services/pdfImport/`, each with tests that build the lines by hand (as
`pdfImport.test.ts` does), and the roundtrip made strict first, so it shows the three failures before
they are fixed and keeps them from coming back. No template changes: the import learns to read what
the templates already draw.

## Implementation

### 1 · The roundtrip checks the summary and the links
`qa/roundtrip.cjs`: the PDF import's summary must equal the uploaded one (after the same folding the
headline gets), and its links must be the uploaded links (URL without the scheme, in any order). Run
it: Retro and Freelance fail on the summary, every template on the links; nothing else changes.

### 2 · The e-mail is not two links
`heuristics.ts`, `findLinks`: the e-mails of a line are taken out before it is searched for links,
so `URL_RE` cannot match the pieces of an address. Tests: an e-mail alone, an e-mail and a link on
one line, a link in a sentence.

### 3 · The contact details are not the summary
`assemble.ts` (where the summary is put together): a line of the summary section that is only the
detected e-mail, phone, place or one of the links is left out, since the import has them already.
A sentence that contains one stays. Tests: Freelance's order (summary, then the contact lines), and
a summary that mentions a web address.

### 4 · Text beside a heading reads after it
`heuristics.ts`, before the sections are sliced: a line just before a heading in reading order, on the
same page, starting right of the heading's end and with its baseline within the heading's type size
of the heading's, is on the heading's row; it moves to just after the heading. Lines above that row
stay where they are. Tests: Retro's tab (text 5 pt higher than a 21 pt heading), text lower than
the heading, and a line above the row that must not move.

### 5 · Verification
`npm test` (in a clean copy as well), `npm run build`, `qa:roundtrip`, `qa:e2e` (the import flows);
the criteria marked; roadmap to "Done".

## Decisions

- **Strict roundtrip first**: today it reports "partial" and "lost" without failing, which is how
  these went unnoticed; making it strict before the fixes shows each one and keeps it fixed.
- **Fix the import, not the templates**: Freelance's contact card without a heading and Retro's tab
  are the designs the owner chose (specs 080, 081); a PDF from elsewhere can be laid out the same way.
- **Leave out whole lines only** (task 3): a summary that names an address keeps it; only a line that
  is nothing but a detail already found goes.
- **The heading's row by its type size** (task 4): Retro's text is 5 pt above a 21 pt heading; the
  next line of the section before is a whole line or more above, out of reach.

## Risks

- **Moving a line to a heading's section** (task 4) in a template whose dates or labels sit on the
  heading's row: the roundtrip over every template and the existing import tests catch it.
- **A place that is also a summary line** (task 3): only an exact match with the detected place counts.
