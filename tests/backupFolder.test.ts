// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCALES } from '@/i18n'
import { BACKUP_FILE_WORDS, backupFileName, currentFileName, dailyFileDay, dailyFileName, isCurrentFileName } from '@/services/export/backup'

/** Spec 079: backing up to a folder. The folder and its handle are faked; the logic is real. */
let kept: unknown
vi.mock('@/services/storage/indexeddb', async (original) => ({
  ...(await original<object>()),
  loadFolderHandle: async () => kept,
  saveFolderHandle: async (handle: unknown) => void (kept = handle),
  forgetFolderHandle: async () => void (kept = undefined),
}))

const { chooseFolder, folderState, folderSupported, forgetFolder, resumeFolder, writeBackupToFolder, FolderUnavailableError, DAILY_COPIES } = await import(
  '@/services/storage/folder'
)

/** A folder in memory, as the File System Access API shows one. */
class FakeFolder {
  files = new Map<string, string>()
  permission: 'granted' | 'prompt' | 'denied' = 'granted'
  gone = false
  constructor(readonly name = 'CV') {}
  private check() {
    if (this.gone) throw new DOMException('gone', 'NotFoundError')
  }
  queryPermission = async () => this.permission
  requestPermission = async () => (this.permission = 'granted')
  getFileHandle = async (name: string) => {
    this.check()
    return { createWritable: async () => ({ write: async (text: string) => void this.files.set(name, text), close: async () => {} }) }
  }
  removeEntry = async (name: string) => void this.files.delete(name)
  keys = () => {
    this.check()
    const names = [...this.files.keys()]
    return (async function* () {
      yield* names
    })()
  }
}

describe('backup file names in every language (spec 079)', () => {
  it('names the folder’s copies in the interface language', () => {
    expect(currentFileName('es')).toBe('keireki-craft-copia.json')
    expect(currentFileName('fr')).toBe('keireki-craft-sauvegarde.json')
    expect(dailyFileName(new Date(2026, 10, 7), 'es')).toBe('keireki-craft-diaria-2026-11-07.json')
    expect(dailyFileName(new Date(2026, 10, 7), 'eu')).toBe('keireki-craft-egunekoa-2026-11-07.json')
  })

  it('recognises every language’s copies, and nothing else', () => {
    for (const locale of LOCALES) {
      expect(isCurrentFileName(currentFileName(locale))).toBe(true)
      expect(dailyFileDay(dailyFileName(new Date(2026, 0, 2), locale))).toBe('2026-01-02')
    }
    expect(isCurrentFileName('keireki-craft-copia-2026-01-02.json')).toBe(false)
    expect(dailyFileDay('notas-2026-01-02.json')).toBeNull()
  })

  it('never takes a downloaded backup, in any language, for a daily copy', () => {
    const backupWords = new Set(LOCALES.map((l) => BACKUP_FILE_WORDS[l].backup))
    for (const locale of LOCALES) {
      expect(backupWords.has(BACKUP_FILE_WORDS[locale].daily)).toBe(false)
      expect(dailyFileDay(backupFileName(new Date(2026, 0, 2), locale))).toBeNull()
      expect(BACKUP_FILE_WORDS[locale].backup + BACKUP_FILE_WORDS[locale].daily).toMatch(/^[a-z]+$/)
    }
  })
})

describe('the backup folder (spec 079)', () => {
  let folder: FakeFolder
  beforeEach(() => {
    kept = undefined
    folder = new FakeFolder('Documentos')
  })
  afterEach(() => {
    delete (window as { showDirectoryPicker?: unknown }).showDirectoryPicker
  })
  const pick = () => ((window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker = vi.fn(async () => folder))

  it('is offered only where the browser can write to a folder', () => {
    expect(folderSupported()).toBe(false)
    pick()
    expect(folderSupported()).toBe(true)
  })

  it('is chosen once and kept; forgetting it leaves its files', async () => {
    pick()
    expect(await folderState()).toEqual({ state: 'off' })
    expect(await chooseFolder()).toBe('Documentos')
    expect(await folderState()).toEqual({ state: 'ready', name: 'Documentos' })
    folder.files.set('keireki-craft-copia.json', '{}')
    await forgetFolder()
    expect(await folderState()).toEqual({ state: 'off' })
    expect(folder.files.size).toBe(1)
  })

  it('pauses without access in this visit, and resumes when asked', async () => {
    kept = folder
    folder.permission = 'prompt'
    expect((await folderState()).state).toBe('needs-permission')
    await expect(writeBackupToFolder('{}', new Date(), 'es')).rejects.toEqual(new FolderUnavailableError('needs-permission'))
    expect(folder.files.size).toBe(0)
    expect(await resumeFolder()).toBe(true)
    expect((await folderState()).state).toBe('ready')
  })

  it('says when the folder is gone', async () => {
    kept = folder
    folder.gone = true
    expect((await folderState()).state).toBe('missing')
    await expect(writeBackupToFolder('{}', new Date(), 'es')).rejects.toEqual(new FolderUnavailableError('missing'))
  })

  it('writes the current copy and today’s, named in the interface language', async () => {
    kept = folder
    await writeBackupToFolder('{"a":1}', new Date(2026, 10, 7, 10), 'es')
    expect(Object.fromEntries(folder.files)).toEqual({
      'keireki-craft-copia.json': '{"a":1}',
      'keireki-craft-diaria-2026-11-07.json': '{"a":1}',
    })
    await writeBackupToFolder('{"a":2}', new Date(2026, 10, 7, 18), 'es')
    expect(folder.files.get('keireki-craft-diaria-2026-11-07.json')).toBe('{"a":2}')
    expect(folder.files.size).toBe(2)
  })

  it('after a language change, replaces the current copy instead of leaving the old one', async () => {
    kept = folder
    await writeBackupToFolder('{}', new Date(2026, 10, 7), 'es')
    await writeBackupToFolder('{}', new Date(2026, 10, 8), 'en')
    expect([...folder.files.keys()].sort()).toEqual(['keireki-craft-backup.json', 'keireki-craft-daily-2026-11-08.json', 'keireki-craft-diaria-2026-11-07.json'])
  })

  it('keeps the newest seven daily copies of any language, and never touches other files', async () => {
    kept = folder
    const others = ['notas.txt', 'keireki-craft-copia-2026-10-01.json', 'keireki-craft-backup-2026-10-02.json', 'mi-cv.pdf']
    for (const name of others) folder.files.set(name, 'mine')
    for (let d = 1; d <= 9; d++) folder.files.set(dailyFileName(new Date(2026, 9, d), d % 2 ? 'es' : 'fr'), '{}')
    await writeBackupToFolder('{}', new Date(2026, 9, 10), 'es')
    const daily = [...folder.files.keys()].filter((name) => dailyFileDay(name)).map((name) => dailyFileDay(name)).sort()
    expect(daily).toHaveLength(DAILY_COPIES)
    expect(daily[0]).toBe('2026-10-04')
    expect(daily.at(-1)).toBe('2026-10-10')
    for (const name of others) expect(folder.files.get(name)).toBe('mine')
  })
})
