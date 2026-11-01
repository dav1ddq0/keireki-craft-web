# 060 · PDF import in French, Italian, Portuguese and German

**Status:** done

Left out of spec 057: the PDF import knew Spanish and English headings, months and levels only, so
a CV in the other four languages came in as unclassified blocks, without dates.

## Change

All of it is data, as `patterns.ts` intends ("adding a language is a data change"):

- **Section headings** (`SECTION_KEYWORDS`, matched accent-free): profil / profilo / perfil
  profissional / Über mich, expérience professionnelle / esperienza professionale / experiência
  profissional / Berufserfahrung, formation / formazione / formação académica / Ausbildung,
  compétences / competenze / competências / Kenntnisse (IT-Kenntnisse…), langues / lingue / línguas /
  Sprachen (Sprachkenntnisse…), and their usual variants.
- **Months**: janv., févr., mars, avr., mai, juin, juil., août, déc.; gen, mag, giu, lug, ott;
  fev, out, dez; März/Mrz, Mai, Okt, Dez. The month token took letters a–z only, so "févr.",
  "août" or "März" were lost; it takes any letter now (`\p{L}`), and `toPartialIso` looks the month
  up with its accents removed. The German numeric "03.2022" is read like "03/2022".
- **Present and range words**: aujourd’hui, à ce jour, actuel(le), en cours, oggi, attuale, in
  corso, atual(mente), heute, derzeit, aktuell, laufend; "à", "al", "até", "bis" between two dates
  ("Okt. 2020 bis heute").
- **Language levels** read on their own (`LANGUAGE_LEVEL_RE`): langue maternelle, natif, courant,
  avancé, intermédiaire, débutant, notions, madrelingua, fluente, avanzato, elementare, língua
  materna, avançado, intermédio, Muttersprache, muttersprachlich, zweisprachig, fließend,
  verhandlungssicher, gute Kenntnisse, Grundkenntnisse.

## Verification

- `tests/pdfImportLanguages.test.ts`: a short CV in each language finds the five sections, both
  experience ranges (one to the present) and the education dates, and reads the levels; every new
  month and range form. With the old `patterns.ts`, 26 of its 31 cases fail.
- Round trip: the sample of spec 059 in each of the six languages, made into a PDF (direct PDF)
  with Classic, Modern, Monogram, Cobalt, Harbor and Ledger, then imported: in every case the five
  sections, both experience ranges and the education dates come back. Levels drawn as dots or
  stars do not come back, as in Spanish. It found that the English sample named a skill group
  "Languages" (spec 059, task 2).
- `npm test` 805 passed; `qa:e2e` 125/125 (its import of the printed PDF included).

## Out of scope

- The imported CV's language (`meta.language`) is still Spanish whatever the PDF's language;
  nothing sets `ReviewDecisions.language`. Done in spec 061.
