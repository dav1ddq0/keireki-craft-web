# 084 · The PDF import: the e-mail, and the summary in Freelance and Retro

**Status:** proposed

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

- [ ] A CV's e-mail no longer comes back as links, in any template; a link the CV has comes back once.
- [ ] A link written inside a sentence and an e-mail on the same line are still told apart: the link
      comes back, the e-mail's pieces do not.
- [ ] Freelance's summary comes back as its own text, without the contact details; the e-mail, phone,
      place and links are still found.
- [ ] A summary sentence that mentions an e-mail or a web address keeps it: only lines that are
      nothing but a contact detail are left out.
- [ ] Retro's summary comes back whole, in the direct PDF and in print.
- [ ] Text beside a heading, on its row, belongs to that heading's section, whether it sits a little
      higher or lower than the heading; a line above the heading's row does not.
- [ ] `qa:roundtrip` checks the summary and the links exactly, so "partial" and "lost" are failures
      and the extra links are caught; it passes over every template, direct PDF and print.
- [ ] `npm test`, `npm run build`, `qa:roundtrip` pass; the import tests cover each case.

## Out of scope

- How the review screen shows a detected link or the summary: unchanged.
- PDFs made elsewhere: the rules are general, but only this app's templates are checked.
- The other fields the roundtrip compares only by count (entries, skills): a later spec, if needed.
