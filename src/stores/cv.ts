import { defineStore } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'
import type { CustomSection, CVData, CVSummary } from '@/types/cv'
import { SECTION_IDS } from '@/types/cv'
import { createCustomSection, createEmptyCV } from '@/core/factory'
import { uid } from '@/core/id'
import { History } from '@/core/history'
import { debounce } from '@/core/debounce'
import { migrate, reconcileOrder } from '@/core/migrations'
import { deletePhoto, NotFoundError, savePhoto, storage, StorageQuotaError } from '@/services/storage'
import { dataUrlToBlob, toExportableJson } from '@/services/export/json'
import { readPrefs, writePrefs } from '@/services/prefs'
import { applyTemplateDefaults } from '@/templates/registry'

const AUTOSAVE_MS = 500
/** Edits closer together than this collapse into a single undo step. */
const HISTORY_COALESCE_MS = 600

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/** What restoring a backup would do to each of its CVs (spec 078), worked out before anything is written. */
export interface RestorePlan {
  /** Not in this browser: restored as they were. */
  added: CVData[]
  /** Here and the same: left alone. */
  same: CVData[]
  /** Here but different: replaced by the backup's version, once the person confirms. */
  changed: CVData[]
}

export const useCvStore = defineStore('cv', () => {
  const data = ref<CVData>(createEmptyCV())
  const documents = ref<CVSummary[]>([])
  const saveState = ref<SaveState>('idle')
  const saveError = ref<string | null>(null)

  const history = new History<string>(30)
  const canUndo = ref(false)
  const canRedo = ref(false)
  /** Suppresses history + autosave while we are the ones rewriting `data`. */
  let suspended = false
  let lastCommitted = snapshot()

  /**
   * Applies a mutation the user did not make.
   *
   * The deep watcher below reacts to any change inside `data`, so writing to it
   * from our own code would look exactly like an edit. `suspended` is cleared in
   * a microtask queued *after* the watcher's own job, so the watcher sees the
   * flag and skips, then normal tracking resumes.
   */
  function withoutTracking(mutate: () => void) {
    suspended = true
    mutate()
    queueMicrotask(() => {
      suspended = false
    })
  }

  /* ---- persistence ----------------------------------------------------- */

  const persist = debounce(async () => {
    saveState.value = 'saving'
    try {
      // The timestamp is stamped on the outgoing copy, never on `data` itself:
      // writing it back into the watched object would retrigger this watcher,
      // which would in turn reset the history timer on every autosave and leave
      // the undo stack permanently empty.
      const stamp = new Date().toISOString()
      const payload = toPlain(data.value)
      payload.meta.updatedAt = stamp
      await storage.save(payload)
      withoutTracking(() => {
        data.value.meta.updatedAt = stamp
      })
      saveState.value = 'saved'
      saveError.value = null
      await refreshDocuments()
    } catch (error) {
      saveState.value = 'error'
      saveError.value = error instanceof StorageQuotaError ? 'quota' : 'unknown'
    }
  }, AUTOSAVE_MS)

  const commitHistory = debounce(() => {
    const next = snapshot()
    if (next === lastCommitted) return
    history.push(lastCommitted)
    lastCommitted = next
    syncHistoryFlags()
  }, HISTORY_COALESCE_MS)

  watch(
    data,
    () => {
      if (suspended) return
      commitHistory()
      persist()
    },
    { deep: true },
  )

  /** Forces any pending autosave/history write to land — call before export or unload. */
  async function flush() {
    commitHistory.flush()
    persist.flush()
    await Promise.resolve()
  }

  /* ---- document lifecycle ---------------------------------------------- */

  async function refreshDocuments() {
    documents.value = await storage.list()
  }

  async function init() {
    await refreshDocuments()
    const lastId = readPrefs().lastCvId
    const target = lastId && documents.value.some((d) => d.id === lastId) ? lastId : documents.value[0]?.id
    if (target) await open(target)
    else await createNew({ persistNow: false })
  }

  async function open(id: string) {
    try {
      const loaded = await storage.load(id)
      // A CV imported before spec 037 was stored with its photo inline; it moves to a blob once.
      // If that cannot be stored (no space left), the CV still opens as it was.
      const moved = await storeInlinePhoto(loaded).catch(() => false)
      replaceData(loaded)
      writePrefs({ lastCvId: id })
      if (moved) {
        persist()
        persist.flush()
      }
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error
      await createNew()
    }
  }

  async function createNew(options: { persistNow?: boolean; seed?: Partial<CVData> } = {}) {
    const { persistNow = true, seed } = options
    const next = createEmptyCV(seed)
    // A new CV starts in the template picked last, like the global template did before spec 021.
    next.meta.templateId = readPrefs().lastTemplateId
    replaceData(next)
    writePrefs({ lastCvId: data.value.meta.id })
    if (persistNow) {
      persist()
      persist.flush()
    }
  }

  async function duplicate(id: string) {
    const source = await storage.load(id)
    const copy = structuredClone(source)
    copy.meta = {
      ...copy.meta,
      id: createEmptyCV().meta.id,
      title: `${copy.meta.title} (2)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    // The photo blob stays under the original key; a duplicate referencing it
    // would lose its picture when the original is deleted.
    delete copy.personal.photo
    await storage.save(copy)
    await refreshDocuments()
    return copy.meta.id
  }

  /**
   * Renames a CV from My CVs (spec 073). The open one changes like any edit (autosave, undo); another
   * one is changed in storage. A name that is only spaces is not saved.
   */
  async function rename(id: string, title: string) {
    const next = title.trim()
    if (!next) return
    if (id === data.value.meta.id) {
      data.value.meta.title = next
      await nextTick()
      await flush()
      return
    }
    const stored = await storage.load(id)
    stored.meta = { ...stored.meta, title: next, updatedAt: new Date().toISOString() }
    await storage.save(stored)
    await refreshDocuments()
  }

  async function remove(id: string) {
    await storage.delete(id)
    await refreshDocuments()
    if (data.value.meta.id !== id) return
    const next = documents.value[0]?.id
    if (next) await open(next)
    else await createNew({ persistNow: false })
  }

  /* ---- backup (spec 078) ------------------------------------------------- */

  /** Every stored CV, the open one with its latest edit: what a backup holds. */
  async function loadAll(): Promise<CVData[]> {
    await flush()
    return Promise.all(documents.value.map((summary) => storage.load(summary.id)))
  }

  /**
   * Sorts a backup's CVs by what restoring would do. Compared as their JSON export writes them (photo
   * inlined) and without `updatedAt`, so restoring a backup just made finds nothing to change.
   */
  async function planRestore(cvs: CVData[]): Promise<RestorePlan> {
    await flush()
    const plan: RestorePlan = { added: [], same: [], changed: [] }
    for (const cv of cvs) {
      if (!documents.value.some((summary) => summary.id === cv.meta.id)) {
        plan.added.push(cv)
        continue
      }
      const stored = await storage.load(cv.meta.id)
      const same = comparable(JSON.parse(await toExportableJson(stored))) === comparable(cv)
      plan[same ? 'same' : 'changed'].push(cv)
    }
    return plan
  }

  /**
   * Writes a plan: added and changed CVs are stored as the backup has them (a changed one's old photo
   * goes), identical ones are left alone. If the open CV is replaced, the editor reopens it.
   */
  async function restoreBackup(plan: RestorePlan) {
    const openId = data.value.meta.id
    for (const cv of plan.added) await storeRestored(cv)
    for (const cv of plan.changed) {
      const previous = (await storage.load(cv.meta.id)).personal.photo
      await storeRestored(cv, previous)
    }
    await refreshDocuments()
    if (plan.changed.some((cv) => cv.meta.id === openId)) await open(openId)
    return { restored: plan.added.length, skipped: plan.same.length, replaced: plan.changed.length }
  }

  async function storeRestored(cv: CVData, previousPhoto?: string) {
    const next = structuredClone(cv)
    next.sectionOrder = reconcileOrder(next.sectionOrder, next)
    const stored = await storeInlinePhoto(next, previousPhoto)
    if (!stored && previousPhoto?.startsWith('photo:')) await deletePhoto(previousPhoto).catch(() => {})
    await storage.save(next)
  }

  /** Replaces the whole document without polluting the undo stack of the old one. */
  function replaceData(next: CVData) {
    persist.cancel()
    commitHistory.cancel()
    withoutTracking(() => {
      data.value = next
    })
    history.clear()
    lastCommitted = snapshot()
    syncHistoryFlags()
    saveState.value = 'idle'
    saveError.value = null
  }

  /**
   * Brings imported data in, either as a new document or over the open one.
   *
   * "New" issues a fresh id so importing the same file twice never silently
   * overwrites an earlier import; "current" keeps the open document's identity
   * so the CV list entry and its photo reference stay valid.
   */
  async function importData(incoming: CVData, mode: 'new' | 'current') {
    const merged = migrate(incoming)
    merged.sectionOrder = reconcileOrder(merged.sectionOrder, merged)
    const now = new Date().toISOString()

    if (mode === 'new') {
      merged.meta = { ...merged.meta, id: uid('cv'), createdAt: now, updatedAt: now }
      await storeInlinePhoto(merged)
      replaceData(merged)
      writePrefs({ lastCvId: merged.meta.id })
      persist()
      persist.flush()
      return
    }

    merged.meta = {
      ...merged.meta,
      id: data.value.meta.id,
      createdAt: data.value.meta.createdAt,
      updatedAt: now,
    }
    await storeInlinePhoto(merged, data.value.personal.photo)
    commitHistory.flush()
    data.value = merged
  }

  /**
   * An imported JSON file carries the photo inline, as a data URL. It is stored as a blob like an
   * uploaded one, so the preview and the thumbnail can show it and the undo snapshots stay small
   * (spec 037). `previous` is the photo it replaces. Returns whether there was one to store.
   */
  async function storeInlinePhoto(next: CVData, previous?: string): Promise<boolean> {
    const photo = next.personal.photo
    if (!photo?.startsWith('data:')) return false
    next.personal.photo = await savePhoto(next.meta.id, await dataUrlToBlob(photo), previous)
    return true
  }

  /* ---- template -------------------------------------------------------- */

  /** The open CV's template (spec 021); `getTemplate` resolves an unknown id to the default. */
  const templateId = computed(() => data.value.meta.templateId)

  /** An edit like any other (autosaved, undoable); the pick is also remembered for new CVs. */
  function setTemplate(id: string) {
    data.value.meta.templateId = id
    writePrefs({ lastTemplateId: id })
  }

  /**
   * Picking a template from a gallery (the style step, the phone's template sheet, spec 064): it
   * also adopts the template's accent and face, but only while the user has not chosen their own.
   * `applyTemplateDefaults` decides that; once someone sets a custom accent, switching never
   * overwrites it again.
   */
  function chooseTemplate(id: string) {
    setTemplate(id)
    data.value.style = applyTemplateDefaults(id, data.value.style)
  }

  /* ---- custom sections ------------------------------------------------- */

  // `sectionOrder` and `pageBreaks` list custom sections by id, so adding or removing one has to touch
  // all three fields at once (spec 028). Field edits inside a section stay plain `v-model`s.

  function addCustomSection(section: CustomSection = createCustomSection('')) {
    data.value.customSections.push(section)
    data.value.sectionOrder = reconcileOrder(data.value.sectionOrder, data.value)
  }

  function removeCustomSection(id: string) {
    const d = data.value
    d.customSections = d.customSections.filter((section) => section.id !== id)
    d.sectionOrder = d.sectionOrder.filter((sectionId) => sectionId !== id)
    d.pageBreaks = d.pageBreaks.filter((sectionId) => sectionId !== id)
  }

  /** Kept in section order, like `sectionOrder` itself (spec 022). */
  function setPageBreak(id: string, on: boolean) {
    const breaks = new Set(data.value.pageBreaks)
    if (on) breaks.add(id)
    else breaks.delete(id)
    data.value.pageBreaks = data.value.sectionOrder.filter((sectionId) => breaks.has(sectionId))
  }

  /* ---- undo / redo ----------------------------------------------------- */

  function undo() {
    commitHistory.flush()
    const previous = history.undo(snapshot())
    if (previous === undefined) return
    restore(previous)
  }

  function redo() {
    const next = history.redo(snapshot())
    if (next === undefined) return
    restore(next)
  }

  function restore(json: string) {
    withoutTracking(() => {
      data.value = JSON.parse(json) as CVData
    })
    lastCommitted = json
    syncHistoryFlags()
    // The restored state still has to reach storage, but as our write, not as
    // a user edit: scheduling it directly keeps it out of the history.
    persist()
  }

  function snapshot(): string {
    return JSON.stringify(toPlain(data.value))
  }

  function syncHistoryFlags() {
    canUndo.value = history.canUndo
    canRedo.value = history.canRedo
  }

  /* ---- derived --------------------------------------------------------- */

  const filledSections = computed(() => {
    const d = data.value
    return [
      Boolean(d.personal.fullName.trim()),
      Boolean(d.summary.trim()),
      d.experience.length > 0,
      d.education.length > 0,
      d.skills.length > 0,
      d.languages.length > 0,
    ].filter(Boolean).length
  })

  const totalSections = SECTION_IDS.length + 1

  return {
    data,
    documents,
    saveState,
    saveError,
    canUndo,
    canRedo,
    filledSections,
    totalSections,
    templateId,
    setTemplate,
    chooseTemplate,
    addCustomSection,
    removeCustomSection,
    setPageBreak,
    init,
    open,
    createNew,
    duplicate,
    loadAll,
    planRestore,
    restoreBackup,
    rename,
    remove,
    refreshDocuments,
    importData,
    replaceData,
    undo,
    redo,
    flush,
  }
})

/** A CV as text with its keys in order and without `updatedAt`: equal text, same content. */
function comparable(cv: CVData): string {
  const { updatedAt: _updatedAt, ...meta } = cv.meta
  return JSON.stringify({ ...cv, meta }, (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
      : value,
  )
}

/** Strips Vue proxies so the value is safe for `structuredClone` and IndexedDB. */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
