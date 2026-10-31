// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PreviewPane from '@/components/preview/PreviewPane.vue'
import { useUiStore } from '@/stores/ui'
import { useCvStore } from '@/stores/cv'
import { getTemplate } from '@/templates/registry'

beforeEach(() => setActivePinia(createPinia()))

const mountPane = () => mount(PreviewPane, { global: { stubs: { CvRenderer: true } } })

describe('preview toolbar (spec 018)', () => {
  it('names the template and sends its button to the style step', async () => {
    const ui = useUiStore()
    const wrapper = mountPane()
    const chip = wrapper.find('button.chip')
    expect(chip.text()).toContain(getTemplate(useCvStore().templateId).name)
    await chip.trigger('click')
    expect(ui.step).toBe('style')
  })

  it('hides the template button while the template gallery is on screen (spec 054)', async () => {
    const ui = useUiStore()
    const wrapper = mountPane()
    ui.goTo('style')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('button.chip').exists()).toBe(false)
    // The full-width preview hides the form: there the button brings the gallery back.
    ui.setPreviewExpanded(true)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('button.chip').exists()).toBe(true)
    ui.goTo('experience')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('button.chip').exists()).toBe(true)
  })

  it('zooms in steps of 10 % within its bounds', async () => {
    const wrapper = mountPane()
    const [out, into] = wrapper.findAll('button.zoom-btn')
    const value = () => wrapper.find('.zoom-value').text()
    expect(value()).toBe('72 %')
    await into!.trigger('click')
    expect(value()).toBe('80 %')
    for (let i = 0; i < 10; i++) await out!.trigger('click')
    expect(value()).toBe('30 %')
    expect(out!.attributes('disabled')).toBeDefined()
  })

  it('sizes the page frame to the scaled page, so a zoomed page is never cut (spec 030)', async () => {
    const wrapper = mountPane()
    const width = () => parseFloat((wrapper.find('.page-frame').element as HTMLElement).style.width)
    expect(width()).toBeCloseTo(793.7 * 0.72, 0)
    const into = wrapper.findAll('button.zoom-btn')[1]!
    for (let i = 0; i < 10; i++) await into.trigger('click')
    expect(width()).toBeCloseTo(793.7 * 1.2, 0)
    expect((wrapper.find('.page-wrap').element as HTMLElement).style.marginBottom).toBe('')
  })
})
