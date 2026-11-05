import { describe, expect, it } from 'vitest'
import { CV_LANGUAGES, NATIVE_LEVEL } from '@/core/stylePresets'
import { PRESET_TABLES } from '@/core/sectionPresets'
import { LANGUAGE_TABLES, basqueYear, formatBirthDate, formatDateRange, languageLevelScore } from '@/templates/shared'

const codes = CV_LANGUAGES.map((option) => option.code)

/** A CV language the templates do not fully know would print Spanish in the middle of it (spec 056). */
describe('every CV language is complete', () => {
  it('offers Spanish, English, French, Italian, Portuguese, German, Catalan, Valencian and Basque', () => {
    expect(codes).toEqual(['es', 'en', 'fr', 'it', 'pt', 'de', 'ca', 'ca-valencia', 'eu'])
  })

  const tables = { ...LANGUAGE_TABLES, ...PRESET_TABLES, NATIVE_LEVEL }
  for (const [name, table] of Object.entries(tables)) {
    it(`${name} has every CV language and nothing else`, () => {
      expect(Object.keys(table).sort()).toEqual([...codes].sort())
    })
  }

  it('has twelve months in every language', () => {
    for (const code of codes) expect((LANGUAGE_TABLES.MONTHS as Record<string, string[]>)[code]).toHaveLength(12)
  })

  it('recognises the native level it offers, in every language', () => {
    for (const code of codes) expect(languageLevelScore(NATIVE_LEVEL[code]!)).toBe(5)
  })
})

describe('dates in the new languages', () => {
  it('reads like the language writes it', () => {
    expect(formatDateRange('2022-03', null, 'fr')).toBe('mars 2022 – Aujourd’hui')
    expect(formatDateRange('2019-09', '2022-02', 'it')).toBe('set 2019 – feb 2022')
    expect(formatDateRange('2019-10', null, 'pt')).toBe('out 2019 – Presente')
    expect(formatDateRange('2022-03', null, 'de')).toBe('März 2022 – heute')
    expect(formatBirthDate('1992-03-12', 'de')).toBe('12. März 1992')
    expect(formatBirthDate('1992-03-12', 'fr')).toBe('12 mars 1992')
  })

  it('reads like Catalan, Valencian and Basque write it (spec 070)', () => {
    expect(formatDateRange('2022-03', null, 'ca')).toBe('març 2022 – Actualitat')
    expect(formatDateRange('2019-09', '2022-02', 'ca-valencia')).toBe('set. 2019 – febr. 2022')
    expect(formatBirthDate('1992-03-12', 'ca')).toBe('12 març 1992')
    // Basque puts the year first.
    expect(formatDateRange('2021-10', null, 'eu')).toBe('2021eko urr. – Gaur egun')
    expect(formatDateRange('2019-01', '2023-06', 'eu')).toBe('2019ko urt. – 2023ko eka.')
    expect(formatDateRange('2019', '2020', 'eu')).toBe('2019 – 2020')
    expect(formatBirthDate('1992-03-12', 'eu')).toBe('1992ko martxoaren 12a')
  })

  it.each([
    // -eko after a consonant: bat, bost, hamar, hamabost, ehun
    ['2021', '2021eko'], ['2025', '2025eko'], ['2010', '2010eko'], ['1990', '1990eko'],
    ['2015', '2015eko'], ['2035', '2035eko'], ['1900', '1900eko'], ['2100', '2100eko'],
    // -ko after a vowel: hamaika, bi, hiru, hogei, mila…
    ['2011', '2011ko'], ['2031', '2031ko'], ['2023', '2023ko'], ['2020', '2020ko'],
    ['1992', '1992ko'], ['2000', '2000ko'], ['2019', '2019ko'], ['2008', '2008ko'],
  ])('the Basque year %s is %s', (year, written) => {
    expect(basqueYear(year)).toBe(written)
  })
})

describe('levels typed in the new languages', () => {
  it.each([
    ['Langue maternelle', 5], ['Courant', 4], ['Intermédiaire', 3], ['Débutant', 1],
    ['Madrelingua', 5], ['Fluente', 4], ['Avanzato', 4], ['Elementare', 1],
    ['Língua materna', 5], ['Avançado', 4], ['Intermediário', 3], ['Iniciante', 1],
    ['Muttersprache', 5], ['Fließend', 4], ['Verhandlungssicher', 4], ['Grundkenntnisse', 2], ['Anfänger', 1],
    ['Llengua materna', 5], ['Nadiu', 5], ['Avançat', 4], ['Intermedi', 3], ['Bàsic', 2], ['Principiant', 1],
    ['Ama hizkuntza', 5], ['Aurreratua', 4], ['Ertaina', 3], ['Oinarrizkoa', 2], ['Hasiberria', 1],
  ])('%s is level %i', (text, score) => {
    expect(languageLevelScore(text)).toBe(score)
  })
})
