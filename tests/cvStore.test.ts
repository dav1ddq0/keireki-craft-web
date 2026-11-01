import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { CVData, CVSummary } from '@/types/cv'
import { applyTemplateDefaults } from '@/templates/registry'

/**
 * The store is tested against an in-memory adapter: these tests are about
 * history and autosave coordination, not about IndexedDB.
 */
const saved = new Map<string, CVData>()
const photos = new Map<string, Blob>()
let photoVersion = 0

vi.mock('@/services/storage', () => ({
  savePhoto: async (cvId: string, blob: Blob, previous?: string) => {
    const key = `photo:${cvId}:${++photoVersion}`
    photos.set(key, blob)
    if (previous) photos.delete(previous)
    return key
  },
  storage: {
    list: async (): Promise<CVSummary[]> => [],
    load: async (id: string) => saved.get(id)!,
    save: async (data: CVData) => void saved.set(data.meta.id, structuredClone(data)),
    delete: async (id: string) => void saved.delete(id),
  },
  NotFoundError: class NotFoundError extends Error {},
  StorageQuotaError: class StorageQuotaError extends Error {},
}))

/** This file runs without a DOM, so preferences live in memory too. */
let prefs: Record<string, unknown> = {}
vi.mock('@/services/prefs', () => ({
  readPrefs: () => ({ lastTemplateId: 'classic', lastCvId: null, ...prefs }),
  writePrefs: (patch: Record<string, unknown>) => void (prefs = { ...prefs, ...patch }),
}))

const { useCvStore } = await import('@/stores/cv')

/** Lets pending watchers and awaited microtasks settle. */
const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

/** Simulates a pause long enough to close an undo step and fire an autosave. */
async function idle(ms: number) {
  await vi.advanceTimersByTimeAsync(ms)
  await settle()
}

