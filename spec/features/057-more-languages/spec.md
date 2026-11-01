# 057 · French, Italian, Portuguese and German

**Status:** in progress

The app and the CV it makes spoke Spanish and English. The user asked for French, Italian,
Portuguese and German too, and for both language choices to offer them.

Decisions (asked of the user):
- **Both choices:** the CV's content language (Template and style step) and the interface language.
- **Portuguese of Portugal** (pt-PT): "carta de condução", "união de facto".
- **Formal address** in the interface: vous / Lei / o senhor / Sie (the Spanish interface says "tú").

Codes `fr`, `it`, `pt`, `de`; each language is named in itself (Français, Italiano, Português, Deutsch).

## 1 · The CV in six languages

- `CV_LANGUAGES` offers the four new languages; `meta.language` was already free text checked
  against that list, so there is no schema change and no migration.
- `templates/shared.ts`: months, "Present", the extra contact labels, marital status, section
  titles, the contact heading and the accessible level label, in every language. German writes the
  day of a birth date as an ordinal ("12. März 1992").
- The contact heading was `language === 'en' ? 'Contact' : 'Contacto'` in seven templates; it is
  `contactHeading(language)` in `shared.ts` now.
- Levels typed in the new languages are recognised for the dots (langue maternelle, courant,
  madrelingua, fluente, língua materna, avançado, Muttersprache, fließend, verhandlungssicher,
  Grundkenntnisse…).
- Custom-section presets (titles and seeds, the data-protection clause included) and the "native"
  chip of the level picker (now `NATIVE_LEVEL` in `stylePresets.ts`).

Verification: `tests/cvLanguages.test.ts` checks that every per-language table (`LANGUAGE_TABLES`,
`PRESET_TABLES`, `NATIVE_LEVEL`) has exactly the CV languages (fails when one is removed), dates and
typed levels in the new languages. Two older tests assumed Spanish and English only and were
corrected: French was their example of an unknown language, and "a language differs from Spanish in
its months" is false for Portuguese ("abr 2023"). Screenshots in de/fr/it/pt (Cobalt, Monogram,
Modern, Aurora). `npm test` 742 passed; `qa:pdf` 128/128.

## 2 · The interface in six languages

Pending — waits for the work on spec 056 to commit its own strings in `i18n/`, so they are
translated too.

## Out of scope

- The PDF import recognises Spanish and English headings only.
- The sample CV stays in Spanish.
- The translations were written without a native review; one is advisable before publishing.
