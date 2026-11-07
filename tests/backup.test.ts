// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { CVData, CVSummary } from '@/types/cv'
import { createEmptyCV } from '@/core/factory'
import { UnsupportedSchemaError } from '@/core/migrations'

/** Spec 078: a backup of every CV, and restoring it. Storage lives in memory here. */
const saved = new Map<string, CVData>()
const photos = new Map<string, Blob>()
let photoVersion = 0

vi.mock('@/services/storage', () => ({
  savePhoto: async (cvId: string, blob: Blob, previous?: string) => {
    const key = `photo:${cvId}:${++photoVersion}`
    photos.set(key, blob)
    if (previous && previous !== key) photos.delete(previous)
    return key
  },
  loadPhoto: async (key: string) => photos.get(key),
  deletePhoto: async (key: string) => void photos.delete(key),
  storage: {
    list: async (): Promise<CVSummary[]> =>
      [...saved.values()].map((cv) => ({
        id: cv.meta.id,
        title: cv.meta.title,
        fullName: cv.personal.fullName,
        updatedAt: cv.meta.updatedAt,
        templateId: cv.meta.templateId,
        accentColor: cv.style.accentColor,
      })),
    load: async (id: string) => structuredClone(saved.get(id)!),
    save: async (data: CVData) => void saved.set(data.meta.id, structuredClone(data)),
    delete: async (id: string) => void saved.delete(id),
  },
  NotFoundError: class NotFoundError extends Error {},
  StorageQuotaError: class StorageQuotaError extends Error {},
}))

let prefs: Record<string, unknown> = {}
vi.mock('@/services/prefs', () => ({
  readPrefs: () => ({ lastTemplateId: 'classic', lastCvId: null, ...prefs }),
  writePrefs: (patch: Record<string, unknown>) => void (prefs = { ...prefs, ...patch }),
}))

const { useCvStore } = await import('@/stores/cv')
const { buildBackup, backupFileName, readImportFile, UnsupportedBackupError, BACKUP_FORMAT, BACKUP_VERSION } = await import(
  '@/services/export/backup'
)

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

function cv(id: string, title: string, photo?: string): CVData {
  const data = createEmptyCV()
  data.meta = { ...data.meta, id, title, updatedAt: '2026-01-01T00:00:00.000Z' }
  data.personal.fullName = `Persona ${title}`
  if (photo) data.personal.photo = photo
  return data
}

function store(data: CVData, photo?: Blob) {
  if (photo) {
    const key = `photo:${data.meta.id}:${++photoVersion}`
    photos.set(key, photo)
    data.personal.photo = key
  }
  saved.set(data.meta.id, structuredClone(data))
}

const file = (value: unknown) => new File([JSON.stringify(value)], 'x.json', { type: 'application/json' })

beforeEach(() => {
  saved.clear()
  photos.clear()
  prefs = {}
  setActivePinia(createPinia())
})

describe('the backup file (spec 078)', () => {
  it('holds every CV as its JSON export writes it, photos inlined, and names its format', async () => {
    store(cv('a', 'Uno'), new Blob(['png'], { type: 'image/png' }))
    store(cv('b', 'Dos'))
    const backup = await buildBackup([...saved.values()], new Date('2026-11-07T10:00:00Z'))
    expect(backup).toMatchObject({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: '2026-11-07T10:00:00.000Z' })
    expect(backup.cvs.map((c) => c.meta.title)).toEqual(['Uno', 'Dos'])
    expect(backup.cvs[0]!.personal.photo).toMatch(/^data:image\/png;base64,/)
  })

  it('is named after the day it was made', () => {
    expect(backupFileName(new Date(2026, 10, 7, 23, 30))).toBe('keireki-craft-copia-2026-11-07.json')
  })

  it('is told from one CV’s JSON when read back', async () => {
    const one = cv('a', 'Uno')
    expect(await readImportFile(file(one))).toMatchObject({ kind: 'cv', data: { meta: { id: 'a' } } })
    const backup = await readImportFile(file({ format: BACKUP_FORMAT, version: 1, exportedAt: '', cvs: [one, cv('b', 'Dos')] }))
    expect(backup.kind).toBe('backup')
    expect(backup.kind === 'backup' && backup.cvs.map((c) => c.meta.id)).toEqual(['a', 'b'])
  })

  it('refuses a backup from a newer version, and a file that is neither', async () => {
    await expect(readImportFile(file({ format: BACKUP_FORMAT, version: 99, cvs: [] }))).rejects.toBeInstanceOf(UnsupportedBackupError)
    await expect(readImportFile(file(42))).rejects.toBeInstanceOf(UnsupportedSchemaError)
  })
})