describe('cv store history', () => {
  beforeEach(() => {
    saved.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('records one undo step per editing burst', async () => {
    const cv = useCvStore()

    cv.data.personal.fullName = 'Ada'
    await idle(1500)
    cv.data.personal.email = 'ada@example.com'
    await idle(1500)
    cv.data.summary = 'Resumen'
    await idle(1500)

    expect(cv.canUndo).toBe(true)

    cv.undo()
    await settle()
    expect(cv.data.summary).toBe('')
    expect(cv.data.personal.email).toBe('ada@example.com')

    cv.undo()
    await settle()
    expect(cv.data.personal.email).toBe('')
    expect(cv.data.personal.fullName).toBe('Ada')
  })

  it('undoes a change of the CV language like any other edit', async () => {
    const cv = useCvStore()
    expect(cv.data.meta.language).toBe('es')

    cv.data.meta.language = 'en'
    await idle(1500)
    expect(cv.canUndo).toBe(true)

    cv.undo()
    await settle()
    expect(cv.data.meta.language).toBe('es')

    cv.redo()
    await settle()
    expect(cv.data.meta.language).toBe('en')
  })

  it('enables the undo button as soon as a step is recorded', async () => {
    const cv = useCvStore()
    expect(cv.canUndo).toBe(false)

    cv.data.personal.fullName = 'Ada'
    await idle(1500)

    expect(cv.canUndo).toBe(true)
  })

  it('keeps more than 20 steps of history', async () => {
    const cv = useCvStore()

    for (let i = 0; i < 25; i++) {
      cv.data.summary = `version ${i}`
      await idle(1500)
    }

    let steps = 0
    while (cv.canUndo && steps < 40) {
      cv.undo()
      await settle()
      steps++
    }

    expect(steps).toBeGreaterThanOrEqual(20)
  })

  it('does nothing when undoing past the first recorded state', async () => {
    const cv = useCvStore()
    cv.data.personal.fullName = 'Ada'
    await idle(1500)

    cv.undo()
    await settle()
    const atBase = JSON.stringify(cv.data)

    cv.undo()
    cv.undo()
    await settle()

    expect(JSON.stringify(cv.data)).toBe(atBase)
    // Undoing past the base must not destroy the redo stack.
    expect(cv.canRedo).toBe(true)

    cv.redo()
    await settle()
    expect(cv.data.personal.fullName).toBe('Ada')
  })

  it('autosaves without re-triggering itself', async () => {
    const cv = useCvStore()
    cv.data.personal.fullName = 'Ada'
    await idle(1500)

    const writes = saved.size
    const stamp = saved.get(cv.data.meta.id)?.meta.updatedAt

    // With no further edits, idling must not produce another write.
    await idle(5000)

    expect(saved.size).toBe(writes)
    expect(saved.get(cv.data.meta.id)?.meta.updatedAt).toBe(stamp)
  })
})

describe('per-CV template (spec 021)', () => {
  beforeEach(() => {
    saved.clear()
    prefs = {}
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('stores the pick in the open CV, autosaves it and undoes it like any edit', async () => {
    const cv = useCvStore()
    expect(cv.templateId).toBe('classic')

    cv.setTemplate('meridian')
    await idle(1500)
    expect(saved.get(cv.data.meta.id)?.meta.templateId).toBe('meridian')

    cv.undo()
    await settle()
    expect(cv.templateId).toBe('classic')
  })

  it('chooses a template from a gallery: its defaults come with it, as in the style step (spec 064)', () => {
    const cv = useCvStore()
    const before = { ...cv.data.style }
    cv.chooseTemplate('meridian')
    expect(cv.templateId).toBe('meridian')
    expect(cv.data.style).toEqual(applyTemplateDefaults('meridian', before))
  })

  it('switches to the template of the CV being opened', async () => {
    const cv = useCvStore()
    cv.setTemplate('meridian')
    await idle(1500)
    const first = cv.data.meta.id

    await cv.createNew()
    cv.setTemplate('aurora')
    await idle(1500)
    expect(cv.templateId).toBe('aurora')

    await cv.open(first)
    expect(cv.templateId).toBe('meridian')
  })

  it('starts a new CV in the last template picked, and a duplicate in its source template', async () => {
    const cv = useCvStore()
    cv.setTemplate('meridian')
    await idle(1500)
    const source = cv.data.meta.id

    await cv.createNew()
    expect(cv.templateId).toBe('meridian')

    const copy = await cv.duplicate(source)
    expect(saved.get(copy)?.meta.templateId).toBe('meridian')
  })
})

describe('cv store custom sections (spec 028)', () => {
  beforeEach(() => {
    saved.clear()
    setActivePinia(createPinia())
  })

  it('adds a section to the order and removes it from order and page breaks alike', () => {
    const cv = useCvStore()
    cv.addCustomSection()
    const id = cv.data.customSections.at(-1)!.id
    expect(cv.data.sectionOrder.at(-1)).toBe(id)

    cv.setPageBreak(id, true)
    expect(cv.data.pageBreaks).toEqual([id])

    cv.removeCustomSection(id)
    expect(cv.data.customSections.some((section) => section.id === id)).toBe(false)
    expect(cv.data.sectionOrder).not.toContain(id)
    expect(cv.data.pageBreaks).toEqual([])
  })

  it('keeps page breaks in section order whatever order they are set in', () => {
    const cv = useCvStore()
    const [first, second] = cv.data.sectionOrder.slice(1, 3) as [string, string]
    cv.setPageBreak(second, true)
    cv.setPageBreak(first, true)
    expect(cv.data.pageBreaks).toEqual([first, second])
    cv.setPageBreak(second, false)
    expect(cv.data.pageBreaks).toEqual([first])
  })
})

describe('an inline photo is stored as a blob (spec 037)', () => {
  // A 1×1 PNG, as an exported JSON file carries it.
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
  const withPhoto = (photo: string) => {
    const cv = useCvStore()
    const incoming: CVData = JSON.parse(JSON.stringify(cv.data))
    incoming.personal.photo = photo
    return incoming
  }
  const bytes = async (blob: Blob | undefined) => [...new Uint8Array(await blob!.arrayBuffer())]
  const pngBytes = async () => bytes(await (await fetch(PNG)).blob())

  beforeEach(() => {
    saved.clear()
    photos.clear()
    setActivePinia(createPinia())
  })

  it('stores the photo of an imported JSON file under the new CV and keeps only its reference', async () => {
    const cv = useCvStore()
    await cv.importData(withPhoto(PNG), 'new')

    const reference = cv.data.personal.photo!
    expect(reference.startsWith(`photo:${cv.data.meta.id}:`)).toBe(true)
    expect(photos.get(reference)?.type).toBe('image/png')
    expect(await bytes(photos.get(reference))).toEqual(await pngBytes())
    expect(saved.get(cv.data.meta.id)?.personal.photo).toBe(reference)
  })

  it('replaces the open CV photo when importing over it', async () => {
    const cv = useCvStore()
    await cv.importData(withPhoto(PNG), 'new')
    const first = cv.data.personal.photo!

    await cv.importData(withPhoto(PNG), 'current')
    expect(cv.data.personal.photo).not.toBe(first)
    expect(photos.has(cv.data.personal.photo!)).toBe(true)
    expect(photos.has(first)).toBe(false)
  })

  it('moves the inline photo of a CV stored before the fix when it is opened', async () => {
    const cv = useCvStore()
    const old = withPhoto(PNG)
    saved.set(old.meta.id, old)

    await cv.open(old.meta.id)
    const reference = cv.data.personal.photo!
    expect(reference.startsWith('photo:')).toBe(true)
    expect(saved.get(old.meta.id)?.personal.photo).toBe(reference)
    expect(await bytes(photos.get(reference))).toEqual(await pngBytes())
  })

  it('leaves a stored photo reference alone', async () => {
    const cv = useCvStore()
    await cv.importData(withPhoto('photo:cv-x:1'), 'new')
    expect(cv.data.personal.photo).toBe('photo:cv-x:1')
    expect(photos.size).toBe(0)
  })
})
