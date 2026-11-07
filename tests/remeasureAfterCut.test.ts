// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { Layout } from 'pagedjs'
import { hideFrom, MAX_REMEASURES, remeasureAfterCut } from '@/services/export/pdf'

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

/**
 * Spec 075: what the handler does with what it measures. The layout is faked: each call to
 * `findOverflow` answers what paged.js would find on the page as the trial leaves it.
 */
describe('remeasureAfterCut (spec 075)', () => {
  const BOUNDS = {} as DOMRect
  const page = (blocks: number) => {
    const root = document.createElement('div')
    root.innerHTML = Array.from({ length: blocks }, (_, i) => `<p>${i}</p>`).join('')
    return root
  }
  /** The cut before the `index`th block. */
  const before = (root: Element, index: number) => {
    const range = document.createRange()
    range.setStart(root, index)
    return range
  }
  const layout = (answer: (call: number) => Range | undefined) => {
    let calls = 0
    return { findOverflow: () => answer(calls++), calls: () => calls } as Layout & { calls: () => number }
  }

  it('has nothing to do when paged.js found no overflow', () => {
    const fake = layout(() => undefined)
    expect(remeasureAfterCut(undefined, page(3), BOUNDS, fake)).toBeUndefined()
    expect(fake.calls()).toBe(0)
  })

  it('keeps the cut when the page it leaves overflows nowhere', () => {
    const root = page(3)
    const cut = before(root, 2)
    expect(remeasureAfterCut(cut, root, BOUNDS, layout(() => undefined))).toBe(cut)
  })

  it('measures with the cut and what follows it hidden, then puts the page back as it was', () => {
    const root = page(3)
    const html = root.innerHTML
    const hidden: boolean[] = []
    const fake = layout(() => {
      hidden.push(...Array.from(root.children, (p) => (p as HTMLElement).style.display === 'none'))
      return undefined
    })
    remeasureAfterCut(before(root, 1), root, BOUNDS, fake)
    expect(hidden).toEqual([false, true, true])
    expect(root.innerHTML).toBe(html)
  })

  it('moves the cut earlier when something before it would fall outside the page', () => {
    const root = page(3)
    const result = remeasureAfterCut(before(root, 2), root, BOUNDS, layout((call) => (call === 0 ? before(root, 1) : undefined)))
    expect(result?.startContainer).toBe(root)
    expect(result?.startOffset).toBe(1)
  })

  it('never moves the cut later, nor to where it already is', () => {
    const root = page(4)
    const cut = before(root, 2)
    expect(remeasureAfterCut(cut, root, BOUNDS, layout(() => before(root, 3)))).toBe(cut)
    expect(remeasureAfterCut(cut, root, BOUNDS, layout(() => before(root, 2)))).toBe(cut)
  })

  it('stops after a bounded number of moves', () => {
    const root = page(20)
    let offset = 19
    const fake = layout(() => before(root, --offset))
    const result = remeasureAfterCut(before(root, 19), root, BOUNDS, fake)
    expect(fake.calls()).toBe(MAX_REMEASURES)
    expect(result?.startOffset).toBe(19 - MAX_REMEASURES)
  })

  it('measures after the text a cut falls in, keeping that text where it is', () => {
    const root = document.createElement('div')
    root.innerHTML = '<p>One two three<em>four</em></p><p>five</p>'
    const text = root.querySelector('p')!.firstChild!
    const cut = document.createRange()
    cut.setStart(text, 4)
    const hidden: string[] = []
    const fake = layout(() => {
      hidden.push(...Array.from(root.querySelectorAll('p, em'), (el) => `${el.textContent}:${(el as HTMLElement).style.display}`))
      return undefined
    })
    expect(remeasureAfterCut(cut, root, BOUNDS, fake)).toBe(cut)
    expect(hidden).toEqual(['One two threefour:', 'four:none', 'five:none'])
  })
})
