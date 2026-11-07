// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sideColumnHeight } from '@/services/export/render'

/** jsdom lays nothing out: each box gets the top and bottom it would have on the page. */
function box(el: HTMLElement, top: number, bottom: number): HTMLElement {
  el.getBoundingClientRect = () => ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) })
  return el
}

function column(sections: Array<[number, number]>, style: string): HTMLElement {
  const side = box(document.createElement('aside'), 300, 2000)
  // No border unless given: jsdom does not resolve a border without a style to 0, as browsers do.
  side.style.cssText = `border-bottom: 0; ${style}`
  for (const [top, bottom] of sections) {
    const section = box(document.createElement('section'), top, bottom)
    section.style.marginBottom = '18px'
    side.appendChild(section)
  }
  return side
}

describe('sideColumnHeight (specs 033, 075)', () => {
  it('measures down to the last section and its bottom margin, then the padding and border', () => {
    // monogram with two extra skills: 1057 + 18 + 60 + 2 from a top of 300.
    const side = column([[354, 553], [572, 915], [933, 1057]], 'padding-bottom: 60px; border-bottom: 2px solid')
    expect(sideColumnHeight(side)).toBe(1057 + 18 + 60 + 2 - 300)
  })

  it('measures the content, not the box the grid stretches to the main column', () => {
    const side = column([[300, 500]], '')
    expect(sideColumnHeight(side)).toBe(500 + 18 - 300)
  })

  it('takes the lowest child, whatever its order', () => {
    const side = column([[300, 900], [300, 600]], '')
    expect(sideColumnHeight(side)).toBe(900 + 18 - 300)
  })

  it('is its padding alone when empty', () => {
    expect(sideColumnHeight(column([], 'padding-bottom: 40px'))).toBe(40)
  })
})
