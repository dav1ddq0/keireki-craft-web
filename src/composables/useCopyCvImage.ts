import { onBeforeUnmount, ref } from 'vue'
import { useCvStore } from '@/stores/cv'
import { printTitle } from '@/services/export'

export type CopyState = 'idle' | 'copying' | 'copied' | 'failed'

/** Whether this browser can put an image on the clipboard (the async Clipboard API with PNG). */
export function canCopyImages(): boolean {
  if (typeof ClipboardItem === 'undefined' || typeof navigator === 'undefined' || !navigator.clipboard?.write) return false
  return typeof ClipboardItem.supports === 'function' ? ClipboardItem.supports('image/png') : true
}

/** How long "Copied" or the failure stays before the button goes back to rest. */
const SETTLE_MS = { copied: 2000, failed: 4000 }
/** A failure that offers Share stays longer: the user has to read it and tap. */
const SHAREABLE_MS = 15000

/**
 * On a touch screen the picture for the clipboard is built at 144 dpi instead of the export's 192:
 * under half the pixels. A phone builds it several times slower than a laptop, and Safari on iOS
 * gives up on the copy when the picture takes too long. Still sharp for pasting in a chat.
 */
export const TOUCH_COPY_DPI = 144

function onTouchScreen(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
}

/** Whether the system share sheet can take this file (phones and tablets, mostly). */
function canShareFile(file: File): boolean {
  return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
}

/**
 * Copies the open CV to the clipboard as an image (spec 062): the JPG export's picture, as PNG,
 * the only image type browsers accept there. `clipboard.write` is called at once with the image
 * still to come (a promise), so Safari keeps the click as the user's gesture while it is built.
 *
 * When the copy fails where files can be shared, the picture already built is kept as `shareable`:
 * a tap on Share opens the system sheet at once (which on an iPhone offers Copy and Save Image).
 * It cannot open by itself after the failure: sharing also needs a recent tap.
 */
export function useCopyCvImage() {
  const cv = useCvStore()
  const state = ref<CopyState>('idle')
  const shareable = ref<File | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  function settle(next: 'copied' | 'failed', ms = SETTLE_MS[next]) {
    state.value = next
    clearTimeout(timer)
    timer = setTimeout(() => {
      state.value = 'idle'
      shareable.value = null
    }, ms)
  }

  async function copy(): Promise<void> {
    if (state.value === 'copying') return
    clearTimeout(timer)
    shareable.value = null
    state.value = 'copying'
    const dpi = onTouchScreen() ? TOUCH_COPY_DPI : undefined
    const image = (async () => {
      // Autosave is debounced; flushing first means the picture matches what is stored.
      await cv.flush()
      const { buildCvImage } = await import('@/services/export/image')
      return buildCvImage(cv.data, cv.templateId, 'image/png', dpi)
    })()
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })])
      settle('copied')
    } catch (error) {
      console.warn('[export] the CV image could not be copied', error)
      shareable.value = await image
        .then((blob) => new File([blob], `${printTitle(cv.data)}.png`, { type: 'image/png' }))
        .then((file) => (canShareFile(file) ? file : null))
        .catch(() => null)
      settle('failed', shareable.value ? SHAREABLE_MS : SETTLE_MS.failed)
    }
  }

  /** Opens the system share sheet with the picture the failed copy built. */
  async function share(): Promise<void> {
    const file = shareable.value
    if (!file) return
    try {
      await navigator.share({ files: [file] })
    } catch (error) {
      // Closing the sheet is not an error worth reporting.
      if ((error as DOMException)?.name !== 'AbortError') console.warn('[export] the CV image could not be shared', error)
    }
    clearTimeout(timer)
    state.value = 'idle'
    shareable.value = null
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return { state, shareable, copy, share }
}
