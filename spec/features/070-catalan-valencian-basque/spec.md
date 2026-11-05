# 070 · Catalan, Valencian and Basque

**Status:** done

## What it does

The app and the CV it makes speak Catalan, Valencian and Basque too, in both language choices: the
interface language (preferences and the phone menu) and the CV's content language (Template and
style step). An imported PDF with headings in Catalan or Basque is recognised as such.

Each language is named in itself: **Català**, **Valencià**, **Euskara**.

## Why

The user asked for the co-official languages of Spain. A CV for a job in Catalonia, Valencia or the
Basque Country is often asked for in the local language, and the app should be usable in it.

## Decisions (asked of the user)

- **Both choices**, as in spec 057: interface and CV.
- **Catalan and Valencian are two entries**, so each user sees their own forms (Valencian *meua*,
  *este*, *servici*, *eixir*, first person *guarde*; Catalan *meva*, *aquest*, *servei*, *sortir*,
  *guardo*). Codes `ca` and `ca-valencia` (a valid BCP 47 tag: the `valencia` variant), used as is
  for `lang` and `Intl`; Basque is `eu`.
- **Address in the interface:** *vós* in Catalan and Valencian; *zu* in Basque.
- **Native review:** the translations are written without one, Basque especially. One is advisable
  before publishing (see Out of scope).

## Acceptance criteria

### The CV
- [x] The CV language select offers Català, Valencià and Euskara, each with its own `lang`.
- [x] Every per-language table (`LANGUAGE_TABLES`, `PRESET_TABLES`, `NATIVE_LEVEL`, the AI prompt
      texts) has the three; `cvLanguages.test.ts` fails if one is missing.
- [x] Dates read naturally: Catalan and Valencian "març 2023", "12 març 1992"; Basque writes the
      year first, with *-ko* or *-eko* as the year is pronounced ("2023ko mar.", "2021eko urr.",
      "1992ko martxoaren 12a"). A unit test covers the suffix over a table of years.
- [x] "Present", section titles, contact heading, extra contact labels, marital status and the
      accessible level label in the three.
- [x] Levels typed in the three are recognised for the dots (*llengua materna*, *nadiu*, *avançat*,
      *intermedi*, *bàsic*; *ama hizkuntza*, *aurreratua*, *ertaina*, *oinarrizkoa*…).
- [x] The custom-section presets, the data-protection clause included, and the "native" chip.
- [x] "Improve with AI" writes its prompt in the CV's language for the three.
- [x] The sample CV exists in the three interface languages, with a local person for each.

### The interface
- [x] `i18n/ca.ts`, `ca-valencia.ts`, `eu.ts` have every key of `es.ts`, typed as `typeof es`;
      `i18nDictionaries.test.ts` passes (same keys, none empty, same placeholders).
- [x] Both language selects offer nine languages, each named in itself; the choice is kept, and
      `<html lang>` follows it (`ca`, `ca-valencia`, `eu`).
- [x] Dates, months and country names in the interface (month field, phone country list) use the
      language's tag through `Intl`.
- [x] Nothing overflows or breaks on the 360 px phone or the 1024 px laptop in Basque, whose words
      are long (`qa:consistency`).

### PDF import
- [x] Headings, months and "present" words in Catalan/Valencian and Basque are recognised; Basque's
      year-first dates ("2019ko urtarrila – 2021eko ekaina") are read as a range.
- [x] A CV with Catalan headings is imported with its language set to `ca`; with Basque ones, `eu`.

### Quality
- [x] `npm test`, `npm run build`, `qa:e2e`, `qa:pdf`, `qa:consistency` pass.
- [x] Screenshots of the interface and of a CV in each of the three.

## Verification

`npm test` 942 passed; `npm run build`. `qa:e2e` 156/156, `qa:pdf` 128/128, `qa:consistency` 13/13
over 425 views, Basque walked on the 360 px phone and the 1024 px laptop (added to the script, as
German was in 057). Screenshots of the welcome, the editor and the CV in the three languages, on a
1280 px laptop and a 360 px phone: nothing overflows; Basque dates read "2022ko mar. – Gaur egun".
`Intl` with `ca`, `ca-valencia` and `eu` writes "França", "març", "Frantzia", "martxoa".

Beyond the plan: the custom-section hint named the CV language by its code ("CA-VALENCIA") and
now by its name, for every language; Gemini's `hl` gets `ca` for Valencian; the import had its own
list of language levels besides the templates', which gained the levels of the three.

## Out of scope

- **A native review** of the three translations: for the owner, before or soon after publishing.
- **Telling Valencian from Catalan in an import**: their headings are the same words; an import
  in either is set to `ca`, and the user can change it in Template and style.
- **Galician**: not asked for; the same work would add it later.
- **Android**: after the web, in its own spec.
