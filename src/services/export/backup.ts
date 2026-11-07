import type { CVData } from '@/types/cv'
import type { Locale } from '@/i18n'
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

/**
 * The words backup files are named with, in the interface language (spec 079): plain ASCII, so the
 * name survives any file system and sync service. No language's `backup` word is any language's
 * `daily` word, so pruning the daily copies of a folder can never take a downloaded backup.
 */
export const BACKUP_FILE_WORDS: Record<Locale, { backup: string; daily: string }> = {
  es: { backup: 'copia', daily: 'diaria' },
  ca: { backup: 'copia', daily: 'diaria' },
  'ca-valencia': { backup: 'copia', daily: 'diaria' },
  pt: { backup: 'copia', daily: 'diaria' },
  en: { backup: 'backup', daily: 'daily' },
  it: { backup: 'backup', daily: 'giornaliero' },
  fr: { backup: 'sauvegarde', daily: 'quotidienne' },
  de: { backup: 'sicherung', daily: 'taeglich' },
  eu: { backup: 'babeskopia', daily: 'egunekoa' },
}

const PREFIX = 'keireki-craft-'
const words = (kind: 'backup' | 'daily') => [...new Set(Object.values(BACKUP_FILE_WORDS).map((w) => w[kind]))]
const anyOf = (list: string[]) => list.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
const CURRENT = new RegExp(`^${PREFIX}(${anyOf(words('backup'))})\\.json$`)
const DAILY = new RegExp(`^${PREFIX}(${anyOf(words('daily'))})-(\\d{4}-\\d{2}-\\d{2})\\.json$`)

/** `AAAA-MM-DD`, in the person's own calendar day. */
function day(now: Date): string {
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((n) => String(n).padStart(2, '0')).join('-')
}

/** The downloaded backup: `keireki-craft-copia-2026-11-07.json`, `keireki-craft-backup-…` in English. */
export function backupFileName(now = new Date(), locale: Locale = 'es'): string {
  return `${PREFIX}${BACKUP_FILE_WORDS[locale].backup}-${day(now)}.json`
}

/** The folder's always-current copy (spec 079): `keireki-craft-copia.json`. */
export function currentFileName(locale: Locale): string {
  return `${PREFIX}${BACKUP_FILE_WORDS[locale].backup}.json`
}

/** The folder's copy of the day (spec 079): `keireki-craft-diaria-2026-11-07.json`. */
export function dailyFileName(now: Date, locale: Locale): string {
  return `${PREFIX}${BACKUP_FILE_WORDS[locale].daily}-${day(now)}.json`
}

/** A folder's current copy, in any language. */
export function isCurrentFileName(name: string): boolean {
  return CURRENT.test(name)
}

/** The day of a daily copy, in any language; `null` for any other file. */
export function dailyFileDay(name: string): string | null {
  return DAILY.exec(name)?.[2] ?? null
}

export async function exportBackup(cvs: CVData[], now = new Date(), locale: Locale = 'es'): Promise<void> {
  const backup = await buildBackup(cvs, now)
  downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), backupFileName(now, locale))
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