describe('restoring a backup (spec 078)', () => {
  it('finds nothing to change in a backup just made, photos included', async () => {
    store(cv('a', 'Uno'), await (await fetch(PIXEL)).blob())
    store(cv('b', 'Dos'))
    const cvs = useCvStore()
    await cvs.init()
    const backup = await buildBackup(await cvs.loadAll())
    const plan = await cvs.planRestore(backup.cvs)
    expect(plan.same.map((c) => c.meta.id).sort()).toEqual(['a', 'b'])
    expect(plan.added).toHaveLength(0)
    expect(plan.changed).toHaveLength(0)
  })

  it('adds what is missing as it was, skips what is the same, replaces what changed', async () => {
    store(cv('same', 'Igual'))
    store(cv('changed', 'Antes'))
    const cvs = useCvStore()
    await cvs.init()
    const same = structuredClone(saved.get('same')!)
    same.meta.updatedAt = '2030-01-01T00:00:00.000Z' // only the date of the last edit differs: still the same
    const changed = structuredClone(saved.get('changed')!)
    changed.meta.title = 'Después'
    const backup = [same, changed, cv('new', 'Nuevo')]

    const plan = await cvs.planRestore(backup)
    expect([plan.added, plan.same, plan.changed].map((group) => group.map((c) => c.meta.id))).toEqual([['new'], ['same'], ['changed']])

    expect(await cvs.restoreBackup(plan)).toEqual({ restored: 1, skipped: 1, replaced: 1 })
    expect(saved.get('changed')!.meta.title).toBe('Después')
    expect(saved.get('new')!.meta).toMatchObject({ id: 'new', title: 'Nuevo', updatedAt: '2026-01-01T00:00:00.000Z' })
    expect(saved.get('same')!.meta.updatedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(cvs.documents.map((d) => d.id).sort()).toEqual(['changed', 'new', 'same'])
  })

  it('stores a restored photo as a blob, and drops the replaced CV’s old one', async () => {
    store(cv('a', 'Uno'), new Blob(['old'], { type: 'image/png' }))
    store(cv('b', 'Dos'), new Blob(['gone'], { type: 'image/png' }))
    const oldA = saved.get('a')!.personal.photo!
    const oldB = saved.get('b')!.personal.photo!
    const cvs = useCvStore()
    await cvs.init()

    await cvs.restoreBackup({ added: [], same: [], changed: [cv('a', 'Uno', PIXEL), cv('b', 'Dos sin foto')] })
    const newA = saved.get('a')!.personal.photo!
    expect(newA).toMatch(/^photo:a:/)
    expect(photos.has(newA)).toBe(true)
    expect(photos.has(oldA)).toBe(false)
    expect(saved.get('b')!.personal.photo).toBeUndefined()
    expect(photos.has(oldB)).toBe(false)
  })

  it('reopens the open CV when the backup replaces it', async () => {
    store(cv('a', 'Abierto'))
    const cvs = useCvStore()
    await cvs.init()
    expect(cvs.data.meta.title).toBe('Abierto')
    await cvs.restoreBackup({ added: [], same: [], changed: [cv('a', 'De la copia')] })
    expect(cvs.data.meta.title).toBe('De la copia')
    expect(cvs.canUndo).toBe(false)
  })
})
