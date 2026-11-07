// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createEmptyCV } from '@/core/factory'
import { useCvStore } from '@/stores/cv'
import { useUiStore } from '@/stores/ui'
import { BACKUP_FORMAT } from '@/services/export/backup'
import ImportView from '@/components/import/ImportView.vue'
import FileDropzone from '@/components/import/FileDropzone.vue'

/** Spec 078: Import tells a backup from one CV's JSON, confirms replacing CVs, and sums up. */
const file = (value: unknown) => new File([JSON.stringify(value)], 'x.json', { type: 'application/json' })
const backup = (count: number, version = 1) => ({ format: BACKUP_FORMAT, version, exportedAt: '', cvs: Array.from({ length: count }, () => createEmptyCV()) })

beforeEach(() => setActivePinia(createPinia()))

function setup(plan: { added?: number; same?: number; changed?: number } = {}) {
  const cv = useCvStore()
  const ui = useUiStore()
  const cvs = (n = 0) => Array.from({ length: n }, () => createEmptyCV())
  const planned = { added: cvs(plan.added), same: cvs(plan.same), changed: cvs(plan.changed) }
  const importData = vi.spyOn(cv, 'importData').mockResolvedValue()
  const planRestore = vi.spyOn(cv, 'planRestore').mockResolvedValue(planned)
  const restoreBackup = vi
    .spyOn(cv, 'restoreBackup')
    .mockResolvedValue({ restored: planned.added.length, skipped: planned.same.length, replaced: planned.changed.length })
  ui.view = 'import'
  const wrapper = mount(ImportView)
  const drop = async (value: unknown) => {
    wrapper.findComponent(FileDropzone).vm.$emit('file', file(value))
    await flushPromises()
  }
  const button = (name: string) => wrapper.findAll('button').find((b) => b.text() === name)
  return { ui, wrapper, drop, button, importData, planRestore, restoreBackup }
}

describe('Import with a backup (spec 078)', () => {
  it('still opens one CV’s JSON as a new CV', async () => {
    const { ui, drop, importData, planRestore } = setup()
    await drop(createEmptyCV())
    expect(importData).toHaveBeenCalledWith(expect.objectContaining({ meta: expect.any(Object) }), 'new')
    expect(planRestore).not.toHaveBeenCalled()
    expect(ui.view).toBe('editor')
  })

  it('restores at once what replaces nothing, and sums it up', async () => {
    const { ui, wrapper, drop, button, restoreBackup } = setup({ added: 2, same: 1 })
    await drop(backup(3))
    expect(restoreBackup).toHaveBeenCalled()
    expect(wrapper.find('.restore-done').text()).toContain('Copia restaurada. Nuevos: 2 · Sin cambios: 1 · Reemplazados: 0')
    await button('Mis CVs')!.trigger('click')
    expect(ui.view).toBe('documents')
  })

  it('asks before replacing CVs; cancelling restores nothing', async () => {
    const { wrapper, drop, button, restoreBackup } = setup({ added: 1, changed: 2 })
    await drop(backup(3))
    expect(wrapper.find('.restore-confirm').text()).toContain('CV que se reemplazarán por su versión de la copia: 2. ¿Seguir?')
    expect(restoreBackup).not.toHaveBeenCalled()
    await button('Cancelar')!.trigger('click')
    expect(wrapper.find('.restore-confirm').exists()).toBe(false)
    expect(restoreBackup).not.toHaveBeenCalled()
  })

  it('replaces them once confirmed', async () => {
    const { wrapper, drop, button, restoreBackup } = setup({ added: 1, changed: 2 })
    await drop(backup(3))
    await button('Confirmar')!.trigger('click')
    await flushPromises()
    expect(restoreBackup).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.restore-done').text()).toContain('Reemplazados: 2')
  })

  it('says when a backup comes from a newer version of the app', async () => {
    const { wrapper, drop, planRestore } = setup()
    await drop(backup(1, 99))
    expect(planRestore).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Esta copia se hizo con una versión más nueva de Keireki Craft.')
  })
})
