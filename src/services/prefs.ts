/**
 * `localStorage` is reserved for trivial UI preferences (spec §8.1). CVs never
 * go here: it is synchronous, capped at ~5 MB per origin and throws when full.
 */
import type { ThemeChoice } from '@/core/theme'
import type { Locale } from '@/i18n'

const KEY = 'keireki-craft:prefs'
/** The key while the app was called "CV Maker" (spec 039): read when the new one is empty, never written. */
const LEGACY_KEY = 'cv-maker:prefs'

export interface Prefs {
  /** Checked on read by `storedLocale()`: an old or hand-edited value falls back to Spanish. */
  uiLanguage: Locale
  lastTemplateId: string
  lastCvId: string | null
  theme: ThemeChoice
  dismissedNotices: string[]
  /** When "Back up all CVs" last made a file (spec 078); a preference, never part of a CV. */
  lastBackupAt: string | null
  /** "Not now" on the backup reminder hides it until then (spec 078). */
  backupSnoozedUntil: string | null
  /** Since when the reminder counts for someone who has never made a backup: the first visit with it. */
  backupWatchSince: string | null
}

const DEFAULTS: Prefs = {
  uiLanguage: 'es',
  lastTemplateId: 'classic',
  lastCvId: null,
  // Like any Android or desktop app: follow the system until the user picks one (spec 029).
  theme: 'system',
  dismissedNotices: [],
  lastBackupAt: null,
  backupSnoozedUntil: null,
  backupWatchSince: null,
}

export function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function writePrefs(patch: Partial<Prefs>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readPrefs(), ...patch }))
  } catch {
    // Preferences are disposable — a full or blocked localStorage is not an error
    // worth bothering the user about.
  }
}
