import { describe, expect, it } from 'vitest'
import { CV_LANGUAGES, NATIVE_LEVEL } from '@/core/stylePresets'
import { PRESET_TABLES } from '@/core/sectionPresets'
import { LANGUAGE_TABLES, formatBirthDate, formatDateRange, languageLevelScore } from '@/templates/shared'

const codes = CV_LANGUAGES.map((option) => option.code)

/** A CV language the templates do not fully know would print Spanish in the middle of it (spec 056). */
describe('every CV language is complete', () => {
  it('offers Spanish, English, French, Italian, Portuguese and German', () => {
    expect(codes).toEqual(['es', 'en', 'fr', 'it', 'pt', 'de'])
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
})

describe('levels typed in the new languages', () => {
  it.each([
    ['Langue maternelle', 5], ['Courant', 4], ['Intermédiaire', 3], ['Débutant', 1],
    ['Madrelingua', 5], ['Fluente', 4], ['Avanzato', 4], ['Elementare', 1],
    ['Língua materna', 5], ['Avançado', 4], ['Intermediário', 3], ['Iniciante', 1],
    ['Muttersprache', 5], ['Fließend', 4], ['Verhandlungssicher', 4], ['Grundkenntnisse', 2], ['Anfänger', 1],
  ])('%s is level %i', (text, score) => {
    expect(languageLevelScore(text)).toBe(score)
  })
})
