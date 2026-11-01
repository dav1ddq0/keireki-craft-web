/**
 * The CV as an image (spec 062): the direct PDF (spec 031), its pages drawn by pdf.js and stacked
 * into one picture. Rendering the PDF rather than the screen keeps one layout for every export;
 * pdf.js is already in the app for the PDF import, so nothing new is shipped. Loaded on demand.
 */
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { CVData } from '@/types/cv'
import { printTitle } from './pdf'
import { buildDirectPdf } from './pdfDirect'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/** About 192 dpi: an A4 page is 1588 px wide, sharp on a phone and light as a JPG. */
export const IMAGE_DPI = 192
/** Safari on iOS refuses a canvas over 16 777 216 px; a long CV is scaled down to stay under it. */
export const MAX_IMAGE_PIXELS = 16_000_000
/** The strip between two pages, in PDF points. */
export const PAGE_GAP = 8

const GAP_COLOR = '#d9dce1'
const JPEG_QUALITY = 0.92

export interface PageSize {
  width: number
  height: number
}

export interface ImageLayout {
  /** PDF points to image pixels. */
  scale: number
  width: number
  height: number
  /** Where each page starts, in image pixels. */
  tops: number[]
}

/**
 * Where each page goes in the stacked image, and at what scale: `dpi`, unless the whole image would
 * pass `maxPixels`, then as large as fits. Pages and gaps scale together, so the area scales with
 * the square of the scale.
 */
export function layoutPages(pages: PageSize[], dpi = IMAGE_DPI, maxPixels = MAX_IMAGE_PIXELS): ImageLayout {
  if (!pages.length) throw new Error('A CV image needs at least one page')
  const width = Math.max(...pages.map((page) => page.width))
  const height = pages.reduce((sum, page) => sum + page.height, 0) + PAGE_GAP * (pages.length - 1)
  let scale = dpi / 72
  const area = width * height * scale * scale
  if (area > maxPixels) scale *= Math.sqrt(maxPixels / area)
  const tops: number[] = []
  let top = 0
  for (const page of pages) {
    tops.push(Math.round(top * scale))
    top += page.height + PAGE_GAP
  }
  return { scale, width: Math.floor(width * scale), height: Math.floor(height * scale), tops }
}

/** The CV as one image: its pages one under the other, on white, with a thin strip between them. */
export async function buildCvImage(data: CVData, templateId: string, type: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<Blob> {
  const pdf = await buildDirectPdf(data, templateId, printTitle(data))
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await pdf.arrayBuffer()), isEvalSupported: false }).promise
  try {
    const pages = await Promise.all(Array.from({ length: doc.numPages }, (_, i) => doc.getPage(i + 1)))
    const layout = layoutPages(pages.map((page) => page.getViewport({ scale: 1 })))
    const canvas = document.createElement('canvas')
    canvas.width = layout.width
    canvas.height = layout.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No 2D canvas')
    context.fillStyle = GAP_COLOR
    context.fillRect(0, 0, layout.width, layout.height)
    for (const [index, page] of pages.entries()) {
      // Each page on a canvas of its own, then copied in: pdf.js paints its white background over
      // the whole canvas it is given, which wiped the pages already drawn on a shared one.
      const viewport = page.getViewport({ scale: layout.scale })
      const sheet = document.createElement('canvas')
      sheet.width = Math.floor(viewport.width)
      sheet.height = Math.floor(viewport.height)
      const sheetContext = sheet.getContext('2d')
      if (!sheetContext) throw new Error('No 2D canvas')
      await page.render({ canvasContext: sheetContext, viewport }).promise
      context.drawImage(sheet, 0, layout.tops[index]!)
      sheet.width = sheet.height = 0
      page.cleanup()
    }
    return await toBlob(canvas, type)
  } finally {
    await doc.destroy()
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The image could not be encoded'))), type, JPEG_QUALITY),
  )
}
