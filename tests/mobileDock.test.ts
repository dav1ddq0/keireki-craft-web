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
  wrapper.findAll('button').find((b) => b.text().includes(label) || b.attributes('aria-label') === label)!

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
    // In preview, Export is an icon named for screen readers (spec 064).
    expect(wrapper.find('.action').attributes('aria-label')).toBe('Exportar')
    expect(wrapper.find('.action').text()).toBe('')

    await text(wrapper, 'Editar').trigger('click')
    expect(ui.previewOpen).toBe(false)
    expect(wrapper.find('.action').text()).toBe('Siguiente')
  })

  it('shows the switch as icons only, both named and with a tooltip (spec 064)', () => {
    const wrapper = mount(MobileDock)
    const modes = wrapper.findAll('.mode')
    expect(modes.map((b) => b.attributes('aria-label'))).toEqual(['Editar', 'Vista previa'])
    expect(modes.map((b) => b.attributes('title'))).toEqual(['Editar', 'Vista previa'])
    expect(modes.map((b) => b.text())).toEqual(['', ''])
  })

  it('in preview, adds the template switch and copy image; in edit, neither (spec 064)', async () => {
    const ui = useUiStore()
    const wrapper = mount(MobileDock, { attachTo: document.body })
    expect(wrapper.find('.template').exists()).toBe(false)
    ui.previewOpen = true
    await wrapper.vm.$nextTick()
    const template = wrapper.find('.template')
    expect(template.text()).toBe('Classic')
    expect(template.attributes('aria-label')).toBe('Plantilla: Classic. Cambiar')
    await template.trigger('click')
    const sheet = wrapper.findAll('dialog').find((d) => d.attributes('open') !== undefined)!
    expect(sheet.text()).toContain('Plantilla')
    expect(sheet.findAll('.tile').length).toBeGreaterThan(5)
    wrapper.unmount()
  })
})

describe('MobileDock in preview mode', () => {
  it('opens one export sheet with both PDFs, the image, HTML and JSON', async () => {
    const ui = useUiStore()
    ui.previewOpen = true
    const wrapper = mount(MobileDock)
    await wrapper.find('.action').trigger('click')
    // The template sheet is a dialog too (spec 064): read the one Export opened.
    const items = wrapper.findAll('dialog[open] li')
    expect(items).toHaveLength(5)
    // The direct download comes first (spec 031), printing next to it.
    expect(items[0]!.text()).toContain('PDF (descargar)')
    expect(items[1]!.text()).toContain('PDF (imprimir)')
    expect(items[2]!.text()).toContain('Imagen (JPG)')
  })
})
