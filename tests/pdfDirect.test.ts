// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  clipPolygon,
  faceFor,
  parseColor,
  parseRanges,
  pickFace,
  shapePath,
  standardFont,
  transformText,
  woffFor,
  type Face,
} from '@/services/export/pdfDirect'
import { WOFF } from '@/services/export/pdfFonts'

const LATIN = parseRanges('U+0000-00FF,U+0131,U+0152-0153')
const LATIN_EXT = parseRanges('U+0100-02BA,U+02BD-02C5')
const face = (family: string, weight: number, italic: boolean, ranges: [number, number][], url: string): Face => ({ family, weight, italic, ranges, url })
const FACES: Face[] = [
  face('source sans 3', 400, false, LATIN, 'ss-latin-400'),
  face('source sans 3', 400, false, LATIN_EXT, 'ss-ext-400'),
  face('source sans 3', 700, false, LATIN, 'ss-latin-700'),
  face('source sans 3', 400, true, LATIN, 'ss-latin-400i'),
  face('eb garamond', 400, false, LATIN_EXT, 'ebg-ext-400'),
]

describe('direct PDF helpers (spec 031)', () => {
  it('reads rgb(), rgba() and the color(srgb …) that color-mix computes to', () => {
    expect(parseColor('rgb(37, 99, 235)')).toEqual({ r: 37, g: 99, b: 235, a: 1 })
    expect(parseColor('rgba(0, 0, 0, 0.28)')).toEqual({ r: 0, g: 0, b: 0, a: 0.28 })
    expect(parseColor('color(srgb 1 0.5 0 / 0.5)')).toEqual({ r: 255, g: 127.5, b: 0, a: 0.5 })
    expect(parseColor('transparent')).toBeNull()
  })

  it('reads unicode-range lists, single code points included', () => {
    expect(parseRanges('U+0000-00FF,U+0131')).toEqual([[0, 0xff], [0x131, 0x131]])
    expect(parseRanges('')).toEqual([[0, 0x10ffff]])
  })

  it('picks the face the browser would: covering file first, then style, then weight', () => {
    expect(pickFace(FACES, ['source sans 3'], 400, false, 'a'.codePointAt(0)!)!.url).toBe('ss-latin-400')
    expect(pickFace(FACES, ['source sans 3'], 400, false, 'Ł'.codePointAt(0)!)!.url).toBe('ss-ext-400')
    expect(pickFace(FACES, ['source sans 3'], 600, false, 'a'.codePointAt(0)!)!.url).toBe('ss-latin-700')
    expect(pickFace(FACES, ['source sans 3'], 400, true, 'a'.codePointAt(0)!)!.url).toBe('ss-latin-400i')
    // The next family of the stack covers what the first does not.
    expect(pickFace(FACES, ['inter', 'source sans 3'], 400, false, 'a'.codePointAt(0)!)!.url).toBe('ss-latin-400')
  })

  it('gives system-font stacks a standard font, and a bundled one for what WinAnsi lacks', () => {
    const serif = ['georgia', 'times new roman', 'serif']
    expect(faceFor(FACES, serif, 400, false, 'ñ'.codePointAt(0)!)).toBeNull()
    expect(faceFor(FACES, serif, 400, false, 'ř'.codePointAt(0)!)!.url).toBe('ebg-ext-400')
    expect(faceFor(FACES, ['arial', 'sans-serif'], 400, false, 'Ł'.codePointAt(0)!)!.url).toBe('ss-ext-400')
    expect(faceFor(FACES, serif, 400, false, '🚀'.codePointAt(0)!)).toBeNull()
    expect(standardFont(serif, 700, true)).toBe('Times-BoldItalic')
    expect(standardFont(['arial', 'sans-serif'], 400, false)).toBe('Helvetica')
    expect(standardFont(['jetbrains mono', 'monospace'], 700, false)).toBe('Courier-Bold')
  })

  it('has the WOFF twin of every bundled CV face, by built or dev file name', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/fonts.css'), 'utf8')
    const names = [...css.matchAll(/url\('@fontsource\/[\w-]+\/files\/([\w-]+)\.woff2'\)/g)].map((m) => m[1]!)
    expect(names.length).toBe(69)
    for (const name of names) expect(WOFF[name], name).toBeTruthy()
    expect(woffFor('/assets/inter-latin-400-normal-C38fXH4l.woff2')).toBe(WOFF['inter-latin-400-normal'])
    expect(woffFor('/node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2')).toBe(WOFF['inter-latin-400-normal'])
  })

  it('applies text-transform the way the page shows the text', () => {
    expect(transformText('Experiencia', 'uppercase')).toBe('EXPERIENCIA')
    expect(transformText('nadia martín', 'capitalize')).toBe('Nadia Martín')
    expect(transformText('Tal Cual', 'none')).toBe('Tal Cual')
  })

  it('turns a clip-path polygon into a path over the box (stars of the level marks)', () => {
    const ctx = { origin: { left: 0, top: 0 }, k: 0.75 } as Parameters<typeof clipPolygon>[1]
    const box = { left: 100, top: 40, width: 20, height: 20 } as DOMRect
    expect(clipPolygon('polygon(50% 0%, 100% 100%, 0% 100%)', ctx, box)).toBe('M82.5 30 L90 45 L75 45 Z')
    expect(clipPolygon('circle(50%)', ctx, box)).toBeNull()
  })

  it('reads SVG shapes as path data (Chevron header, Facet corners)', () => {
    const el = (tag: string, attrs: Record<string, string>) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', tag)
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
      return node
    }
    expect(shapePath(el('polygon', { points: '0,0 100,0 100,34 50,50 0,34' }))).toBe('M0 0 L100 0 L100 34 L50 50 L0 34 Z')
    expect(shapePath(el('path', { d: 'M0 0 H100 A100 100 0 0 1 0 100 Z' }))).toBe('M0 0 H100 A100 100 0 0 1 0 100 Z')
    expect(shapePath(el('rect', { x: '1', y: '2', width: '3', height: '4' }))).toBe('M1 2 H4 V6 H1 Z')
    expect(shapePath(el('line', { x1: '0', y1: '0', x2: '5', y2: '5' }))).toBe('M0 0 L5 5')
  })
})

