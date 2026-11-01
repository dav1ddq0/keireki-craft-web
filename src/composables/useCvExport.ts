import { ref } from 'vue'
import { useCvStore } from '@/stores/cv'
import { downloadBlob, exportHtml, exportJson, printCv, printTitle } from '@/services/export'

/** `pdfFile` downloads the PDF directly (spec 031); `pdf` goes through the print dialog; `jpg` is the CV as an image (spec 062). */
export type ExportKind = 'pdfFile' | 'pdf' | 'jpg' | 'html' | 'json'

/** The exports built in the page, which can fail where printing would not: the caller says so. */
const BUILT: ReadonlySet<ExportKind> = new Set(['pdfFile', 'jpg'])

/**
 * The exports, shared by the export step, the desktop dialog and the phone sheet. `busy` blocks
 * overlapping runs; `failed` names a direct PDF or an image that could not be built, so the caller
 * can say so (and offer printing instead of the PDF).
 */
export function useCvExport() {
  const cv = useCvStore()
  const busy = ref<ExportKind | null>(null)
  const failed = ref<ExportKind | null>(null)

  /** Runs one export; `false` when the direct PDF or the image failed (nothing else is lost). */
  async function run(kind: ExportKind): Promise<boolean> {
    busy.value = kind
    failed.value = null
    try {
      // Autosave is debounced; flushing first means the file matches what is stored.
      await cv.flush()
      if (kind === 'pdfFile') {
        // PDFKit and the converter load here, on first use: the editor never pays for them.
        const { buildDirectPdf } = await import('@/services/export/pdfDirect')
        const title = printTitle(cv.data)
        downloadBlob(await buildDirectPdf(cv.data, cv.templateId, title), `${title}.pdf`)
      } else if (kind === 'jpg') {
        const { buildCvImage } = await import('@/services/export/image')
        downloadBlob(await buildCvImage(cv.data, cv.templateId), `${printTitle(cv.data)}.jpg`)
      } else if (kind === 'pdf') await printCv(cv.data, cv.templateId, { paginate: true })
      else if (kind === 'html') await exportHtml(cv.data, cv.templateId)
      else await exportJson(cv.data)
      return true
    } catch (error) {
      if (!BUILT.has(kind)) throw error
      console.warn(`[export] ${kind} could not be built`, error)
      failed.value = kind
      return false
    } finally {
      busy.value = null
    }
  }

  return { busy, failed, run }
}
