// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const received: string[] = []

/** paged.js that builds a page and then fails, the way it did inside a `display: none` root. */
vi.mock('pagedjs', () => ({
  Previewer: class {
    polisher = { inserted: [] as HTMLStyleElement[] }
    async preview(html: string, _css: unknown, container: HTMLElement) {
      received.push(html)
      // Like paged.js, leave a style behind in <head> on every run, listed by its polisher.
      this.polisher.inserted.push(document.head.appendChild(document.createElement('style')))
      container.innerHTML = '<div class="pagedjs_pages"><div class="pagedjs_page"></div></div>'
      throw new TypeError("Cannot read properties of null (reading 'getBoundingClientRect')")
    }
  },
}))

const { paginateInto, releasePagination, PAGED_STYLE_ATTR } = await import('@/services/export/pdf')
const NO_CSS = { app: '', print: '' }

describe('PDF export pagination (spec 022)', () => {
  it('leaves nothing behind when paged.js fails, so the fallback cannot follow a blank sheet', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const container = document.createElement('div')

    expect(await paginateInto(container, '<p>CV</p>', NO_CSS)).toBe(false)
    expect(container.innerHTML).toBe('')
  })

  it('hands paged.js the CV inside .cv-page, the scope of every print.css rule', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await paginateInto(document.createElement('div'), '<article>CV</article>', NO_CSS)
    expect(received.at(-1)).toBe('<div class="cv-page cv-page--paged"><article>CV</article></div>')
  })

  it("keeps only the latest run's paged.js styles per container, and releases them", async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const container = document.createElement('div')
    const earlier = document.head.querySelectorAll(`style[${PAGED_STYLE_ATTR}]`).length
    const tagged = () => document.head.querySelectorAll(`style[${PAGED_STYLE_ATTR}]`).length - earlier

    await paginateInto(container, '<p>1</p>', NO_CSS)
    await paginateInto(container, '<p>2</p>', NO_CSS)
    expect(tagged()).toBe(1)

    releasePagination(container)
    expect(tagged()).toBe(0)
  })

  it('keeps the print root rendered on screen; paged.js cannot measure inside display: none', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8')
    const rule = /#print-root\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    expect(rule).not.toMatch(/display:\s*none/)
    expect(rule).toMatch(/visibility:\s*hidden/)
  })
})
