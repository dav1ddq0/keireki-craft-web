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

/**
 * Spec 074: the full name breaks a word longer than its line, and a grid's flexible column has no
 * minimum, so a long word breaks inside it instead of widening it and pushing the other one out.
 */
describe('long words in the name and the main column (spec 074)', () => {
  const ALL = ['amber', 'aurora', 'banner', 'chevron', 'classic', 'cobalt', 'compact', 'editorial', 'facet', 'frame', 'harbor', 'ledger', 'meridian', 'modern', 'monogram', 'monograph', 'retro', 'freelance']

  it.each(ALL)('%s breaks a long word in the full name', (id) => {
    expect(rule(source(id), '.name')).toMatch(/overflow-wrap:\s*(break-word|anywhere)/)
  })

  const GRIDS: [string, string][] = [
    ['amber', '.amber'],
    ['aurora', '.aurora'],
    ['banner', '.banner'],
    ['chevron', '.chevron'],
    ['facet', '.facet'],
    ['harbor', '.harbor'],
    ['meridian', '.meridian'],
    ['modern', '.modern'],
    ['cobalt', '.body'],
    ['cobalt', '.head'],
    ['retro', '.retro'],
    ['freelance', '.freelance'],
    ['freelance', '.pair'],
  ]

  it.each(GRIDS)('%s: %s gives its flexible column no minimum', (id, grid) => {
    const columns = /grid-template-columns:\s*([^;]*);/.exec(rule(source(id), grid))?.[1] ?? ''
    expect(columns).toContain('minmax(0, 1fr)')
    expect(columns).not.toMatch(/(^|\s)1fr(\s|$)/)
  })

  it.each([['amber'], ['aurora'], ['retro']])('%s: an entry title gives way to its dates', (id) => {
    const css = rule(source(id), '.entry-title')
    expect(css).toMatch(/min-width:\s*0/)
    expect(css).toMatch(/overflow-wrap:\s*break-word/)
  })

  it('cobalt breaks a long word in the main column', () => {
    expect(rule(source('cobalt'), '.main')).toMatch(/overflow-wrap:\s*break-word/)
  })

  it("compact's name and headline give way to the contact line", () => {
    expect(rule(source('compact'), '.head-text')).toMatch(/min-width:\s*0/)
  })
})
