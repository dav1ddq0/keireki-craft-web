// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DocumentCard from '@/components/documents/DocumentCard.vue'
import DocumentActionsSheet from '@/components/documents/DocumentActionsSheet.vue'
import type { CVSummary } from '@/types/cv'

const doc: CVSummary = { id: 'cv1', title: 'CV Ana', fullName: 'Ana Martín Ruiz', updatedAt: '2026-10-01T10:00:00.000Z' }

beforeAll(() => {
  const proto = HTMLDialogElement.prototype
  proto.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  proto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})
beforeEach(() => setActivePinia(createPinia()))

describe('DocumentCard', () => {
  it('shows the name, two initials and opens from the whole card', async () => {
    const wrapper = mount(DocumentCard, { props: { doc, active: false } })
    expect(wrapper.find('.name').text()).toBe('Ana Martín Ruiz')
    expect(wrapper.find('.monogram').text()).toBe('AM')
    await wrapper.find('.main').trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
  })

  it('opens the actions from a separate, labelled button', async () => {
    const wrapper = mount(DocumentCard, { props: { doc, active: true } })
    expect(wrapper.find('.menu').attributes('aria-label')).toContain('CV Ana')
    await wrapper.find('.menu').trigger('click')
    expect(wrapper.emitted('menu')).toHaveLength(1)
    expect(wrapper.emitted('open')).toBeUndefined()
  })

  it('falls back to the title, then a dot, for an unnamed CV', () => {
    const noName = mount(DocumentCard, { props: { doc: { ...doc, fullName: '' }, active: false } })
    expect(noName.find('.name').text()).toBe('CV Ana')
    const nothing = mount(DocumentCard, { props: { doc: { ...doc, fullName: '', title: '' }, active: false } })
    expect(nothing.find('.name').text()).toBe('Sin título')
  })
})

describe('template tag (spec 021)', () => {
  it('names the template and paints the accent swatch', () => {
    const wrapper = mount(DocumentCard, {
      props: { doc: { ...doc, templateId: 'meridian', accentColor: '#0f766e' }, active: false },
    })
    expect(wrapper.find('.tag').text()).toBe('Plantilla Meridian')
    expect(wrapper.find('.swatch').attributes('style')).toContain('background')
  })

  it('shows nothing for an entry indexed before the CV had its own template', () => {
    expect(mount(DocumentCard, { props: { doc, active: false } }).find('.tag').exists()).toBe(false)
  })
})

describe('DocumentActionsSheet', () => {
  const open = () => mount(DocumentActionsSheet, { props: { open: true, doc }, attachTo: document.body })
  const button = (wrapper: ReturnType<typeof mount>, text: string) =>
    wrapper.findAll('dialog button').find((b) => b.text() === text)!

  it('renames in the sheet: the field holds the current name, and a blank one is not saved (spec 073)', async () => {
    const wrapper = open()
    await button(wrapper, 'Renombrar').trigger('click')
    const field = wrapper.find('dialog input[type="text"]')
    expect((field.element as HTMLInputElement).value).toBe('CV Ana')
    await field.setValue('  ')
    expect(button(wrapper, 'Guardar').attributes('disabled')).toBeDefined()
    await field.setValue('CV Frontend 2026')
    await wrapper.find('dialog form').trigger('submit')
    expect(wrapper.emitted('rename')).toEqual([['cv1', 'CV Frontend 2026']])
  })

  it('duplicates straight away', async () => {
    const wrapper = open()
    await button(wrapper, 'Duplicar').trigger('click')
    expect(wrapper.emitted('duplicate')).toEqual([['cv1']])
  })

  it('asks before deleting and lets you back out', async () => {
    const wrapper = open()
    await button(wrapper, 'Eliminar').trigger('click')
    expect(wrapper.text()).toContain('No se puede deshacer')
    expect(wrapper.emitted('remove')).toBeUndefined()

    await button(wrapper, 'Cancelar').trigger('click')
    expect(button(wrapper, 'Duplicar')).toBeDefined()

    await button(wrapper, 'Eliminar').trigger('click')
    await button(wrapper, 'Confirmar').trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['cv1']])
  })
})

describe('DocumentCard title line', () => {
  it('does not repeat the title when it is also the name', () => {
    const wrapper = mount(DocumentCard, { props: { doc: { ...doc, fullName: '', title: 'Mi CV' }, active: false } })
    expect(wrapper.findAll('.meta')).toHaveLength(1)
    const named = mount(DocumentCard, { props: { doc, active: false } })
    expect(named.findAll('.meta')).toHaveLength(2)
  })
})
