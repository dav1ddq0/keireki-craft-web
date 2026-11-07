import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { readPrefs, writePrefs } from '@/services/prefs'
import { snoozeUntil, type BackupState } from '@/core/backupReminder'
import { isStorageAvailable, requestPersistence } from '@/services/storage'
import { DARK_QUERY, resolveTheme, systemPrefersDark, type ThemeChoice } from '@/core/theme'
import { withViewTransition } from '@/core/viewTransition'

export const STEPS = [
  'personal',
  'summary',
  'experience',
  'education',
  'skills',
  'languages',
  'custom',
  'style',
  'export',
] as const

export type StepId = (typeof STEPS)[number]
export type View = 'editor' | 'documents' | 'import' | 'welcome'

export const useUiStore = defineStore('ui', () => {
  const prefs = readPrefs()

  const view = ref<View>('editor')
  const step = ref<StepId>('personal')
  const theme = ref<ThemeChoice>(prefs.theme)
  /** Live OS preference; only matters while the choice is `system`. */
  const systemDark = ref(systemPrefersDark())
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    window.matchMedia(DARK_QUERY).addEventListener('change', (event) => {
      systemDark.value = event.matches
      if (theme.value === 'system') applyTheme()
    })
  }
  const resolvedTheme = computed(() => resolveTheme(theme.value, systemDark.value))
  const previewOpen = ref(false)
  /** Desktop: the preview takes the whole editor (spec 030). Session state, never stored. */
  const previewExpanded = ref(false)
  watch(view, (next) => {
    if (next !== 'editor') previewExpanded.value = false
  })
  const dismissedNotices = ref<string[]>(prefs.dismissedNotices)

  /** What the backup reminder needs (spec 078), kept here so a backup made anywhere hides it everywhere. */
  const backup = ref<BackupState>({
    lastBackupAt: prefs.lastBackupAt,
    snoozedUntil: prefs.backupSnoozedUntil,
    watchSince: prefs.backupWatchSince ?? new Date().toISOString(),
  })
  if (!prefs.backupWatchSince) writePrefs({ backupWatchSince: backup.value.watchSince })

  /** Environment facts surfaced as notices (spec §8.2). */
  const storageAvailable = ref(true)
  const storagePersisted = ref(true)

  const stepIndex = computed(() => STEPS.indexOf(step.value))

  function goTo(next: StepId) {
    step.value = next
    view.value = 'editor'
    // Going to a step means editing it: its form comes back.
    previewExpanded.value = false
  }

  /** The mobile Edit / Preview switch and the desktop full-width preview animate as one View Transition (spec 048). */
  function setPreviewOpen(open: boolean) {
    if (previewOpen.value !== open) withViewTransition(() => (previewOpen.value = open))
  }

  function setPreviewExpanded(expanded: boolean) {
    if (previewExpanded.value !== expanded) withViewTransition(() => (previewExpanded.value = expanded))
  }

  function nextStep() {
    const at = stepIndex.value
    if (at < STEPS.length - 1) step.value = STEPS[at + 1]
  }

  function prevStep() {
    const at = stepIndex.value
    if (at > 0) step.value = STEPS[at - 1]
  }

  function applyTheme() {
    document.documentElement.dataset.theme = resolvedTheme.value
    // The status bar and Chrome's toolbar take the page colour of the theme in use (spec 029).
    const colour = getComputedStyle(document.body).backgroundColor
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = colour
  }

  function setTheme(next: ThemeChoice) {
    theme.value = next
    writePrefs({ theme: next })
    applyTheme()
  }

  function recordBackup(at = new Date()) {
    backup.value = { ...backup.value, lastBackupAt: at.toISOString(), snoozedUntil: null }
    writePrefs({ lastBackupAt: backup.value.lastBackupAt, backupSnoozedUntil: null })
  }

  /** "Not now": the reminder comes back in seven days. */
  function snoozeBackupReminder(now = new Date()) {
    backup.value = { ...backup.value, snoozedUntil: snoozeUntil(now) }
    writePrefs({ backupSnoozedUntil: backup.value.snoozedUntil })
  }

  function dismissNotice(id: string) {
    if (dismissedNotices.value.includes(id)) return
    dismissedNotices.value = [...dismissedNotices.value, id]
    writePrefs({ dismissedNotices: dismissedNotices.value })
  }

  const isDismissed = (id: string) => dismissedNotices.value.includes(id)

  /**
   * Whether storage works is awaited (the app needs the answer to start); whether it is persistent is
   * not: Firefox answers `persist()` only when the person answers its permission prompt, and waiting
   * for that left the stored CVs unopened until then (spec 052).
   */
  async function probeEnvironment() {
    storageAvailable.value = await isStorageAvailable()
    if (!storageAvailable.value) {
      storagePersisted.value = false
      return
    }
    void requestPersistence().then((persisted) => {
      storagePersisted.value = persisted
    })
  }

  return {
    view,
    step,
    stepIndex,
    steps: STEPS,
    theme,
    resolvedTheme,
    previewOpen,
    previewExpanded,
    storageAvailable,
    storagePersisted,
    goTo,
    setPreviewOpen,
    setPreviewExpanded,
    nextStep,
    prevStep,
    setTheme,
    dismissNotice,
    isDismissed,
    backup,
    recordBackup,
    snoozeBackupReminder,
    probeEnvironment,
  }
})
