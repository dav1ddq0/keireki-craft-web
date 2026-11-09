// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { relayoutPages } from '@/services/export/pdf'

/**
 * Spec 082: once paged.js is done, each page's content is laid out afresh, so Chrome does not keep
 * a row drawn past the sheet. jsdom has no layout, so `qa:pdf` checks the effect (ledger-sidegrow);
 * this checks that the pages are left exactly as they were.
 */
describe('relayoutPages (spec 082)', () => {
  const pages = () => {
    const container = document.createElement('div')
    container.innerHTML =
      '<div class="pagedjs_page"><div class="pagedjs_page_content"><div id="one"><p>One</p></div></div></div>' +
      '<div class="pagedjs_page"><div class="pagedjs_page_content"><div id="two" style="height: 1123px; display: block"><p>Two</p></div></div></div>' +
      '<div class="pagedjs_page"><div class="pagedjs_page_content"></div></div>'
    return container
  }

  it('leaves every page as it was, its inline style included', () => {
    const container = pages()
    const before = container.innerHTML
    relayoutPages(container)
    expect(container.innerHTML).toBe(before)
  })

  it('hides each page content for the relayout and nothing else', () => {
    const container = pages()
    const seen: string[] = []
    for (const area of container.querySelectorAll<HTMLElement>('.pagedjs_page_content')) {
      Object.defineProperty(area, 'offsetHeight', {
        get: () => {
          const content = area.firstElementChild as HTMLElement | null
          seen.push(content ? `${content.id}:${content.style.display}` : 'empty')
          return 0
        },
      })
    }
    relayoutPages(container)
    expect(seen).toEqual(['one:none', 'two:none'])
  })
})
