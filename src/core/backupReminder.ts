/**
 * When to remind the person to back up their CVs (spec 078). Seven days: the window after which
 * Safari may delete a site's data when it has not been visited.
 */
export const BACKUP_EVERY_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

export interface BackupState {
  /** The last "Back up all CVs" (ISO), or null if there has never been one. */
  lastBackupAt: string | null
  /** "Not now" hides the reminder until then (ISO). */
  snoozedUntil: string | null
  /** Since when this browser has been counting, for someone who has never made a backup (ISO). */
  watchSince: string
}

/**
 * Whether the reminder is due, and how many days the last backup is old (`null`: never made).
 * Due when there are CVs, it is not snoozed, and either the last backup is older than seven days and
 * a CV changed after it, or there has never been one and seven days have passed since counting began.
 */
export function backupDue(documents: { updatedAt: string }[], state: BackupState, now = new Date()): { due: boolean; days: number | null } {
  const at = now.getTime()
  const time = (iso: string | null) => (iso ? Date.parse(iso) : NaN)
  const last = time(state.lastBackupAt)
  const days = Number.isNaN(last) ? null : Math.floor((at - last) / DAY_MS)
  if (!documents.length || time(state.snoozedUntil) > at) return { due: false, days }
  if (days === null) return { due: at - time(state.watchSince) >= BACKUP_EVERY_DAYS * DAY_MS, days }
  const editedSince = documents.some((doc) => time(doc.updatedAt) > last)
  return { due: days >= BACKUP_EVERY_DAYS && editedSince, days }
}

/** The moment "Not now" hides the reminder until. */
export function snoozeUntil(now = new Date()): string {
  return new Date(now.getTime() + BACKUP_EVERY_DAYS * DAY_MS).toISOString()
}
