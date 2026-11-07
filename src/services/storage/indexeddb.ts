import { createStore, del, get, set } from 'idb-keyval'
import type { CVData, CVSummary } from '@/types/cv'
import { migrate } from '@/core/migrations'
import { readPrefs } from '@/services/prefs'
import { NotFoundError, StorageQuotaError, type StorageAdapter } from './adapter'
import { copyLegacyStore } from './legacy'

const store = createStore('keireki-craft', 'kv')

const cvKey = (id: string) => `cv:${id}`
/**
 * One key per stored version (`photo:{cvId}:{version}`; older CVs keep `photo:{cvId}`). A new photo
 * changes the CV's reference, so every view showing it reloads; with a fixed key a replaced or
 * re-cropped photo kept showing the old picture until a reload (spec 025).
 */
export const photoKey = (cvId: string, version = Date.now().toString(36)) => `photo:${cvId}:${version}`
const INDEX_KEY = 'index'

/**
 * The first call brings in what an install from before the rename (spec 039) stored; a failure is
 * thrown to the caller and the next call tries again, rather than carrying on with an empty store.
 */
let migrated: Promise<void> | undefined
const ready = () =>
  (migrated ??= copyLegacyStore(store, INDEX_KEY).catch((error) => {
    migrated = undefined
    throw error
  }))

/**
 * Key scheme (spec §8.1):
 *   `cv:{id}`    full CVData (photos excluded — only the reference is stored)
 *   `photo:{id}:{version}` the image as a Blob (~33% smaller than a base64 dataURL); see `photoKey`
 *   `index`      CVSummary[] so the CV list renders without loading every document
 */
export class IndexedDBAdapter implements StorageAdapter {
  async list(): Promise<CVSummary[]> {
    await ready()
    const index = (await get<CVSummary[]>(INDEX_KEY, store)) ?? []
    return [...index].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async load(id: string): Promise<CVData> {
    await ready()
    const raw = await get<CVData>(cvKey(id), store)
    if (!raw) throw new NotFoundError(id)
    // Before spec 021 every CV was shown in the global last pick; keep it looking that way.
    return migrate(raw, { fallbackTemplateId: readPrefs().lastTemplateId })
  }

  async save(data: CVData): Promise<void> {
    await ready()
    try {
      await set(cvKey(data.meta.id), structuredClone(data), store)
      await this.updateIndex(data)
    } catch (error) {
      throw isQuotaError(error) ? new StorageQuotaError(error) : error
    }
  }

  async delete(id: string): Promise<void> {
    await ready()
    const data = await get<CVData>(cvKey(id), store)
    if (data?.personal.photo) await del(data.personal.photo, store).catch(() => {})
    await del(cvKey(id), store)
    const index = (await get<CVSummary[]>(INDEX_KEY, store)) ?? []
    await set(INDEX_KEY, index.filter((s) => s.id !== id), store)
  }

  private async updateIndex(data: CVData) {
    const index = (await get<CVSummary[]>(INDEX_KEY, store)) ?? []
    const summary: CVSummary = {
      id: data.meta.id,
      title: data.meta.title,
      fullName: data.personal.fullName,
      updatedAt: data.meta.updatedAt,
      templateId: data.meta.templateId,
      accentColor: data.style.accentColor,
    }
    const at = index.findIndex((s) => s.id === summary.id)
    if (at >= 0) index[at] = summary
    else index.push(summary)
    await set(INDEX_KEY, index, store)
  }
}

/* ---- photo blobs ------------------------------------------------------- */

/** Stores `blob` under a new key and drops `previous`, the version it replaces. */
export async function savePhoto(cvId: string, blob: Blob, previous?: string): Promise<string> {
  await ready()
  const key = photoKey(cvId)
  try {
    await set(key, blob, store)
  } catch (error) {
    throw isQuotaError(error) ? new StorageQuotaError(error) : error
  }
  if (previous?.startsWith('photo:') && previous !== key) await del(previous, store).catch(() => {})
  return key
}

export async function loadPhoto(key: string): Promise<Blob | undefined> {
  await ready()
  return get<Blob>(key, store)
}

export async function deletePhoto(key: string): Promise<void> {
  await ready()
  await del(key, store)
}

/* ---- the backup folder (spec 079) ---------------------------------------- */

const FOLDER_KEY = 'backupFolder'

/** The folder chosen for backups: a directory handle, which IndexedDB can keep and nothing else can. */
export async function loadFolderHandle<T>(): Promise<T | undefined> {
  await ready()
  return get<T>(FOLDER_KEY, store)
}

export async function saveFolderHandle(handle: unknown): Promise<void> {
  await ready()
  await set(FOLDER_KEY, handle, store)
}

export async function forgetFolderHandle(): Promise<void> {
  await ready()
  await del(FOLDER_KEY, store)
}

/* ---- environment probes ------------------------------------------------ */

/**
 * Asks the browser to keep our data through storage pressure. Silently ignored
 * on browsers without the API; a `false` result is worth surfacing to the user.
 */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

/**
 * Private browsing does not reliably expose itself, but it does reliably fail to
 * *store* things. Probing with a real write is the only portable detection.
 */
export async function isStorageAvailable(): Promise<boolean> {
  try {
    await set('__probe__', 1, store)
    await del('__probe__', store)
    return true
  } catch {
    return false
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}
