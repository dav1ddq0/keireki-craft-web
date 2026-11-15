// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DocumentList from '@/components/documents/DocumentList.vue'
import { useCvStore } from '@/stores/cv'
import type { CVSummary } from '@/types/cv'

beforeEach(() => setActivePinia(createPinia()))

const doc = (id: string, fullName: string, title: string): CVSummary =>
  ({ id, fullName, title, updatedAt: '2026-10-25T10:00:00.000Z' }) as CVSummary

describe('My CVs on wide screens (spec 018)', () => {
  it('starts the grid with a New CV tile and filters by name, ignoring accents', async () => {
    const cv = useCvStore()
    cv.documents = [doc('a', 'Nadia Martín', 'Mi CV'), doc('b', 'Luis Pérez', 'CV en inglés')]
    const wrapper = mount(DocumentList)
    expect(wrapper.find('button.tile--new').text()).toContain('Nuevo CV')
    expect(wrapper.findAll('.tile-name').map((n) => n.text())).toEqual(['Nuevo CV', 'Nadia Martín', 'Luis Pérez'])

    await wrapper.find('input[type="search"]').setValue('martin')
    expect(wrapper.findAll('button.tile-open')).toHaveLength(1)
    await wrapper.find('input[type="search"]').setValue('inglés')
    expect(wrapper.find('button.tile-open').text()).toContain('Luis Pérez')
    await wrapper.find('input[type="search"]').setValue('zzz')
    expect(wrapper.find('.empty').text()).toBe('Ningún CV coincide con «zzz».')
  })

  it('marks the letters that matched in the name and the title, as written (spec 089)', async () => {
    const cv = useCvStore()
    cv.documents = [doc('a', 'Nadia Martín Reyes', 'Desarrolladora'), doc('b', 'Ana Martínez', 'CV en inglés')]
    const wrapper = mount(DocumentList)
    expect(wrapper.findAll('mark')).toHaveLength(0)

    await wrapper.find('input[type="search"]').setValue('martin')
    expect(wrapper.findAll('.tile-name mark').map((m) => m.text())).toEqual(['Martín', 'Martín'])
    expect(wrapper.findAll('.tile-name').map((n) => n.text())).toEqual(['Nuevo CV', 'Nadia Martín Reyes', 'Ana Martínez'])

    await wrapper.find('input[type="search"]').setValue('ingles')
    expect(wrapper.findAll('button.tile-open')).toHaveLength(1)
    expect(wrapper.findAll('.meta mark').map((m) => m.text())).toEqual(['inglés'])
  })

  it('searches the name and the title each on its own, so a card that stays shows a mark', async () => {
    const cv = useCvStore()
    cv.documents = [doc('a', 'Nadia Martín Reyes', 'Desarrolladora')]
    const wrapper = mount(DocumentList)
    await wrapper.find('input[type="search"]').setValue('reyes desa')
    expect(wrapper.findAll('button.tile-open')).toHaveLength(0)
  })

  it('never marks the "untitled" fallback', async () => {
    const cv = useCvStore()
    cv.documents = [doc('a', '', '')]
    const wrapper = mount(DocumentList)
    const untitled = wrapper.findAll('.tile-name')[1]!.text()
    await wrapper.find('input[type="search"]').setValue(untitled.slice(0, 3))
    expect(wrapper.findAll('button.tile-open')).toHaveLength(0)
    expect(wrapper.findAll('mark')).toHaveLength(0)
  })
})
