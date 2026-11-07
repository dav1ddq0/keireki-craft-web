// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { hideFrom } from '@/services/export/pdf'

/**
 * Spec 075: before paged.js removes what overflows a page, the page is measured as the cut will
 * leave it. `hideFrom` stands in for the removal; jsdom has no layout, so `qa:pdf` checks the
 * measuring itself (sidegrow), and this checks the stand-in hides the right nodes and undoes itself.
 */
describe('hideFrom (spec 075)', () => {
  const page = () => {
    const root = document.createElement('div')
    root.innerHTML =
      '<article style="padding-bottom: 20px"><header>Name</header>' +
      '<section id="a" style="margin-bottom: 8px"><h2>Experience</h2><p id="cut">One</p><p>Two</p>tail</section>' +
      '<section id="b"><h2>Talks</h2></section></article>'
    return root
  }

  it('hides the cut and what follows it at every level, and squeezes the boxes it splits', () => {
    const root = page()
    const before = root.innerHTML
    const restore = hideFrom(root.querySelector('#cut')!, root)

    const shown = (el: Element) => (el as HTMLElement).style.display !== 'none'
    expect(shown(root.querySelector('header')!)).toBe(true)
    expect(shown(root.querySelector('#a h2')!)).toBe(true)
    expect(shown(root.querySelector('#cut')!)).toBe(false)
    expect(shown(root.querySelector('#a p:last-of-type')!)).toBe(false)
    expect(shown(root.querySelector('#b')!)).toBe(false)
    // The trailing text is wrapped to be hidden.
    expect(root.querySelector('#a')!.lastElementChild!.textContent).toBe('tail')
    expect((root.querySelector('#a') as HTMLElement).style.marginBottom).toBe('0px')
    expect((root.querySelector('article') as HTMLElement).style.paddingBottom).toBe('0px')

    restore()
    expect(root.innerHTML).toBe(before)
  })
})
