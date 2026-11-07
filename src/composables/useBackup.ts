import { ref } from 'vue'
import { useCvStore } from '@/stores/cv'
import { exportBackup } from '@/services/export'
import { useUiStore } from '@/stores/ui'

/**
 * "Back up all CVs" (spec 078): every CV in one file, and the day it was made remembered, so the
 * reminder knows when the last copy is from. One call at a time.
 */
export function useBackup() {
  const cv = useCvStore()
  const ui = useUiStore()
  const busy = ref(false)
  const failed = ref(false)

  async function backUp() {
    if (busy.value) return
    busy.value = true
    failed.value = false
    try {
      const now = new Date()
      await exportBackup(await cv.loadAll(), now)
      ui.recordBackup(now)
    } catch {
      failed.value = true
    } finally {
      busy.value = false
    }
  }

  return { busy, failed, backUp }
}
