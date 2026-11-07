import { ref, watch } from 'vue'
import { useCvStore } from '@/stores/cv'
import { useUiStore } from '@/stores/ui'
import { useI18n } from '@/i18n'
import { debounce, type Debounced } from '@/core/debounce'
import { buildBackup } from '@/services/export/backup'
import {
  chooseFolder,
  folderState,
  folderSupported,
  FolderUnavailableError,
  forgetFolder,
  resumeFolder,
  writeBackupToFolder,
  type FolderState,
} from '@/services/storage/folder'

/** A pause this long after the last save, then one write: typing writes once per pause. */
export const FOLDER_WRITE_DELAY_MS = 3000

/* One folder for the whole app: Preferences, the menu and the paused notice read the same state. */
const state = ref<FolderState | 'unsupported'>('unsupported')
const name = ref<string | null>(null)
const lastWrittenAt = ref<string | null>(null)
let scheduled: Debounced<[]> | undefined

/**
 * The backup folder (spec 079): after each save, the backup of every CV is written to the chosen
 * folder; each write counts as a backup. If the folder cannot be written to, it pauses; the CVs are
 * saved in the browser all the same.
 */
export function useBackupFolder() {
  const cv = useCvStore()
  const ui = useUiStore()
  const { locale } = useI18n()

  async function refresh() {
    if (!folderSupported()) {
      state.value = 'unsupported'
      return
    }
    const current = await folderState()
    state.value = current.state
    name.value = current.name ?? null
  }

  async function writeNow() {
    if (state.value !== 'ready') return
    try {
      const at = new Date()
      const backup = await buildBackup(await cv.loadAll(), at)
      await writeBackupToFolder(JSON.stringify(backup, null, 2), at, locale.value)
      lastWrittenAt.value = at.toISOString()
      ui.recordBackup(at)
    } catch (error) {
      if (error instanceof FolderUnavailableError) state.value = error.state
    }
  }

  /** Once, at start-up: reads the folder's state and writes after every change to the CVs. */
  function start() {
    if (scheduled) return
    scheduled = debounce(() => void writeNow(), FOLDER_WRITE_DELAY_MS)
    void refresh()
    watch(
      () => cv.documents,
      () => scheduled?.(),
    )
  }

  /** "Choose folder…" (it needs the click): from then on, every save is copied there. */
  async function choose() {
    try {
      name.value = await chooseFolder()
    } catch {
      return // the picker was closed without a choice
    }
    await refresh()
    await writeNow()
  }

  /** "Stop saving": the folder is forgotten; its files stay. */
  async function stop() {
    await forgetFolder()
    lastWrittenAt.value = null
    await refresh()
  }

  /** "Resume" (it needs the click): asks for access again, and writes at once if granted. */
  async function resume() {
    await resumeFolder()
    await refresh()
    await writeNow()
  }

  return { state, name, lastWrittenAt, start, choose, stop, resume, refresh }
}
