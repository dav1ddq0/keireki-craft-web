import { describe, expect, it } from 'vitest'
import es from '@/i18n/es'
import en from '@/i18n/en'
import fr from '@/i18n/fr'
import it_ from '@/i18n/it'
import pt from '@/i18n/pt'
import de from '@/i18n/de'
import ca from '@/i18n/ca'
import caValencia from '@/i18n/ca-valencia'
import eu from '@/i18n/eu'

/** Every leaf of a dictionary, as path → text. */
function leaves(obj: object, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out.set(path, value)
    else for (const [p, v] of leaves(value as object, path)) out.set(p, v)
  }
  return out
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('UI dictionaries (spec 057)', () => {
  const base = leaves(es)
  it.each([
    ['en', en],
    ['fr', fr],
    ['it', it_],
    ['pt', pt],
    ['de', de],
    ['ca', ca],
    ['ca-valencia', caValencia],
    ['eu', eu],
  ])('%s has every key of Spanish, none empty, with the same placeholders', (_code, dictionary) => {
    const own = leaves(dictionary)
    expect([...own.keys()].sort()).toEqual([...base.keys()].sort())
    for (const [path, text] of own) {
      expect(text.trim(), path).not.toBe('')
      expect(placeholders(text), path).toEqual(placeholders(base.get(path)!))
    }
  })
})