describe('what the direct PDF draws that it used to leave out (spec 050)', () => {
  it('puts a bundled stand-in after each system font it cannot embed', async () => {
    const { withStandIns } = await import('@/core/fontStandIns')
    expect(withStandIns(['georgia', 'times new roman', 'serif'])).toEqual(['georgia', 'gelasio', 'times new roman', 'tinos', 'serif'])
    expect(withStandIns(['helvetica neue', 'helvetica', 'arial', 'sans-serif'])).toEqual(['helvetica neue', 'arimo', 'helvetica', 'arimo', 'arial', 'arimo', 'sans-serif'])
    expect(withStandIns(['inter', 'system-ui'])).toEqual(['inter', 'system-ui'])
  })

  it('lays a soft shadow out as layers whose opacities add up to the shadow\'s, widest first', async () => {
    const { shadowLayers } = await import('@/services/export/pdfDirect')
    expect(shadowLayers(0, 3, 0.5)).toEqual([{ offset: 3, alpha: 0.5 }])
    const layers = shadowLayers(12, 0, 0.6)
    expect(layers.length).toBeGreaterThan(8)
    const offsets = layers.map((l) => l.offset)
    expect([...offsets].sort((a, b) => b - a)).toEqual(offsets)
    expect(offsets[0]).toBeGreaterThan(0)
    expect(offsets.at(-1)).toBeLessThan(0)
    const total = 1 - layers.reduce((product, l) => product * (1 - l.alpha), 1)
    expect(total).toBeCloseTo(0.6, 5)
  })

  it('reads the outer shadows of a box-shadow, topmost first, with their blur, and skips inset and absent ones', async () => {
    const { outerShadows } = await import('@/services/export/pdfDirect')
    expect(outerShadows('rgb(255, 255, 255) 0px 0px 0px 2.66667px')).toEqual([{ dx: 0, dy: 0, blur: 0, spread: 2.66667, color: { r: 255, g: 255, b: 255, a: 1 } }])
    const two = outerShadows('rgba(0, 0, 0, 0.5) 3px 4px 0px 1px, rgb(10, 20, 30) 0px 0px 0px 6px')
    expect(two.map((s) => [s.dx, s.dy, s.spread])).toEqual([[3, 4, 1], [0, 0, 6]])
    const soft = outerShadows('rgba(0, 0, 0, 0.3) 0px 1px 2px 0px, rgba(0, 0, 0, 0.15) 0px 1px 3px 1px')
    expect(soft.map((s) => [s.dy, s.blur, s.spread])).toEqual([[1, 2, 0], [1, 3, 1]])
    expect(outerShadows('inset rgb(0, 0, 0) 0px 0px 0px 2px')).toEqual([])
    expect(outerShadows('none')).toEqual([])
  })
})

describe('the font stack of the page (spec 052)', () => {
  it('puts each stand-in right after the system font it stands for, once', async () => {
    const { fontStackWithStandIns } = await import('@/core/fontStandIns')
    expect(fontStackWithStandIns("Georgia, 'Times New Roman', serif")).toBe("Georgia, 'Gelasio', 'Times New Roman', 'Tinos', serif")
    expect(fontStackWithStandIns("'Helvetica Neue', Helvetica, Arial, sans-serif")).toBe("'Helvetica Neue', 'Arimo', Helvetica, Arial, sans-serif")
    expect(fontStackWithStandIns("Tahoma, 'DejaVu Sans', Verdana, sans-serif")).toBe("Tahoma, 'DejaVu Sans', Verdana, sans-serif")
    expect(fontStackWithStandIns("'Source Sans 3', 'Segoe UI', sans-serif")).toBe("'Source Sans 3', 'Segoe UI', sans-serif")
    expect(fontStackWithStandIns('')).toBe('')
  })
})
