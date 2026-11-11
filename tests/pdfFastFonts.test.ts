// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
// @ts-expect-error fontkit ships no types; the test reads only what it declares below.
import * as fontkitModule from 'fontkit'

interface Glyph { id: number; advanceWidth: number; path: { toSVG(): string } }
interface Font { type: string; postscriptName: string; numGlyphs: number; layout(text: string): { glyphs: Glyph[] } }
const fontkit = fontkitModule as { create(buffer: Buffer): Font }

/** paged.js with the method under test: by default it loads every face of the document. */
const loadedFaces: string[] = []
vi.mock('pagedjs', () => {
  class Chunker {
    loadFonts(): Promise<unknown> {
      loadedFaces.push('every face')
      return Promise.resolve()
    }
  }
  return {
    Chunker,
    Handler: class {},
    registerHandlers: () => {},
    Previewer: class {
      polisher = { inserted: [] as HTMLStyleElement[] }
      async preview(_html: string, _sheets: unknown, container: HTMLElement) {
        await new Chunker().loadFonts()
        container.innerHTML = '<div class="pagedjs_pages"><div class="pagedjs_page"></div></div>'
      }
    },
  }
})

const { paginateInto } = await import('@/services/export/pdf')
const { woffToSfnt } = await import('@/services/export/pdfDirect')

const FILES = join(__dirname, '../node_modules/@fontsource')
const bytes = (path: string): ArrayBuffer => {
  const b = readFileSync(join(FILES, path))
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
}

describe('paged.js waits only for the fonts in use (spec 087)', () => {
  it('does not load every face of the document before paginating', async () => {
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } })
    const container = document.createElement('div')
    const ok = await paginateInto(container, '<p>CV</p>', { app: '', print: '' })
    expect(ok).toBe(true)
    expect(loadedFaces).toEqual([])
  })
})

describe('a WOFF font unwrapped once for the direct PDF (spec 087)', () => {
  for (const file of ['inter/files/inter-latin-400-normal.woff', 'eb-garamond/files/eb-garamond-latin-ext-700-italic.woff']) {
    it(`${file.split('/').pop()}: the same font, as plain sfnt`, async () => {
      const woff = bytes(file)
      const sfnt = await woffToSfnt(woff)
      expect(new DataView(sfnt).getUint32(0)).not.toBe(0x774f4646)
      const before = fontkit.create(Buffer.from(woff))
      const after = fontkit.create(Buffer.from(sfnt))
      expect(after.type).toBe('TTF')
      expect(after.postscriptName).toBe(before.postscriptName)
      expect(after.numGlyphs).toBe(before.numGlyphs)
      const text = 'Ana Belén — Ñandú, Łódź, ﬁ 2026'
      const run = (font: Font) => font.layout(text).glyphs.map((g) => [g.id, g.advanceWidth, g.path.toSVG()])
      expect(run(after)).toEqual(run(before))
    })
  }

  it('leaves a file that is not WOFF as it is', async () => {
    const woff2 = bytes('inter/files/inter-latin-400-normal.woff2')
    expect(await woffToSfnt(woff2)).toBe(woff2)
    const tiny = new ArrayBuffer(4)
    expect(await woffToSfnt(tiny)).toBe(tiny)
  })
})
