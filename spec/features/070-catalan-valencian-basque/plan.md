# 070 · Plan

Spec 057 added four languages the same way; this follows it table by table. No schema change:
`meta.language` and `prefs.uiLanguage` are already checked against their lists, so a stored value
from before stays valid, and an unknown one still falls back to Spanish.

## Implementation

1. **The CV** (`core/stylePresets.ts`, `templates/shared.ts`, `core/sectionPresets.ts`,
   `core/aiPrompt.ts`):
   - `CV_LANGUAGES` and `NATIVE_LEVEL` with `ca`, `ca-valencia`, `eu`.
   - In `shared.ts`, every table of `LANGUAGE_TABLES`, and the typed levels of `LEVEL_SCORES`
     (accent-free keys, as `normalizeLevel` leaves them).
   - Basque dates: `formatPartialDate` and `formatBirthDate` get a Basque branch, "2023ko mar." and
     "1992ko martxoaren 12a". The suffix comes from how the year ends when read aloud: *-eko* after
     a consonant (…1 *bat* but not …11 *hamaika*, …5 *bost*, …10/…30/…50/…70/…90 *hamar*, …x00 *ehun*), *-ko* after a
     vowel (the rest, and …000 *mila*). A small pure function with its own test table.
   - Section presets, the AI prompt texts.
2. **The interface** (`i18n/`, `core/sample.ts`):
   - Three dictionaries typed as `typeof es`; `LOCALES`, `LOCALE_NAMES`, `LOCALE_TAGS`.
   - `SAMPLES` is keyed by `Locale`, so the sample CV needs the three (a Catalan, a Valencian and a
     Basque person, as spec 059 did for the others).
   - The selects already loop over `LOCALES`; nothing to change in the components.
3. **PDF import** (`services/pdfImport/patterns.ts`):
   - `HeadingLanguage` and `SECTION_WORDS` gain `ca` and `eu` (Valencian shares Catalan's).
   - Months, abbreviated and written out, and the "present" words of both.
   - Basque year-first dates: `DATE_TOKEN` also accepts "2019ko urtarrila" / "2019(e)ko urt.".
4. **Verification**: the tests named in `spec.md`, screenshots, and the QA scripts, `qa:consistency`
   in Basque on the phone and the laptop.

## Decisions

- **`ca-valencia` as the code**, rather than an invented `va` (not an ISO 639 code) or
  `ca-ES-valencia` (needlessly long). Browsers that do not know the variant fall back to `ca`,
  which writes the same months and country names.
- **The Basque year suffix computed, not `Intl`'s**: `Intl.DateTimeFormat('eu')` writes "2023(e)ko",
  hedging both forms; a CV should read "2023ko".
- **Tables, not a new abstraction**: each language is one more entry in tables that a test already
  keeps complete.

## Risks

- **Translation quality**, Basque above all (declension, word order). Mitigation: the review noted
  as pending in `spec.md`; consistent terms taken from the strings already in the app.
- **Long Basque words** in the phone layout (buttons, the dock, the step bar). Mitigation:
  `qa:consistency` at 360 px and screenshots; shorter wording where a label overflows.
- **Catalan and Valencian dictionaries drifting apart** when a key is added later. Mitigation:
  `i18nDictionaries.test.ts` already fails on a missing key in any of them.
- **An import reading a word as a month**, as happened in 060 ("Generali 2019"). Mitigation: the
  months stay whole words, and the import tests gain cases in both languages.
