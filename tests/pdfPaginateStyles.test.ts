// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** What `<head>` held a moment after paged.js added its styles, while it was still at work. */
let whileWorking: string[] = []

/** paged.js that succeeds and leaves, like the real one, a style of its own and one per sheet it was given. */
vi.mock('pagedjs', () => ({
  Handler: class {},
  registerHandlers: () => {},
  Previewer: class {
    async preview(_html: string, sheets: Array<Record<string, string>>, container: HTMLElement) {
      const base = document.createElement('style')
      base.textContent = ':root{--pagedjs-width:8.5in}'
      document.head.appendChild(base)
      for (const sheet of sheets) {
        const style = document.createElement('style')
        style.textContent = Object.values(sheet)[0]!
        document.head.appendChild(style)
      }
      // Layout and paging take time: the browser may paint in between.
      await new Promise((resolve) => setTimeout(resolve, 0))
      whileWorking = heads()
      container.innerHTML = '<div class="pagedjs_pages"><div class="pagedjs_page"></div></div>'
    }
  },
}))

const { exportCss, paginateInto, releasePagination, PAGED_STYLE_ATTR } = await import('@/services/export/pdf')

/** The text of every `<style>` in `<head>`, in order, with a short name for the ones this test knows. */
function heads(): string[] {
  return [...document.head.querySelectorAll('style')].map((style) => {
    const text = style.textContent ?? ''
    if (text.includes('cv-export-app-sheet')) return 'app copy'
    if (text.includes('cv-export-print-sheet')) return 'print'
    if (text.includes('--pagedjs')) return 'paged base'
    return text.trim() || 'empty'
  })
}

describe('where paged.js leaves its styles (spec 041)', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    const ui = document.createElement('style')
    ui.textContent = '.editor--rail{grid-template-columns:220px 1fr} @media (min-width:1280px){.editor--rail{grid-template-columns:248px 1fr}}'
    document.head.appendChild(ui)
  })

  it('puts the copy of the document CSS ahead of the original, so the original keeps winning its ties', async () => {
    await paginateInto(document.createElement('div'), '<p>CV</p>', exportCss())
    expect(heads()[0]).toBe('app copy')
    expect(heads()).toContain('.editor--rail{grid-template-columns:220px 1fr} @media (min-width:1280px){.editor--rail{grid-template-columns:248px 1fr}}')
  })

  it('has it there while paged.js is still working, not only once it is done, so the page never lays out wrongly', async () => {
    await paginateInto(document.createElement('div'), '<p>CV</p>', exportCss())
    expect(whileWorking[0]).toBe('app copy')
  })

  it('keeps the print rules after everything else, as the last word', async () => {
    await paginateInto(document.createElement('div'), '<p>CV</p>', exportCss())
    expect(heads().at(-1)).toBe('print')
  })

  it('leaves the other styles of paged.js where it put them', async () => {
    await paginateInto(document.createElement('div'), '<p>CV</p>', exportCss())
    const order = heads()
    expect(order.indexOf('paged base')).toBeGreaterThan(order.indexOf('app copy'))
    expect(order.indexOf('paged base')).toBeLessThan(order.indexOf('print'))
  })

  it('hands paged.js the two sheets in that order, and tags and releases both runs\' styles', async () => {
    const container = document.createElement('div')
    await paginateInto(container, '<p>CV</p>', exportCss())
    const tagged = () => document.head.querySelectorAll(`style[${PAGED_STYLE_ATTR}]`).length
    expect(tagged()).toBe(3)
    releasePagination(container)
    expect(tagged()).toBe(0)
    expect(heads()).toHaveLength(1)
  })

  it('does not fail when the sheet cannot be found, and does not move it twice on a second run', async () => {
    const container = document.createElement('div')
    await paginateInto(container, '<p>1</p>', { app: '', print: '' })
    await paginateInto(container, '<p>2</p>', exportCss())
    expect(heads()[0]).toBe('app copy')
    expect(heads().filter((name) => name === 'app copy')).toHaveLength(1)
  })
})
