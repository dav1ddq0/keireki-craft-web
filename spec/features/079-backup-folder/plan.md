# 079 · Plan

## Approach

A small service owns the folder: it keeps the directory handle in IndexedDB, checks and asks for
permission, and writes 078's backup to one file. The cv store calls it after each successful save
(debounced); the UI shows its state where the storage options already are.

## Implementation

0. `services/export/backup.ts`: `BACKUP_FILE_WORDS: Record<Locale, { backup, daily }>` (typed per
   locale, so a new language cannot be forgotten); `backupFileName(now, locale)` for the download,
   `currentFileName(locale)`, `dailyFileName(now, locale)`, `isDailyFileName(name)` (any language) and
   `isCurrentFileName(name)` (any language).
1. `services/storage/folder.ts`:
   - `folderSupported()` — `'showDirectoryPicker' in window`;
   - `chooseFolder()` → `showDirectoryPicker({ mode: 'readwrite', id: 'keireki-craft' })`, handle kept
     under one IndexedDB key; `forgetFolder()`;
   - `folderStatus()` → `'off' | 'ready' | 'needs-permission' | 'missing'` (`queryPermission`);
     `resumeFolder()` → `requestPermission` (needs the click);
   - `writeBackupToFolder(json, now)` → `keireki-craft-copia.json` via `createWritable` (written whole,
     replaced atomically by the browser on close), and today's `keireki-craft-diaria-AAAA-MM-DD.json`
     (rewritten through the day), both named in the interface language; then removes a current file
     named in another language, and `pruneDaily()` keeps the 7 newest daily files of any language
     (matched by the exact patterns) and `removeEntry` the rest.
2. `composables/useBackupFolder.ts` (shared state): status, folder name, last write; after each
   autosave (a `cv` store hook), waits 3 s of quiet, builds the backup (`buildBackup(loadAll())`), writes
   it, `ui.recordBackup()`. Errors move it to paused, never block saving.
3. UI: `PreferencesPopover.vue` storage group — the backup button becomes "every CV"; "Guardar también
   en una carpeta" with its status and actions (only if supported). `AppMenuSheet.vue` the same where
   supported. `BackupReminder.vue` also shows the paused notice with "Reanudar"/"Elegir otra carpeta".
4. i18n in nine languages.
5. Tests: `folder.ts` with fake handles (granted, prompt, denied, NotFoundError); the debounce and the
   recorded backup; the UI hidden without the API. `qa:e2e`: `showDirectoryPicker` replaced by a
   directory of the origin private file system (Chromium), choose, edit, read the file back.

## Decisions

- **One file, the 078 format**: the same file Import already restores; no second format.
- **After saves, debounced 3 s**: typing writes once per pause, not per keystroke.
- **Never blocking**: the folder is a copy; if it fails, the CV is still saved in the browser.

- **History: one copy per day, the last 7** (the owner's choice). Named `keireki-craft-diaria-…`, not
  `keireki-craft-copia-…`: if the person picks their downloads folder, pruning can never reach a
  backup they downloaded by hand.

## Risks

- **The permission prompt on each visit**: Chrome 122+ offers "Permitir en cada visita"; otherwise
  one click on "Reanudar" per visit.
- **A synced folder writing often**: one small file every few seconds of editing at most.
