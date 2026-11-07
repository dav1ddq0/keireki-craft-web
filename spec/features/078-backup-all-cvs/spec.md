# 078 · A backup of every CV, and a reminder to make one

**Status:** done

## What it does

The CVs live only in this browser (IndexedDB). Today the only copy a person can keep is one CV at a
time (Export → JSON), and Import takes one back. This adds:

1. **Copia de seguridad** — one button saves **every CV** (with its photo) in one file,
   `keireki-craft-copia-AAAA-MM-DD.json`. It is an ordinary action in My CVs (every layout), in the
   phone menu, and in the export step's list of downloads.
2. **Restore** — Import's JSON drop zone also takes that file and brings every CV back:
   - a CV that is not here is restored as it was (same id, dates, title, template);
   - one that is here and identical is skipped;
   - one that is here but differs is **replaced by the backup's version** (the owner's choice), after
     a confirmation that names how many: "Se reemplazarán 2 CV por la versión de la copia. ¿Seguir?".
   A summary says what happened: "3 restaurados · 1 ya estaba · 2 reemplazados".
3. **A reminder, only now and then** (the owner's choice) — the warning about the browser is not
   shown all the time any more. It appears in My CVs and in the export step only when a CV has been
   edited since the last backup and that backup is more than **7 days** old (or there has never been
   one and the oldest CV is more than 7 days old): "Tu última copia es de hace 9 días · Hacer copia".
   "Ahora no" hides it for 7 more days. The always-on "only in this browser" notice is removed.

A single CV's JSON export and import work as before.

## Why

The CV can be lost without warning: Safari may delete a site's data after 7 days without a visit
(unless it is installed on the home screen), any browser deletes it with "clear browsing data", and
a browser without persistent storage may delete it when the disk is short. One file with everything,
easy to make and to restore, and a nudge at the right time, covers every browser. 7 days is Safari's
window.

## Acceptance criteria

- [x] **Copia de seguridad** in My CVs (desktop, tablet, phone), in the phone menu and in the export
      step downloads one file with every CV; photos inlined; the file names its format and version.
      No warning bar is shown with it unless the reminder is due.
- [x] Import restores it: missing CVs as they were, identical ones skipped, changed ones replaced by
      the backup's version after a confirmation (cancel restores nothing); the summary counts each
      case; if the open CV is replaced, the editor shows the restored version.
- [x] A single CV's JSON still imports as a new CV, as today; a file that is neither says so.
- [x] A backup made and restored in another browser gives back the same CVs (content, photo,
      template, style, section order).
- [x] The reminder shows under the conditions above and only then; "Hacer copia" makes one and
      hides it; "Ahora no" hides it for 7 days. The date of the last backup is a preference
      (`localStorage`), never inside a CV.
- [x] No change to `CVData` (no migration): the backup wraps CVs, each migrated on restore like any
      imported one.
- [x] Every string in the nine languages; light and dark; 1440 / 1024 / 390 px.
- [x] `npm test`, `npm run build`, `qa:e2e` (a backup → wipe → restore walk), `qa:consistency` pass:
      1059 tests; qa:e2e 209/209 (the walk: made in one browser, restored in an empty one, then
      restored over an edit after confirming); qa:consistency 13/13 over 425 views.

## Out of scope

- Saving to a folder automatically (File System Access): spec 079, Chrome and Edge only.
- Choosing which CVs go into the backup (it is always all of them).
- Any server or cloud copy.
