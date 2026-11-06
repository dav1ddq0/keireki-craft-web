// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { createEmptyCV } from '@/core/factory'

vi.mock('@/services/export/render', () => ({
  renderTemplateHtml: async () => '<article>CV</article>',
  resolvePhoto: async (data: unknown) => ({ data, revoke: () => {} }),
  collectDocumentCss: () => '',
}))

const { fileName, printCv, printTitle } = await import('@/services/export/pdf')

const cvNamed = (fullName: string, title = 'Mi CV') => {
  const cv = createEmptyCV()
  cv.personal.fullName = fullName
  cv.meta.title = title
  return cv
}

describe('printTitle (spec 024)', () => {
  it('names the PDF after the person, then the document, then "CV"', () => {
    expect(printTitle(cvNamed('Nadia Martín Reyes'))).toBe('Nadia Martín Reyes – CV')
    expect(printTitle(cvNamed('  ', 'Candidatura Acme'))).toBe('Candidatura Acme')
    expect(printTitle(cvNamed('', ''))).toBe('CV')
  })

  it('drops characters that file names cannot hold', () => {
    expect(printTitle(cvNamed('Ana / López: "dev"?'))).toBe('Ana López dev – CV')
  })
})

describe('fileName (spec 073)', () => {
  it('is the name typed in Export, else the print title, for every format', () => {
    expect(fileName(cvNamed('Nadia Martín Reyes'), 'CV Frontend 2026')).toBe('CV Frontend 2026')
    expect(fileName(cvNamed('Nadia Martín Reyes'))).toBe('Nadia Martín Reyes – CV')
    expect(fileName(cvNamed('Nadia Martín Reyes'), '   ')).toBe('Nadia Martín Reyes – CV')
  })

  it('makes a typed name safe, and falls back when nothing safe is left', () => {
    expect(fileName(cvNamed('Ana'), '../cv\u202Efdp.exe')).toBe('..cvfdp.exe')
    expect(fileName(cvNamed('Ana'), '  mi   cv  ')).toBe('mi cv')
    expect(fileName(cvNamed('Ana'), '/:*?')).toBe('Ana – CV')
  })
})

describe('printCv and the document title', () => {
  it('uses the print title while the dialog is open and restores the app title after', async () => {
    document.title = 'Keireki Craft'
    let during = ''
    vi.spyOn(window, 'print').mockImplementation(() => {
      during = document.title
      window.dispatchEvent(new Event('afterprint'))
    })

    await printCv(cvNamed('Nadia Martín Reyes'), 'classic')
    expect(during).toBe('Nadia Martín Reyes – CV')
    expect(document.title).toBe('Keireki Craft')
  })

  it('restores the app title when printing throws', async () => {
    document.title = 'Keireki Craft'
    vi.spyOn(window, 'print').mockImplementation(() => {
      throw new Error('blocked')
    })

    await expect(printCv(cvNamed('Ana'), 'classic')).rejects.toThrow('blocked')
    expect(document.title).toBe('Keireki Craft')
  })
})
