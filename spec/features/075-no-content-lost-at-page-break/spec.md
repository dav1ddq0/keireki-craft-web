# 075 · Nothing is lost at a page break

**Status:** proposed

## What it does

The print and the direct PDF keep every section when the content of page 1 only just fails to fit.
Today, in three templates, a section (or most of the CV) is laid out outside the sheet and never
printed, with no warning:

| Template | Sample CV plus | What is lost | The app warns |
|---|---|---|---|
| ledger | 3 or 7 skills | everything between the header and the last section | never |
| monogram | 2 or 3 skills | the side column's Languages | not with 2 |
| cobalt | 5 to 7 skills | the side column's Languages | not with 5 |

The other 13 templates lose nothing from 0 to 20 extra skills. Found while fixing long words (spec
074), whose probe makes monogram's side column one line longer.

## Why

The file the user sends is missing what they wrote, and nothing tells them.

## Cause

paged.js lays a page out, finds the first element outside it, cuts there and removes the rest; it
never measures what is left. Removing the rest changes the page:

- **A box that was split gets its bottom padding back.** While the main column ran on to the next
  sheet, the grid row was split and the side column's bottom padding (the page margin) went with it.
  Once the overflow is gone, nothing on the page is split, the padding returns, the side column no
  longer fits, and Chrome moves its last section (kept whole) into the overflow area (monogram,
  cobalt).
- **A cut at a section's title leaves its empty shell.** paged.js cuts at the title, the first thing
  outside the page, and the section's border and margins stay at the foot of page 1, where they no
  longer fit (ledger, cobalt).
- **Chrome then breaks at the earliest allowed point.** In ledger every section is a grid with its
  title beside the content; the titles' `break-after: avoid` spreads to the whole section, so no
  break between sections is allowed and Chrome breaks right after the header.

The side-column warning (spec 033) measures the column without its bottom padding, so it stays off
in the first rows of the table.

## Acceptance criteria

- [ ] In every template, with the sample CV plus 0 to 20 skills, no text lies outside its printed
      page, in the print and in the direct PDF.
- [ ] ledger with 3 and 7 extra skills prints every section; page 1 holds the sections that fit.
- [ ] monogram and cobalt keep their Languages: on page 1 when they fit there, on page 2 otherwise.
- [ ] The side-column warning is on whenever the side column does not fit its first page.
- [ ] The sample CVs print as before (`qa:pdf` differences unchanged).
- [ ] `qa:pdf` gains the growing side-column case, so it cannot come back.
- [ ] `npm test`, `npm run build`, `qa:pdf`, `qa:e2e` pass.

## Out of scope

- When the side column is longer than its page, the main column moves to page 2 with it (spec 033
  warns about it); laying the two columns out independently is a larger change.
- Upgrading or replacing paged.js.
