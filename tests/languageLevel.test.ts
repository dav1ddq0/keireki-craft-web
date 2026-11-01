import { describe, expect, it } from 'vitest'
import { languageLevelScore, levelAccessibleLabel } from '@/templates/shared'

describe('languageLevelScore', () => {
  it('recognises labels in both languages, whatever the UI locale', () => {
    expect(languageLevelScore('Nativo')).toBe(5)
    expect(languageLevelScore('Native')).toBe(5)
    expect(languageLevelScore('Avanzado')).toBe(4)
    expect(languageLevelScore('Advanced')).toBe(4)
    expect(languageLevelScore('Intermedio')).toBe(3)
    expect(languageLevelScore('Básico')).toBe(2)
  })

  it('ignores case, accents and surrounding spaces', () => {
    expect(languageLevelScore('  BÁSICO ')).toBe(2)
    expect(languageLevelScore('Bilingüe')).toBe(5)
  })

  it('maps CEFR levels, alone or inside other text', () => {
    expect(languageLevelScore('A1')).toBe(1)
    expect(languageLevelScore('B1')).toBe(3)
    expect(languageLevelScore('C1')).toBe(5)
    expect(languageLevelScore('b2')).toBe(4)
    expect(languageLevelScore('Inglés B2')).toBe(4)
    expect(languageLevelScore('Nativo (C2)')).toBe(5)
  })

  it('never guesses: unknown or empty text is null', () => {
    expect(languageLevelScore('')).toBeNull()
    expect(languageLevelScore('   ')).toBeNull()
    expect(languageLevelScore('Muy bueno')).toBeNull()
    expect(languageLevelScore('B3')).toBeNull()
    expect(languageLevelScore('Abc12x')).toBeNull()
  })
})

describe('levelAccessibleLabel', () => {
  it('follows the CV content language and falls back to Spanish', () => {
    expect(levelAccessibleLabel(4, 'es')).toBe('Nivel 4 de 5')
    expect(levelAccessibleLabel(4, 'en')).toBe('Level 4 of 5')
    expect(levelAccessibleLabel(4, 'xx')).toBe('Nivel 4 de 5')
  })
})

describe('resolveLanguages', () => {
  it('attaches a score and an accessible label in the CV language, or neither', async () => {
    const { resolveLanguages } = await import('@/templates/shared')
    const { createEmptyCV } = await import('@/core/factory')
    const cv = createEmptyCV()
    cv.meta.language = 'en'
    cv.languages = [
      { id: 'a', name: 'Spanish', level: 'Native' },
      { id: 'b', name: 'Catalan', level: 'Very good' },
      { id: 'c', name: 'French', level: '' },
    ]

    expect(resolveLanguages(cv)).toEqual([
      { id: 'a', name: 'Spanish', level: 'Native', score: 5, label: 'Level 5 of 5' },
      { id: 'b', name: 'Catalan', level: 'Very good', score: null, label: '' },
      { id: 'c', name: 'French', level: '', score: null, label: '' },
    ])
  })
})
