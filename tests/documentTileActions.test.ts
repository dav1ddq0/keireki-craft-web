// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DocumentTileActions from '@/components/documents/DocumentTileActions.vue'
import DocumentMenu from '@/components/documents/DocumentMenu.vue'
import DeleteDocumentDialog from '@/components/documents/DeleteDocumentDialog.vue'
import DocumentList from '@/components/documents/DocumentList.vue'
import { useCvStore } from '@/stores/cv'
import type { CVSummary } from '@/types/cv'

// jsdom ships <dialog> without showModal/close; a minimal stand-in keeps `open` and fires `close`.
beforeAll(() => {
  const proto = HTMLDialogElement.prototype
  proto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  proto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

beforeEach(() => setActivePinia(createPinia()))

const doc = (id: string, fullName: string, title: string): CVSummary =>
  ({ id, fullName, title, updatedAt: '2026-11-15T19:19:00.000Z', templateId: 'monograph' }) as CVSummary

const byName = (wrapper: VueWrapper, name: string) => wrapper.find(`button[aria-label="${name}"]`)
const items = (wrapper: VueWrapper) => wrapper.findAll('[role="menuitem"]')
const focused = () => document.activeElement

describe('DocumentTileActions (spec 090)', () => {
  it('has Open, the ⋮ menu and the trash, and says which CV each one is for', async () => {
    const wrapper = mount(DocumentTileActions, { props: { title: 'Mi CV' }, attachTo: document.body })
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)

    const trash = byName(wrapper, 'Eliminar «Mi CV»')
    expect(trash.exists()).toBe(true)
    expect(wrapper.find('.tip').text()).toBe('Eliminar')
    expect(wrapper.find('.tip').attributes('aria-hidden')).toBe('true')
    await trash.trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)

    const more = byName(wrapper, 'Más acciones de «Mi CV»')
    expect(more.attributes('aria-haspopup')).toBe('menu')
    await more.trigger('click')
    await items(wrapper)[1]!.trigger('click')
    expect(wrapper.emitted('duplicate')).toHaveLength(1)
    wrapper.unmount()
  })
})

describe('DocumentMenu (spec 090)', () => {
  const mountMenu = () => mount(DocumentMenu, { props: { title: 'Mi CV' }, attachTo: document.body })

  it('opens on the first item, moves with the arrows, and closes on Esc back to ⋮', async () => {
    const wrapper = mountMenu()
    const more = wrapper.find('button[aria-haspopup="menu"]')
    expect(more.attributes('aria-expanded')).toBe('false')

    await more.trigger('click')
    await flushPromises()
    expect(more.attributes('aria-expanded')).toBe('true')
    expect(items(wrapper).map((i) => i.text())).toEqual(['Renombrar', 'Duplicar'])
    expect(focused()).toBe(items(wrapper)[0]!.element)

    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'ArrowDown' })
    expect(focused()).toBe(items(wrapper)[1]!.element)
    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'ArrowDown' })
    expect(focused()).toBe(items(wrapper)[0]!.element)
    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'End' })
    expect(focused()).toBe(items(wrapper)[1]!.element)

    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(focused()).toBe(more.element)
    wrapper.unmount()
  })

  it('opens on the last item with ↑, closes on a press outside, and emits the item chosen', async () => {
    const wrapper = mountMenu()
    const more = wrapper.find('button[aria-haspopup="menu"]')
    await more.trigger('keydown', { key: 'ArrowUp' })
    await flushPromises()
    expect(focused()).toBe(items(wrapper)[1]!.element)

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await flushPromises()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)

    await more.trigger('click')
    await flushPromises()
    await items(wrapper)[0]!.trigger('click')
    expect(wrapper.emitted('rename')).toHaveLength(1)
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('DeleteDocumentDialog (spec 090)', () => {
  it('names the CV as its card does, and only Eliminar confirms', async () => {
    const wrapper = mount(DeleteDocumentDialog, { props: { open: true, doc: doc('a', '', 'Mi CV') }, attachTo: document.body })
    await flushPromises()
    const dialog = wrapper.find('dialog')
    expect(dialog.attributes('open')).toBeDefined()
    expect(wrapper.find('h2').text()).toBe('¿Eliminar «Mi CV»?')
    expect(wrapper.text()).toContain('Se borrará de este navegador y no se puede deshacer.')
    expect(wrapper.find('.monogram').text()).toBe('MC')
    expect(wrapper.find('.summary').text()).toContain('Plantilla Monograph')

    const [cancel, remove] = wrapper.findAll('.foot button')
    expect(cancel!.text()).toBe('Cancelar')
    expect(cancel!.attributes('autofocus')).toBeDefined()
    await cancel!.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()

    await remove!.trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    wrapper.unmount()
  })
})

describe('My CVs: deleting and renaming from a card (spec 090)', () => {
  it('deletes through the dialog, and Cancel keeps the CV', async () => {
    const cv = useCvStore()
    cv.documents = [doc('a', 'Nadia Martín Reyes', 'CV de ejemplo'), doc('b', '', 'Mi CV')]
    const removed: string[] = []
    cv.remove = async (id: string) => {
      removed.push(id)
      cv.documents = cv.documents.filter((d) => d.id !== id)
    }
    const wrapper = mount(DocumentList, { attachTo: document.body })

    await byName(wrapper, 'Eliminar «Mi CV»').trigger('click')
    await flushPromises()
    expect(wrapper.find('dialog').attributes('open')).toBeDefined()
    expect(wrapper.find('dialog h2').text()).toBe('¿Eliminar «Mi CV»?')
    await wrapper.findAll('dialog .foot button')[0]!.trigger('click')
    await flushPromises()
    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
    expect(removed).toEqual([])

    await byName(wrapper, 'Eliminar «Nadia Martín Reyes»').trigger('click')
    await flushPromises()
    await wrapper.findAll('dialog .foot button')[1]!.trigger('click')
    await flushPromises()
    expect(removed).toEqual(['a'])
    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
    expect(focused()).toBe(wrapper.find('input[type="search"]').element)
    wrapper.unmount()
  })

  it('opens the rename form in the card from the menu', async () => {
    const cv = useCvStore()
    cv.documents = [doc('a', '', 'Mi CV')]
    const wrapper = mount(DocumentList, { attachTo: document.body })
    await byName(wrapper, 'Más acciones de «Mi CV»').trigger('click')
    await flushPromises()
    await wrapper.findAll('[role="menuitem"]')[0]!.trigger('click')
    expect((wrapper.find('form.rename input').element as HTMLInputElement).value).toBe('Mi CV')
    wrapper.unmount()
  })
})
