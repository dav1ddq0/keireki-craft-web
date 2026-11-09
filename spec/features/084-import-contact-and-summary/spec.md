# 084 · The PDF import: the e-mail, and the summary in Freelance and Retro

**Status:** done

## What it does

Three things the PDF import gets wrong today, found by the `qa:roundtrip` of spec 083 and there before
it:

- **The e-mail also comes back as two links.** In every template, a CV with
  `lucja.oster@example.com` imports with two extra links, "lucja.oster" and "example.com", labelled
  "Web". The e-mail itself is right. Only the CV's real links should be imported.
- **Freelance runs the contact details into the summary.** Its contact card, with no heading, sits
  under the summary card in the same column, so the summary comes back as the text followed by the
  e-mail, the phone, the place and the links. The summary should be its own text, and the contact
  details stay where they already go (e-mail, phone, place, links).
- **Retro loses the summary.** Its "Resumen" is a tab on the left with the text beside it, the text's
  first line set a little higher than the heading. The summary comes back empty. It should come back
  whole.

## Why

The import's promise is that a CV made here comes back whole from its own PDF (specs 037, 040). These
three break it in the two places a reader sees first: the summary and the contact links. The roundtrip
does not count them as failures today, only shows "partial" and "lost", so they went unnoticed.

## Acceptance criteria

- [x] A CV's e-mail no longer comes back as links, in any template; a link the CV has comes back once.
- [x] A link written inside a sentence and an e-mail on the same line are still told apart: the link
      comes back, the e-mail's pieces do not.
- [x] Freelance's summary comes back as its own text, without the contact details; the e-mail, phone,
      place and links are still found.
- [x] A summary sentence that mentions an e-mail or a web address keeps it: only lines that are
      nothing but a contact detail are left out.
- [x] Retro's summary comes back whole, in the direct PDF and in print.
- [x] Text beside a heading, on its row, belongs to that heading's section, whether it sits a little
      higher or lower than the heading; a line above the heading's row does not.
- [x] `qa:roundtrip` checks the summary and the links exactly, so "partial" and "lost" are failures
      and the extra links are caught; it passes over every template, direct PDF and print.
- [x] `npm test`, `npm run build`, `qa:roundtrip` pass; the import tests cover each case.

## Verification

`npm test` (`pdfImport.test.ts`: an e-mail alone and one with a long domain give no links, a link on
the e-mail's line and one inside a sentence still come back; Freelance's order, the summary and then
the contact lines, and a line of an e-mail and a link together, are left out of the summary, a sentence
naming them is kept; Retro's tab, text a little lower than the heading, a line above the heading's row
and the section before's last line close above the heading stay where they belong; each new test fails
on the code before it, and dropping the row limit or the "right of the heading" condition fails one;
1202 tests, and in a clean copy all but the five files that need the real tree's environment),
`vue-tsc`, `npm run build`. `qa:roundtrip` 608/608 (every template, direct PDF and print; with the
summary and links now exact, task 1 showed 38 link failures and 4 summary ones, all gone), `qa:e2e`
231/231.

The review found two things, fixed after task 5: a summary line that reads like a place ("Datos,
diseño y producto."), close above the e-mail, was taken for the place and so left out of the summary;
the place is now looked for below the contact details first. And only text above a heading, on its
row, moves after it: a line lower than the heading but read before it is another column's. A test for
each fails on the code before; 1204 tests, `qa:roundtrip` 608/608.

## Out of scope

- How the review screen shows a detected link or the summary: unchanged.
- PDFs made elsewhere: the rules are general, but only this app's templates are checked.
- The other fields the roundtrip compares only by count (entries, skills): a later spec, if needed.
