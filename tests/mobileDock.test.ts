// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MobileDock from '@/components/form/MobileDock.vue'
import { useUiStore } from '@/stores/ui'

// jsdom ships <dialog> without showModal/close; a minimal stand-in keeps `open`.
beforeAll(() => {
  const proto = HTMLDialogElement.prototype
  proto.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  proto.close = function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

beforeEach(() => setActivePinia(createPinia()))

const text = (wrapper: ReturnType<typeof mount>, label: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(label))!

describe('MobileDock', () => {
  it('has one main action that goes to the next step, and exports on the last one (spec 027)', async () => {
    const ui = useUiStore()
    ui.goTo('personal')
    const wrapper = mount(MobileDock)
    expect(wrapper.find('.action').text()).toBe('Siguiente')
    await wrapper.find('.action').trigger('click')
    expect(ui.step).toBe('summary')

    ui.goTo('export')
    await wrapper.vm.$nextTick()
    const action = wrapper.find('.action')
    expect(action.text()).toBe('Exportar')
    expect(action.attributes('disabled')).toBeUndefined()
    expect(action.attributes('aria-haspopup')).toBe('dialog')
  })

  it('switches between editing and preview and keeps a way back', async () => {
    const ui = useUiStore()
    const wrapper = mount(MobileDock)
    expect(text(wrapper, 'Editar').attributes('aria-pressed')).toBe('true')

    await text(wrapper, 'Vista previa').trigger('click')
    expect(ui.previewOpen).toBe(true)
    expect(text(wrapper, 'Vista previa').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('.action').text()).toBe('Exportar')

    await text(wrapper, 'Editar').trigger('click')
    expect(ui.previewOpen).toBe(false)
    expect(wrapper.find('.action').text()).toBe('Siguiente')
  })

  it('keeps both modes reachable by name when the unselected label is hidden', () => {
    const wrapper = mount(MobileDock)
    const labels = wrapper.findAll('.mode').map((b) => b.attributes('aria-label'))
    expect(labels).toEqual(['Editar', 'Vista previa'])
  })
})

describe('MobileDock in preview mode', () => {
  it('opens one export sheet with both PDFs, the image, HTML and JSON', async () => {
    const ui = useUiStore()
    ui.previewOpen = true
    const wrapper = mount(MobileDock)
    await wrapper.find('.action').trigger('click')
    expect(wrapper.findAll('dialog li')).toHaveLength(5)
    // The direct download comes first (spec 031), printing next to it.
    expect(wrapper.findAll('dialog li')[0]!.text()).toContain('PDF (descargar)')
    expect(wrapper.findAll('dialog li')[1]!.text()).toContain('PDF (imprimir)')
    expect(wrapper.findAll('dialog li')[2]!.text()).toContain('Imagen (JPG)')
  })
})
