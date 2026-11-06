import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (id: string) => readFileSync(`src/templates/${id}/Template.vue`, 'utf8')
const rule = (css: string, selector: string) =>
  new RegExp(`\\n${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? ''

/**
 * Spec 074: a word longer than the side column breaks inside it, and a skill or language name in a
 * row with its level marks may be narrower than its longest word, so that word breaks there.
 * `qa:pdf` (longword, longword64) checks the result on paper; this keeps the rules in place.
 */
describe('long words in the side column (spec 074)', () => {
  const SIDES: [string, string, string][] = [
    ['facet', '.aside', '.row > span:first-child'],
    ['chevron', '.aside', '.row > span:first-child'],
    ['banner', '.aside', '.lang-name'],
    ['monogram', '.sidebar', '.level-row > span:first-child'],
    ['cobalt', '.sidebar', '.level-row > span:first-child'],
    ['harbor', '.sidebar', '.lang-name'],
    ['meridian', '.sidebar', '.lang-name'],
  ]

  it.each(SIDES)('%s breaks a long word inside the side column, and its level rows give way', (id, side, name) => {
    const css = source(id)
    expect(rule(css, side)).toMatch(/overflow-wrap:\s*break-word/)
    expect(rule(css, name)).toMatch(/min-width:\s*0/)
  })
})
