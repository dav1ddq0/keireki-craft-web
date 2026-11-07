# 078 · A backup of every CV, and a reminder to make one

**Status:** proposed

## What it does

The CVs live only in this browser (IndexedDB). Today the only copy a person can keep is one CV at a
time (Export → JSON), and Import takes one back. This adds:

1. **Copia de seguridad** — one button saves **every CV** (with its photo) in one file,
   `keireki-craft-copia-AAAA-MM-DD.json`. It is in My CVs (every layout), in the phone menu, and in
   the export step beside the "only in this browser" notice.
2. **Restore** — Import's JSON drop zone also takes that file and brings every CV back:
   - a CV that is not here is restored as it was (same id, dates, title, template);
   - one that is here and identical is skipped;
   - one that is here but differs is **replaced by the backup's version** (the owner's choice), after
     a confirmation that names how many: "Se reemplazarán 2 CV por la versión de la copia. ¿Seguir?".
   A summary says what happened: "3 restaurados · 1 ya estaba · 2 reemplazados".
3. **A reminder** — when a CV has been edited since the last backup and that backup is more than
   **7 days** old (or there has never been one and the oldest CV is more than 7 days old), the
   "only in this browser" notice becomes: "Tu última copia es de hace 9 días · Hacer copia". "Ahora
   no" hides it for 7 more days.

A single CV's JSON export and import work as before.

## Why

The CV can be lost without warning: Safari may delete a site's data after 7 days without a visit
(unless it is installed on the home screen), any browser deletes it with "clear browsing data", and
a browser without persistent storage may delete it when the disk is short. One file with everything,
easy to make and to restore, and a nudge at the right time, covers every browser. 7 days is Safari's
window.

## Acceptance criteria

- [ ] **Copia de seguridad** in My CVs (desktop, tablet, phone), in the phone menu and in the export
      step downloads one file with every CV; photos inlined; the file names its format and version.
- [ ] Import restores it: missing CVs as they were, identical ones skipped, changed ones replaced by
      the backup's version after a confirmation (cancel restores nothing); the summary counts each
      case; if the open CV is replaced, the editor shows the restored version.
- [ ] A single CV's JSON still imports as a new CV, as today; a file that is neither says so.
- [ ] A backup made and restored in another browser gives back the same CVs (content, photo,
      template, style, section order).
- [ ] The reminder shows under the conditions above and only then; "Hacer copia" makes one and
      hides it; "Ahora no" hides it for 7 days. The date of the last backup is a preference
      (`localStorage`), never inside a CV.
- [ ] No change to `CVData` (no migration): the backup wraps CVs, each migrated on restore like any
      imported one.
- [ ] Every string in the nine languages; light and dark; 1440 / 1024 / 390 px.
- [ ] `npm test`, `npm run build`, `qa:e2e` (a backup → wipe → restore walk), `qa:consistency` pass.

## Out of scope

- Saving to a folder automatically (File System Access): spec 079, Chrome and Edge only.
- Choosing which CVs go into the backup (it is always all of them).
- Any server or cloud copy.
