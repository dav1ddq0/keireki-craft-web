// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TemplateSheet from '@/components/preview/TemplateSheet.vue'
import { useCvStore } from '@/stores/cv'
import { accentIfChosen, applyTemplateDefaults, templates } from '@/templates/registry'

// jsdom ships <dialog> without showModal/close; a minimal stand-in keeps `open`.
beforeAll(() => {
  const proto = HTMLDialogElement.prototype
  proto.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  proto.close = function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

beforeEach(() => setActivePinia(createPinia()))

describe('TemplateSheet (spec 064)', () => {
  it('lists every template with its thumbnail and name, the current one pressed', () => {
    const cv = useCvStore()
    const wrapper = mount(TemplateSheet, { props: { open: true }, attachTo: document.body })
    const tiles = wrapper.findAll('.tile')
    expect(tiles).toHaveLength(templates.length)
    expect(wrapper.findAll('.tile .thumb svg')).toHaveLength(templates.length)
    const pressed = tiles.filter((t) => t.attributes('aria-pressed') === 'true')
    expect(pressed).toHaveLength(1)
    expect(pressed[0]!.text()).toBe(templates.find((t) => t.id === cv.templateId)!.name)
    // The name is written under each picture: the picture is not read out a second time.
    expect(wrapper.findAll('.tile .thumb').every((t) => t.attributes('aria-hidden') === 'true' && !t.attributes('role'))).toBe(true)
    wrapper.unmount()
  })

  it('paints each thumbnail in the accent it would get, as the style step does', () => {
    const cv = useCvStore()
    const wrapper = mount(TemplateSheet, { props: { open: true }, attachTo: document.body })
    const target = templates[1]!
    const thumb = wrapper.findAll('.tile').find((t) => t.text() === target.name)!.find('.thumb')
    const expected = accentIfChosen(target.id, cv.data.style)
    expect(applyTemplateDefaults(target.id, cv.data.style).accentColor).toBe(expected)
    expect(thumb.attributes('style')).toContain('color')
    wrapper.unmount()
  })

  it('applies a template like the style step does, and stays open to try another', async () => {
    const cv = useCvStore()
    const before = { ...cv.data.style }
    const wrapper = mount(TemplateSheet, { props: { open: true }, attachTo: document.body })
    const target = templates.find((t) => t.id !== cv.templateId)!
    await wrapper.findAll('.tile').find((t) => t.text() === target.name)!.trigger('click')
    expect(cv.templateId).toBe(target.id)
    expect(cv.data.style).toEqual(applyTemplateDefaults(target.id, before))
    expect(wrapper.find('dialog').attributes('open')).toBeDefined()
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.findAll('.tile').find((t) => t.text() === target.name)!.attributes('aria-pressed')).toBe('true')
    wrapper.unmount()
  })
})
