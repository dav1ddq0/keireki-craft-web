/** Where a section that starts on a new page of the PDF sits over the live preview (spec 086). */
export interface BreakMark {
  top: number
  left: number
  width: number
}

/**
 * The sections the template marked with `data-page-break` (spec 022), relative to `frame`. Read from
 * the layout as drawn, the page's scale included, so the marks can sit in the unscaled frame.
 */
export function measureBreakMarks(page: HTMLElement, frame: HTMLElement): BreakMark[] {
  const origin = frame.getBoundingClientRect()
  return [...page.querySelectorAll<HTMLElement>('[data-page-break]')].map((section) => {
    const box = section.getBoundingClientRect()
    return { top: box.top - origin.top, left: box.left - origin.left, width: box.width }
  })
}
