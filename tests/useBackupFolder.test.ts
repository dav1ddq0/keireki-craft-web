// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

/** Spec 079: the folder is faked; when and what the app writes is real. */
const folder = {
  supported: true,
  state: 'ready' as string,
  name: 'Documentos',
  written: [] as { json: string; locale: string }[],
  failWith: null as null | string,
  chosen: 'Documentos' as string | null,
}

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
      if (!folder.chosen) throw new DOMException('closed', 'AbortError')
      folder.state = 'ready'
      return folder.chosen
    },
    forgetFolder: async () => void (folder.state = 'off'),
    resumeFolder: async () => (folder.state = 'ready') === 'ready',
    writeBackupToFolder: async (json: string, _now: Date, locale: string) => {
      if (folder.failWith) throw new FolderUnavailableError(folder.failWith)
      folder.written.push({ json, locale })
    },
  }
})

async function setup() {
  vi.resetModules()
  const { createPinia, setActivePinia } = await import('pinia')
  setActivePinia(createPinia())
  const { useCvStore } = await import('@/stores/cv')
  const { useUiStore } = await import('@/stores/ui')
  const { useBackupFolder, FOLDER_WRITE_DELAY_MS } = await import('@/composables/useBackupFolder')
  const cv = useCvStore()
  vi.spyOn(cv, 'loadAll').mockResolvedValue([])
  const ui = useUiStore()
  const backupFolder = useBackupFolder()
  backupFolder.start()
  await vi.advanceTimersByTimeAsync(0)
  /** A save: the CV list changes, as `refreshDocuments` does after each one. */
  const save = async () => {
    cv.documents = [{ id: 'a', title: 'Uno', fullName: '', updatedAt: new Date().toISOString(), templateId: 'classic', accentColor: '#000' }]
    await nextTick()
  }
  return { cv, ui, backupFolder, save, wait: () => vi.advanceTimersByTimeAsync(FOLDER_WRITE_DELAY_MS) }
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  Object.assign(folder, { supported: true, state: 'ready', written: [], failWith: null, chosen: 'Documentos' })
})
afterEach(() => vi.useRealTimers())

describe('writing to the backup folder (spec 079)', () => {
  it('writes once after a run of saves, and counts it as a backup', async () => {
    const { ui, backupFolder, save, wait } = await setup()
    expect(backupFolder.state.value).toBe('ready')
    await save()
    await vi.advanceTimersByTimeAsync(1000)
    await save()
    expect(folder.written).toHaveLength(0)
    await wait()
    expect(folder.written).toHaveLength(1)
    expect(JSON.parse(folder.written[0]!.json)).toMatchObject({ format: 'keireki-craft-backup', version: 1 })
    expect(folder.written[0]!.locale).toBe('es')
    expect(ui.backup.lastBackupAt).not.toBeNull()
    expect(backupFolder.lastWrittenAt.value).toBe(ui.backup.lastBackupAt)
  })

  it('does nothing where the browser cannot write to a folder', async () => {
    folder.supported = false
    const { backupFolder, save, wait } = await setup()
    expect(backupFolder.state.value).toBe('unsupported')
    await save()
    await wait()
    expect(folder.written).toHaveLength(0)
  })

  it('waits for access in this visit, and writes once it is given', async () => {
    folder.state = 'needs-permission'
    const { backupFolder, save, wait } = await setup()
    await save()
    await wait()
    expect(folder.written).toHaveLength(0)
    await backupFolder.resume()
    expect(backupFolder.state.value).toBe('ready')
    expect(folder.written).toHaveLength(1)
  })

  it('pauses when the folder is gone, and does not count it as a backup', async () => {
    const { ui, backupFolder, save, wait } = await setup()
    folder.failWith = 'missing'
    await save()
    await wait()
    expect(backupFolder.state.value).toBe('missing')
    expect(ui.backup.lastBackupAt).toBeNull()
  })

  it('writes as soon as a folder is chosen; closing the picker changes nothing', async () => {
    folder.state = 'off'
    folder.chosen = null
    const { backupFolder } = await setup()
    await backupFolder.choose()
    expect(backupFolder.state.value).toBe('off')
    folder.chosen = 'Dropbox'
    await backupFolder.choose()
    expect(backupFolder.state.value).toBe('ready')
    expect(backupFolder.name.value).toBe('Documentos')
    expect(folder.written).toHaveLength(1)
  })

  it('stops when asked', async () => {
    const { backupFolder, save, wait } = await setup()
    await backupFolder.stop()
    expect(backupFolder.state.value).toBe('off')
    await save()
    await wait()
    expect(folder.written).toHaveLength(0)
  })
})
