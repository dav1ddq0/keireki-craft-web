# 061 · An imported CV takes the language of its PDF

**Status:** done

Found in spec 060: an imported CV was always Spanish (`meta.language = decisions.language ?? 'es'`,
and nothing sets `decisions.language`), so a PDF in English, French or German came in with its
section titles in Spanish. Asked for by the user.

## Change

- `pdfImport/patterns.ts`: the section headings are kept per language (`SECTION_WORDS`);
  `SECTION_KEYWORDS`, the table the heuristics match against, is built from them and holds exactly
  the words it held before. `headingLanguage(headings)` gives the language whose table holds most
  of the CV's headings, matched accent-free and with letters run together (tracked-out capitals).
  A tie goes to the language listed first (Spanish before Portuguese, English before French); no
  known heading gives null.
- `ImportDraft.language`: the language of the detected sections' headings.
- `assembleCV`: `meta.language` is the review's choice, else the detected language, else Spanish.
  The CV's dates and section titles then come out in the PDF's language. "Merge into the open CV"
  already took the imported `meta.language`, so it gets the detected one too.

## Limits

- A CV whose headings read the same in two languages goes to the first: "Perfil · Experiência ·
  Idiomas" is taken for Spanish. The language can be changed in Template and style.

## Verification

- `tests/pdfImportLanguages.test.ts`: the short CV of each new language gets its language; Spanish
  and English headings give es and en; a review choice wins; no known heading gives Spanish; the
  vote and its ties.
- Round trip: the spec 059 sample in the six languages, made into a PDF with six templates and
  imported: all 36 get their language.
- `npm test` 812 passed; `qa:e2e` 125/125.
