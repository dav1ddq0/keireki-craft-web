import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FONT_OPTIONS } from '@/core/stylePresets'
import { familyNames } from '@/services/export/fonts'
import { withStandIns } from '@/core/fontStandIns'

const css = readFileSync(join(process.cwd(), 'src/styles/fonts.css'), 'utf8')
const faces = [...css.matchAll(/@font-face \{([^}]*)\}/g)].map((m) => {
  const prop = (name: string) => m[1]!.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim()
  return {
    family: prop('font-family')!.replace(/'/g, '').toLowerCase(),
    src: prop('src')!,
    range: prop('unicode-range'),
  }
})

/** The CV fonts the style step offers; the interface font (Roboto Flex) is not one of them. */
const CV_FAMILIES = ['inter', 'source sans 3', 'jetbrains mono', 'eb garamond', 'carlito', 'caladea', 'gelasio', 'arimo', 'tinos', 'dejavu sans', 'raleway', 'roboto slab', 'montserrat', 'dela gothic one', 'work sans']
const shipped = new Set(faces.map((face) => face.family))

describe('bundled fonts (specs 026, 029)', () => {
  it('declares Latin and Latin Extended woff2 faces only, from the installed packages', () => {
    expect(faces.length).toBeGreaterThan(0)
    for (const face of faces) {
      expect(face.src).toMatch(/^url\('@fontsource(-variable)?\/[\w-]+\/files\/[\w-]+-latin(-ext)?-[\w-]+\.woff2'\) format\('woff2(-variations)?'\)$/)
    }
    expect(shipped).toEqual(new Set([...CV_FAMILIES, 'roboto flex']))
  })

  it('gives every face its unicode-range, so a page fetches only the subsets it shows (029)', () => {
    for (const face of faces) {
      expect(face.range, face.src).toBeTruthy()
      // The Latin face starts at U+0000; the Latin Extended one at U+0100.
      expect(face.range).toMatch(face.src.includes('-latin-ext-') ? /^U\+0100-02BA/ : /^U\+0000-00FF/)
    }
  })

  it('marks an option bundled exactly when its stack names a shipped family', () => {
    for (const option of FONT_OPTIONS) {
      const ships = familyNames(option.value).some((name) => shipped.has(name))
      expect({ id: option.id, bundled: ships }).toEqual({ id: option.id, bundled: option.bundled })
    }
  })

  it('gives every font option a bundled face for the PDF: in its stack or as a stand-in (specs 050, 051)', () => {
    for (const option of FONT_OPTIONS) {
      const stack = withStandIns(familyNames(option.value))
      expect({ id: option.id, drawn: stack.some((name) => shipped.has(name)) }).toEqual({ id: option.id, drawn: true })
    }
  })

  it('reads family names out of a stack, quotes and case aside', () => {
    expect(familyNames(`'Source Sans 3', "Segoe UI", system-ui, sans-serif`)).toEqual([
      'source sans 3',
      'segoe ui',
      'system-ui',
      'sans-serif',
    ])
  })
})
