// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PreviewPane from '@/components/preview/PreviewPane.vue'
import { measureBreakMarks } from '@/components/preview/breakMarks'
import { useCvStore } from '@/stores/cv'

/** Spec 086: the live preview marks the sections that start on a new page of the PDF. */

const rect = (top: number, left: number, width: number) =>
  ({ top, left, width, height: 10, right: left + width, bottom: top + 10, x: left, y: top, toJSON: () => ({}) }) as DOMRect

describe('measureBreakMarks (spec 086)', () => {
  it('places one mark per marked section, relative to the frame', () => {
    const frame = document.createElement('div')
    frame.innerHTML =
      '<div id="page"><section id="a"></section><section id="b" data-page-break="true"></section>' +
      '<aside><section id="c" data-page-break="true"></section></aside></div>'
    frame.getBoundingClientRect = () => rect(100, 50, 600)
    ;(frame.querySelector('#b') as HTMLElement).getBoundingClientRect = () => rect(400, 80, 380)
    ;(frame.querySelector('#c') as HTMLElement).getBoundingClientRect = () => rect(900, 470, 160)
    const page = frame.querySelector('#page') as HTMLElement
    expect(measureBreakMarks(page, frame)).toEqual([
      { top: 300, left: 30, width: 380 },
      { top: 800, left: 420, width: 160 },
    ])
  })

  it('gives no mark without a marked section', () => {
    const frame = document.createElement('div')
    frame.innerHTML = '<div id="page"><section></section><section></section></div>'
    expect(measureBreakMarks(frame.querySelector('#page') as HTMLElement, frame)).toEqual([])
  })
})

describe('the preview pane draws the marks (spec 086)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  // A stand-in for the template: the sections in `pageBreaks` carry the attribute, as every template's main column does.
  const FakeRenderer = defineComponent({
    props: { data: { type: Object, required: true } },
    setup: (props) => () =>
      h('article', ['summary', 'experience'].map((id) =>
        h('section', { 'data-section': id, 'data-page-break': (props.data as { pageBreaks: string[] }).pageBreaks.includes(id) || undefined }),
      )),
  })
  const frameTick = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

  it('marks a section with a break, hidden from assistive technology, and drops it when unset', async () => {
    const cv = useCvStore()
    const wrapper = mount(PreviewPane, { global: { stubs: { CvRenderer: FakeRenderer, CopyImageButton: true } } })
    await frameTick()
    expect(wrapper.findAll('.break-mark')).toHaveLength(0)

    cv.setPageBreak('experience', true)
    await flushPromises()
    await frameTick()
    const marks = wrapper.findAll('.break-mark')
    expect(marks).toHaveLength(1)
    expect(marks[0]!.attributes('aria-hidden')).toBe('true')
    expect(marks[0]!.text()).toBe('Página nueva en el PDF')

    cv.setPageBreak('experience', false)
    await flushPromises()
    await frameTick()
    expect(wrapper.findAll('.break-mark')).toHaveLength(0)
    wrapper.unmount()
  })
})
