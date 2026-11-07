// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createEmptyCV } from '@/core/factory'

const exportBackup = vi.fn(async () => {})
vi.mock('@/services/export', async (original) => ({ ...(await original<object>()), exportBackup: (...args: unknown[]) => exportBackup(...(args as [])) }))
const writePrefs = vi.fn()
vi.mock('@/services/prefs', async (original) => ({ ...(await original<object>()), writePrefs: (patch: unknown) => writePrefs(patch) }))

const { useCvStore } = await import('@/stores/cv')
const { useUiStore } = await import('@/stores/ui')
const { useBackup } = await import('@/composables/useBackup')
const DocumentList = (await import('@/components/documents/DocumentList.vue')).default

beforeEach(() => {
  setActivePinia(createPinia())
  exportBackup.mockReset().mockResolvedValue(undefined)
  writePrefs.mockReset()
})

describe('Back up all CVs (spec 078)', () => {
  it('saves every CV in one file and remembers the day', async () => {
    const cvs = [createEmptyCV(), createEmptyCV()]
    vi.spyOn(useCvStore(), 'loadAll').mockResolvedValue(cvs)
    const { backUp, failed } = useBackup()
    await backUp()
    expect(exportBackup).toHaveBeenCalledWith(cvs, expect.any(Date), 'es')
    expect(useUiStore().backup.lastBackupAt).toMatch(/^\d{4}-\d\d-\d\dT/)
    expect(writePrefs).toHaveBeenCalledWith(expect.objectContaining({ lastBackupAt: useUiStore().backup.lastBackupAt }))
    expect(failed.value).toBe(false)
  })

  it('says so when it fails, and does not count it as a backup', async () => {
    vi.spyOn(useCvStore(), 'loadAll').mockResolvedValue([])
    exportBackup.mockRejectedValue(new Error('no'))
    const { backUp, failed, busy } = useBackup()
    await backUp()
    expect(failed.value).toBe(true)
    expect(busy.value).toBe(false)
    expect(useUiStore().backup.lastBackupAt).toBeNull()
    expect(writePrefs).not.toHaveBeenCalledWith(expect.objectContaining({ lastBackupAt: expect.anything() }))
  })

  it('is offered among My CVs’ actions once there is a CV, with no warning bar of its own', async () => {
    const store = useCvStore()
    const loadAll = vi.spyOn(store, 'loadAll').mockResolvedValue([])
    const wrapper = mount(DocumentList)
    const button = () => wrapper.findAll('.head-actions button').find((b) => b.text() === 'Hacer copia de seguridad')
    expect(button()).toBeUndefined()

    store.documents = [{ id: 'a', title: 'Uno', fullName: '', updatedAt: '', templateId: 'classic', accentColor: '#000' }]
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.notice').exists()).toBe(false)
    await button()!.trigger('click')
    await vi.waitFor(() => expect(exportBackup).toHaveBeenCalled())
    expect(loadAll).toHaveBeenCalled()
  })
})
