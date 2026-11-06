// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DesktopHeader from '@/components/DesktopHeader.vue'
import { useUiStore } from '@/stores/ui'
import { useCvStore } from '@/stores/cv'

beforeEach(() => setActivePinia(createPinia()))

describe('DesktopHeader', () => {
  it('shows the document name in the breadcrumb as the current page, not as a field (spec 073)', async () => {
    const cv = useCvStore()
    cv.data.meta.title = 'CV para Cartograf'
    const wrapper = mount(DesktopHeader)
    expect(wrapper.find('nav input').exists()).toBe(false)
    const name = wrapper.find('.doc-title')
    expect(name.text()).toBe('CV para Cartograf')
    expect(name.attributes('aria-current')).toBe('page')
    cv.data.meta.title = '  '
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.doc-title').text()).toBe('Sin título')
  })

  it('names undo and redo with their shortcut and emits export', async () => {
    const wrapper = mount(DesktopHeader)
    const labels = wrapper.findAll('button.icon').map((b) => b.attributes('aria-label'))
    expect(labels).toEqual(['Deshacer (Ctrl+Z)', 'Rehacer (Ctrl+Mayús+Z)'])
    await wrapper.find('button.primary').trigger('click')
    expect(wrapper.emitted('export')).toHaveLength(1)
  })

  it('shows the three views and no export button outside the editor', async () => {
    const ui = useUiStore()
    ui.view = 'documents'
    const wrapper = mount(DesktopHeader)
    const views = wrapper.findAll('button.view')
    expect(views.map((b) => b.text())).toEqual(['Editor', 'Mis CVs', 'Importar'])
    expect(views[1]!.attributes('aria-current')).toBe('page')
    expect(wrapper.find('button.primary').exists()).toBe(false)
  })
})
