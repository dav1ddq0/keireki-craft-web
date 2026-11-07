import type { CVData } from '@/types/cv'
import { migrate } from '@/core/migrations'
import { readPrefs } from '@/services/prefs'
import { downloadBlob } from './download'
import { toExportableJson } from './json'

/**
 * A backup of every CV in one file (spec 078): a small wrapper around the CVs as their own JSON
 * export writes them, photos inlined. The wrapper names itself, so Import tells it from one CV's JSON,
 * and carries a version of its own, so it can grow without touching `CVData`.
 */
export const BACKUP_FORMAT = 'keireki-craft-backup'
export const BACKUP_VERSION = 1

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  cvs: CVData[]
}

/** The file as Import reads it: one CV's JSON, or a backup of several. */
export type ImportFile = { kind: 'cv'; data: CVData } | { kind: 'backup'; cvs: CVData[] }

/** A backup made by a newer version of the app, which this one cannot read safely. */
export class UnsupportedBackupError extends Error {
  constructor(version: unknown) {
    super(`Unsupported backup version: ${String(version)}`)
    this.name = 'UnsupportedBackupError'
  }
}

export async function buildBackup(cvs: CVData[], now = new Date()): Promise<Backup> {
  const exported = await Promise.all(cvs.map(async (cv) => JSON.parse(await toExportableJson(cv)) as CVData))
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), cvs: exported }
}

/** `keireki-craft-copia-AAAA-MM-DD.json`, in the person's own calendar day. */
export function backupFileName(now = new Date()): string {
  const day = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((n) => String(n).padStart(2, '0')).join('-')
  return `keireki-craft-copia-${day}.json`
}

export async function exportBackup(cvs: CVData[], now = new Date()): Promise<void> {
  const backup = await buildBackup(cvs, now)
  downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), backupFileName(now))
}

/**
 * Reads a file given to Import. A backup's CVs are each migrated like any imported CV; anything else
 * is read as one CV's JSON, which throws `UnsupportedSchemaError` when it is not one.
 */
export async function readImportFile(file: File): Promise<ImportFile> {
  const parsed: unknown = JSON.parse(await file.text())
  const fallbackTemplateId = readPrefs().lastTemplateId
  if (isBackup(parsed)) {
    if (typeof parsed.version !== 'number' || parsed.version > BACKUP_VERSION) throw new UnsupportedBackupError(parsed.version)
    return { kind: 'backup', cvs: parsed.cvs.map((cv) => migrate(cv, { fallbackTemplateId })) }
  }
  return { kind: 'cv', data: migrate(parsed, { fallbackTemplateId }) }
}

function isBackup(value: unknown): value is { version: unknown; cvs: unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { format?: unknown }).format === BACKUP_FORMAT &&
    Array.isArray((value as { cvs?: unknown }).cvs)
  )
}
