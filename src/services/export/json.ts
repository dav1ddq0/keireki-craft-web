import type { CVData } from '@/types/cv'
import { migrate } from '@/core/migrations'
import { loadPhoto } from '@/services/storage'
import { readPrefs } from '@/services/prefs'
import { downloadBlob } from './download'

/**
 * JSON is the canonical portability format (spec §6), so the exported file must
 * be self-contained: the photo is inlined as base64 here even though it lives as
 * a Blob reference inside the app.
 */
export async function toExportableJson(data: CVData): Promise<string> {
  const copy: CVData = JSON.parse(JSON.stringify(data))
  if (copy.personal.photo?.startsWith('photo:')) {
    const blob = await loadPhoto(copy.personal.photo)
    copy.personal.photo = blob ? await blobToDataUrl(blob) : undefined
  }
  return JSON.stringify(copy, null, 2)
}

/** Downloads the CV as `<name>.json`; `name` is the stem from `fileName` (spec 073). */
export async function exportJson(data: CVData, name: string): Promise<void> {
  const json = await toExportableJson(data)
  downloadBlob(new Blob([json], { type: 'application/json' }), `${name}.json`)
}

/**
 * Parses and migrates an uploaded JSON file. Throws `UnsupportedSchemaError` on old/foreign files.
 * A file from before spec 021 names no template; it gets the one this browser last picked.
 */
export async function importJsonFile(file: File): Promise<CVData> {
  const text = await file.text()
  return migrate(JSON.parse(text), { fallbackTemplateId: readPrefs().lastTemplateId })
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob()
}
