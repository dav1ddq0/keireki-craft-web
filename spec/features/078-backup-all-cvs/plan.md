# 078 · Plan

## Approach

A backup is a small wrapper around the exported CVs, built and read in `services/export` next to
the single-CV JSON; the store decides what each CV becomes on restore; the UI adds one action where
the "only in this browser" notice already is, and turns that notice into the reminder when due.

## Implementation

1. `services/export/backup.ts`:
   - `buildBackup(cvs)` → `{ format: 'keireki-craft-backup', version: 1, exportedAt, cvs: [...] }`, each
     CV through `toExportableJson` (photo inlined); `exportBackup()` downloads it (`downloadBlob`).
   - `readImportFile(file)` → `{ kind: 'cv', data }` or `{ kind: 'backup', cvs }`; unknown → error.
2. `stores/cv.ts`: `planRestore(cvs)` → which are new, identical, changed (by `meta.id`, content
   compared without `updatedAt`), so the UI can confirm before anything is written; then
   `restoreBackup(cvs)` → `{ restored, skipped, replaced }`: missing → saved as is; identical →
   skipped; different → saved over the stored one with the backup's version. Photos stored as blobs
   as `importData` does (the replaced CV's old photo removed). If the open CV is replaced, it is
   reloaded (and its undo history starts again).
3. `services/prefs.ts`: `lastBackupAt: string | null`, `backupSnoozedUntil: string | null`.
   `core/backupReminder.ts`: `backupDue(summaries, prefs, now)` — the pure rule, tested.
4. UI:
   - `DocumentList.vue`: "Copia de seguridad" beside "only in this browser"; the notice shows the
     reminder text and its two actions when `backupDue`.
   - `AppMenuSheet.vue` (phone): the action under the persistence note.
   - `StepExport.vue`: the action beside its notice.
   - `ImportView.vue`: `readImportFile`; a backup is planned first; if any CV would be replaced, a
     confirmation dialog names how many; then it restores and shows the summary in a notice.
5. i18n: the button, the reminder (with the number of days), "Ahora no", the summary, the error for a
   file that is neither — nine dictionaries.
6. Tests: `backup.test.ts` (build/read, round trip with a photo, unknown file), `restoreBackup`
   cases, `backupReminder.test.ts` (never, recent, old with edits, old without edits, snoozed);
   `qa:e2e`: make a backup, clear the storage, restore, the CVs are back.

## Decisions

- **The backup's version wins on restore** (the owner's choice): restoring means going back to the
  copy. A confirmation names how many CVs will be replaced, so a stale backup is not restored over
  newer work by accident.
- **The reminder rides on the existing notice**, not a new bar: the layouts already decided where
  storage notices go (specs 016, 018).
- **7 days**: the window after which Safari may delete the data.

## Risks

- **A big file** with many photos: photos are already downscaled on upload; a backup of 20 CVs
  stays in the low MB.
- **Comparing "identical"**: by content without `updatedAt`, so a restore right after a backup
  skips everything and asks nothing.
- **Replacing newer work with an older backup**: the confirmation says how many will be replaced;
  each CV's own JSON export remains for keeping one version aside.
