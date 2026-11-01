import { onBeforeUnmount, ref } from 'vue'
import { useCvStore } from '@/stores/cv'

export type CopyState = 'idle' | 'copying' | 'copied' | 'failed'

/** Whether this browser can put an image on the clipboard (the async Clipboard API with PNG). */
export function canCopyImages(): boolean {
  if (typeof ClipboardItem === 'undefined' || typeof navigator === 'undefined' || !navigator.clipboard?.write) return false
  return typeof ClipboardItem.supports === 'function' ? ClipboardItem.supports('image/png') : true
}

/** How long "Copied" or the failure stays before the button goes back to rest. */
const SETTLE_MS = { copied: 2000, failed: 4000 }

/**
 * Copies the open CV to the clipboard as an image (spec 062): the JPG export's picture, as PNG,
 * the only image type browsers accept there. `clipboard.write` is called at once with the image
 * still to come (a promise), so Safari keeps the click as the user's gesture while it is built.
 */
export function useCopyCvImage() {
  const cv = useCvStore()
  const state = ref<CopyState>('idle')
  let timer: ReturnType<typeof setTimeout> | undefined

  function settle(next: 'copied' | 'failed') {
    state.value = next
    clearTimeout(timer)
    timer = setTimeout(() => (state.value = 'idle'), SETTLE_MS[next])
  }

  async function copy(): Promise<void> {
    if (state.value === 'copying') return
    clearTimeout(timer)
    state.value = 'copying'
    const image = (async () => {
      // Autosave is debounced; flushing first means the picture matches what is stored.
      await cv.flush()
      const { buildCvImage } = await import('@/services/export/image')
      return buildCvImage(cv.data, cv.templateId, 'image/png')
    })()
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })])
      settle('copied')
    } catch (error) {
      console.warn('[export] the CV image could not be copied', error)
      settle('failed')
    }
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return { state, copy }
}
