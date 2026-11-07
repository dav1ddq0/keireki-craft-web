// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

/** Spec 079: what the folder backup shows in each state. The folder is faked. */
const folder = { supported: true, state: 'off' as string, name: 'Documentos', chooseCalls: 0, resumeCalls: 0 }
const exportBackup = vi.fn(async () => {})

vi.mock('@/services/storage/folder', () => {
  class FolderUnavailableError extends Error {
    constructor(readonly state: string) {
      super(state)
    }
  }
  return {
    FolderUnavailableError,
    folderSupported: () => folder.supported,
    folderState: async () => (folder.state === 'off' ? { state: 'off' } : { state: folder.state, name: folder.name }),
    chooseFolder: async () => {
      folder.chooseCalls++
      folder.state = 'ready'
      return folder.name
    },
    forgetFolder: async () => void (folder.state = 'off'),
    resumeFolder: async () => {
      folder.resumeCalls++
      folder.state = 'ready'
      return true
    },
    writeBackupToFolder: async () => {},
  }
})
vi.mock('@/services/export', async (original) => ({ ...(await original<object>()), exportBackup: (...args: unknown[]) => exportBackup(...(args as [])) }))

async function setup() {
  vi.resetModules()
  const { createPinia, setActivePinia } = await import('pinia')
  setActivePinia(createPinia())
  const { useCvStore } = await import('@/stores/cv')
  const cv = useCvStore()
  vi.spyOn(cv, 'loadAll').mockResolvedValue([])
  const { useBackupFolder } = await import('@/composables/useBackupFolder')
  await useBackupFolder().refresh()
  return cv
}
const mountIt = async (path: string) => {
  const component = (await import(path)).default
  const wrapper = mount(component)
  await flushPromises()
  const button = (name: string) => wrapper.findAll('button').find((b) => b.text() === name)
  return { wrapper, button }
}

beforeEach(() => {
  Object.assign(folder, { supported: true, state: 'off', chooseCalls: 0, resumeCalls: 0 })
  exportBackup.mockReset().mockResolvedValue(undefined)
  localStorage.clear()
})

describe('the folder option (spec 079)', () => {
  it('is not there where the browser cannot write to a folder', async () => {
    folder.supported = false
    await setup()
    const { wrapper } = await mountIt('@/components/documents/BackupFolderSettings.vue')
    expect(wrapper.find('.folder').exists()).toBe(false)
  })

  it('offers to choose a folder, then says where it saves', async () => {
    await setup()
    const { wrapper, button } = await mountIt('@/components/documents/BackupFolderSettings.vue')
    expect(wrapper.text()).toContain('Guardar también en una carpeta')
    await button('Elegir carpeta…')!.trigger('click')
    await flushPromises()
    expect(folder.chooseCalls).toBe(1)
    expect(wrapper.find('.folder').attributes('data-state')).toBe('ready')
    expect(wrapper.text()).toContain('Guardando en «Documentos»')
    expect(button('Cambiar carpeta')).toBeDefined()
    await button('Dejar de guardar')!.trigger('click')
    await flushPromises()
    expect(wrapper.find('.folder').attributes('data-state')).toBe('off')
  })

  it('when paused, resumes; when the folder is gone, offers another', async () => {
    folder.state = 'needs-permission'
    await setup()
    const paused = await mountIt('@/components/documents/BackupFolderSettings.vue')
    expect(paused.wrapper.text()).toContain('La copia en «Documentos» está en pausa')
    await paused.button('Reanudar')!.trigger('click')
    await flushPromises()
    expect(folder.resumeCalls).toBe(1)

    folder.state = 'missing'
    await setup()
    const missing = await mountIt('@/components/documents/BackupFolderSettings.vue')
    expect(missing.wrapper.text()).toContain('No se encuentra la carpeta «Documentos»')
    expect(missing.button('Elegir otra carpeta')).toBeDefined()
  })

  it('says it is paused where the reminder would be, before the reminder', async () => {
    folder.state = 'needs-permission'
    const cv = await setup()
    cv.documents = [{ id: 'a', title: 'Uno', fullName: '', updatedAt: new Date().toISOString(), templateId: 'classic', accentColor: '#000' }]
    const { wrapper, button } = await mountIt('@/components/documents/BackupReminder.vue')
    expect(wrapper.find('.folder-paused').text()).toContain('La copia en la carpeta «Documentos» está en pausa.')
    expect(wrapper.find('.backup-reminder').exists()).toBe(false)
    await button('Reanudar')!.trigger('click')
    await flushPromises()
    expect(wrapper.find('.folder-paused').exists()).toBe(false)
  })
})

describe('Preferences’ backup (spec 079)', () => {
  it('saves every CV, not only the open one', async () => {
    await setup()
    const { wrapper, button } = await mountIt('@/components/PreferencesPopover.vue')
    expect(wrapper.text()).not.toContain('(JSON)')
    await button('Hacer copia de seguridad')!.trigger('click')
    await flushPromises()
    expect(exportBackup).toHaveBeenCalled()
  })
})
