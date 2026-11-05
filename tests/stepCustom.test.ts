// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import StepCustom from '@/components/form/StepCustom.vue'
import { useCvStore } from '@/stores/cv'

const button = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))!

describe('StepCustom section picker', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('adds a preset titled in the CV language and appends it to the order', async () => {
    const cv = useCvStore()
    cv.data.meta.language = 'en'
    const wrapper = mount(StepCustom)
    await button(wrapper, 'Referencias').trigger('click')

    const section = cv.data.customSections.at(-1)!
    expect(section.title).toBe('References')
    expect(section.entries[0]?.title).toBe('Available on request')
    expect(cv.data.sectionOrder.at(-1)).toBe(section.id)
  })

  it('still adds a blank section', async () => {
    const cv = useCvStore()
    const wrapper = mount(StepCustom)
    await button(wrapper, 'Sección en blanco').trigger('click')
    expect(cv.data.customSections.at(-1)).toMatchObject({ title: '', entries: [] })
  })
})

describe('StepCustom section picker on phones', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
    const proto = HTMLDialogElement.prototype
    proto.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', '') }
    proto.close = function (this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  })

  it('opens a sheet, adds the chosen preset and closes it', async () => {
    const cv = useCvStore()
    const wrapper = mount(StepCustom, { attachTo: document.body })
    expect(wrapper.find('.chips').exists()).toBe(false)

    await wrapper.find('.add-phone').trigger('click')
    expect(wrapper.find('dialog').attributes('open')).toBeDefined()
    await wrapper.findAll('dialog .tile').find((b) => b.text().includes('Cursos'))!.trigger('click')

    expect(cv.data.customSections.at(-1)?.title).toBe('Cursos')
    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
  })

  it('names the CV language in itself in the hint, not by its code (spec 070)', async () => {
    useCvStore().data.meta.language = 'ca-valencia'
    const wrapper = mount(StepCustom, { attachTo: document.body })
    await wrapper.find('.add-phone').trigger('click')
    const hint = wrapper.get('dialog .sheet-hint').text()
    expect(hint).toContain('(Valencià)')
    expect(hint).not.toContain('CA-VALENCIA')
  })

  it('adds a blank section from the sheet footer', async () => {
    const cv = useCvStore()
    const wrapper = mount(StepCustom, { attachTo: document.body })
    await wrapper.find('.add-phone').trigger('click')
    await wrapper.find('dialog .blank').trigger('click')
    expect(cv.data.customSections.at(-1)).toMatchObject({ title: '', entries: [] })
  })
})

describe('StepCustom page breaks (spec 022)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const breakBox = (wrapper: ReturnType<typeof mount>, section: string) =>
    wrapper.find(`input[aria-label="Página nueva antes de ${section}"]`)

  it('offers a switch on every section but the first', () => {
    const wrapper = mount(StepCustom)
    expect(wrapper.findAll('.page-break')).toHaveLength(useCvStore().data.sectionOrder.length - 1)
    expect(breakBox(wrapper, 'Resumen').exists()).toBe(false)
  })

  it('records the break in section order, and removes it again', async () => {
    const cv = useCvStore()
    const wrapper = mount(StepCustom)

    await breakBox(wrapper, 'Idiomas').setValue(true)
    await breakBox(wrapper, 'Formación').setValue(true)
    expect(cv.data.pageBreaks).toEqual(['education', 'languages'])

    await breakBox(wrapper, 'Idiomas').setValue(false)
    expect(cv.data.pageBreaks).toEqual(['education'])
  })
})

describe('StepCustom names (spec 027)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('calls an untitled section "Sección sin título" and names what each Remove removes', async () => {
    const wrapper = mount(StepCustom)
    await button(wrapper, 'Sección en blanco').trigger('click')
    const labels = wrapper.findAll('.order-label').map((l) => l.text())
    expect(labels.at(-1)).toBe('Sección sin título')
    expect(wrapper.find('input[aria-label="Página nueva antes de Sección sin título"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Eliminar Sección sin título"]').exists()).toBe(true)

    await button(wrapper, 'Cursos').trigger('click')
    const section = useCvStore().data.customSections.at(-1)!
    expect(wrapper.find(`button[aria-label="Eliminar ${section.title}"]`).text()).toBe('Eliminar')
  })
})
