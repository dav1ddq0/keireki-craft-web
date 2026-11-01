# 059 · The sample CV in the interface language

**Status:** done

Left out of spec 057: the sample CV ("From a sample") was Spanish whatever the interface language.

Decisions (asked of the user):
- **A local person per language**, not one person translated: a name, a city, a university and a
  phone format of the country.
- **The CV language follows too:** loaded with the interface in German, the sample's dates and
  section titles are German.

## Change

- `core/sample.ts`: `createSampleCV(locale = 'es')` builds the sample from a per-language
  `SampleText`; dates, skills, levels and the shape of every section are shared. `meta.language`
  is the locale, `meta.title` is translated.
  - es: Nadia Martín Reyes, Valencia — unchanged, so the tests and QA built on it keep working.
  - en: Emma Clarke, Manchester (University of Manchester); fr: Claire Dubois, Lyon (INSA Lyon);
    it: Giulia Ferri, Bologna (Università di Bologna); pt: Inês Carvalho, Porto (Universidade do
    Porto); de: Lena Schneider, München (TU München). Companies are made up.
  - Phones are made up: the UK (Ofcom 07700 900xxx) and French (ARCEP 01 99 xx xx xx) ones from
    the ranges kept for fiction. The Italian and Portuguese ones are invented and were not checked
    against those countries' numbering plans; the German one starts its subscriber number with 0,
    which German numbering does not allow. E-mails are at example.com.
- `WelcomeView.vue` and `DocumentList.vue` pass the interface language.

## Verification

- `tests/sampleCv.test.ts`: Spanish unchanged; every other language has the same shape as Spanish,
  its own CV language, no line of prose left in Spanish (fails if one is copied over), e-mails at
  example.com.
- Screenshots of the sample loaded from the interface: de (Monogram, Harbor), fr (Cobalt),
  it (Modern), pt (Meridian), en (Classic).
- `npm test` 768 passed; `qa:e2e` 125/125.

## 2 · The English skill group is not called "Languages"

Found by importing the PDF of each sample (spec 060): the English sample's first skill group was
"Languages", the heading of the languages section, and the import read the skills as languages.
It is "Programming languages" now. `tests/sampleCv.test.ts` checks that no sample names a skill
group like a section (fails with "Languages").

## 3 · `qa:consistency` waits for the German sample's own person

The German walk of `qa:consistency` (spec 057) waited for "Nadia Martín Reyes" after loading the
sample; with the sample in the interface language it is Lena Schneider, and the walk timed out.
`qa:consistency` was not run after task 1; found while running it for spec 062. Each language of
the walk names its sample person now. 12/12 over 365 views.

