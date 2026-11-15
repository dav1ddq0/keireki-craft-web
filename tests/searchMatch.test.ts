import { describe, expect, it } from 'vitest'
import { foldText, highlightParts, matchesQuery } from '@/core/searchMatch'

const marked = (text: string, query: string) =>
  highlightParts(text, query)
    .filter((part) => part.match)
    .map((part) => part.text)

describe('search match (spec 089)', () => {
  it('folds case and accents', () => {
    expect(foldText('Martín ÑANDÚ')).toBe('martin nandu')
    expect(matchesQuery('Nadia Martín', 'MARTIN')).toBe(true)
    expect(matchesQuery('Nadia Martin', 'martín')).toBe(true)
    expect(matchesQuery('Nadia', 'zzz')).toBe(false)
    expect(matchesQuery('Nadia', '  ')).toBe(true)
  })

  it('marks the letters as written, accent included', () => {
    expect(highlightParts('Nadia Martín Reyes', 'martin')).toEqual([
      { text: 'Nadia ', match: false },
      { text: 'Martín', match: true },
      { text: ' Reyes', match: false },
    ])
  })

  it('marks every occurrence, and merges matches that touch', () => {
    expect(marked('Ana Navarro Fernández', 'na')).toEqual(['na', 'Na', 'ná'])
    expect(marked('aaaa', 'aa')).toEqual(['aaaa'])
  })

  it('works on text written in decomposed form, and with letters outside the BMP', () => {
    const decomposed = 'Martín'
    expect(marked(decomposed, 'martin')).toEqual([decomposed])
    expect(highlightParts('😀 Ana', 'ana')).toEqual([
      { text: '😀 ', match: false },
      { text: 'Ana', match: true },
    ])
  })

  it('keeps a letter whose fold changes length aligned', () => {
    // 'İ' lowers to two code units ('i' + a combining dot, which the fold drops or keeps): either way
    // the letters after it stay where they are.
    expect(marked('İstanbul Ana', 'ana')).toEqual(['Ana'])
  })

  it('returns the whole text unmarked for an empty query, and nothing for an empty text', () => {
    expect(highlightParts('Nadia', '')).toEqual([{ text: 'Nadia', match: false }])
    expect(highlightParts('', 'na')).toEqual([])
    expect(marked('Nadia', 'zzz')).toEqual([])
  })
})
