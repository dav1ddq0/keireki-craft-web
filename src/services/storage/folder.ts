import type { Locale } from '@/i18n'
import { currentFileName, dailyFileDay, dailyFileName, isCurrentFileName } from '@/services/export/backup'
import { forgetFolderHandle, loadFolderHandle, saveFolderHandle } from './indexeddb'

/**
 * The backup folder (spec 079): a folder on the computer, chosen once, where every save leaves the
 * backup of every CV (078's file) and one copy per day, the last seven. Only where the browser can
 * write to a folder (the File System Access API: Chrome, Edge, Opera on a computer).
 */

/** How many daily copies the folder keeps. */
export const DAILY_COPIES = 7

/** What the app uses of the File System Access API, which the DOM typings do not carry yet. */
interface WritableFile {
  write(data: string): Promise<void>
  close(): Promise<void>
}
interface FolderFile {
  createWritable(): Promise<WritableFile>
}
type Permission = 'granted' | 'denied' | 'prompt'
export interface FolderHandle {
  readonly name: string
  queryPermission(options: { mode: 'readwrite' }): Promise<Permission>
  requestPermission(options: { mode: 'readwrite' }): Promise<Permission>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FolderFile>
  removeEntry(name: string): Promise<void>
  keys(): AsyncIterable<string>
}
type Picker = (options: { mode: 'readwrite'; id: string }) => Promise<FolderHandle>

/**
 * `off`: no folder chosen; `ready`: it will be written to; `needs-permission`: the browser has not
 * granted access in this visit (a click on "Resume" asks); `missing`: the folder is gone.
 */
export type FolderState = 'off' | 'ready' | 'needs-permission' | 'missing'

/** The folder cannot be written to now: no access in this visit, or it is gone. */
export class FolderUnavailableError extends Error {
  constructor(readonly state: Exclude<FolderState, 'off' | 'ready'>) {
    super(`Backup folder unavailable: ${state}`)
    this.name = 'FolderUnavailableError'
  }
}

const picker = (): Picker | undefined =>
  typeof window !== 'undefined' ? (window as unknown as { showDirectoryPicker?: Picker }).showDirectoryPicker : undefined

export function folderSupported(): boolean {
  return typeof picker() === 'function'
}

/** Opens the system's folder picker (it needs the click) and keeps the folder. Returns its name. */
export async function chooseFolder(): Promise<string> {
  const handle = await picker()!({ mode: 'readwrite', id: 'keireki-craft' })
  await saveFolderHandle(handle)
  return handle.name
}

/** Stops writing to the folder; the files in it stay. */
export async function forgetFolder(): Promise<void> {
  await forgetFolderHandle()
}

const isMissing = (error: unknown) => error instanceof DOMException && error.name === 'NotFoundError'

/** The folder's state and name, without asking the person anything. */
export async function folderState(): Promise<{ state: FolderState; name?: string }> {
  const handle = await loadFolderHandle<FolderHandle>()
  if (!handle) return { state: 'off' }
  if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') return { state: 'needs-permission', name: handle.name }
  try {
    for await (const _name of handle.keys()) break
    return { state: 'ready', name: handle.name }
  } catch (error) {
    if (isMissing(error)) return { state: 'missing', name: handle.name }
    throw error
  }
}

/** "Resume": asks the browser for access again (it needs the click). */
export async function resumeFolder(): Promise<boolean> {
  const handle = await loadFolderHandle<FolderHandle>()
  if (!handle) return false
  return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'
}

async function writeFile(dir: FolderHandle, name: string, text: string) {
  const writable = await (await dir.getFileHandle(name, { create: true })).createWritable()
  await writable.write(text)
  await writable.close()
}

/**
 * Writes the backup as the folder's current copy and as today's copy, both named in `locale`; then
 * removes a current copy named in another language, and daily copies beyond the newest seven. Only
 * files with those exact names are ever removed.
 */
export async function writeBackupToFolder(json: string, now: Date, locale: Locale): Promise<void> {
  const dir = await loadFolderHandle<FolderHandle>()
  if (!dir) throw new FolderUnavailableError('missing')
  if ((await dir.queryPermission({ mode: 'readwrite' })) !== 'granted') throw new FolderUnavailableError('needs-permission')
  const current = currentFileName(locale)
  try {
    await writeFile(dir, current, json)
    await writeFile(dir, dailyFileName(now, locale), json)
    const stale: string[] = []
    const daily: { name: string; day: string }[] = []
    for await (const name of dir.keys()) {
      if (name !== current && isCurrentFileName(name)) stale.push(name)
      const day = dailyFileDay(name)
      if (day) daily.push({ name, day })
    }
    daily.sort((a, b) => b.day.localeCompare(a.day) || a.name.localeCompare(b.name))
    for (const name of [...stale, ...daily.slice(DAILY_COPIES).map((file) => file.name)]) await dir.removeEntry(name)
  } catch (error) {
    if (isMissing(error)) throw new FolderUnavailableError('missing')
    throw error
  }
}
