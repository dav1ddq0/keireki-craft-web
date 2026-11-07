# 079 · Back up to a folder on the computer, by itself

**Status:** proposed

## What it does

Phase 2 of the backup (078). Where the browser can write to a folder the person chooses (the File
System Access API: Chrome, Edge and Opera on a computer; not Firefox, Safari or any phone), the
backup can keep itself:

1. **"Guardar también en una carpeta"** — in Preferences' storage group (and the menu sheet where the
   API exists): "Elegir carpeta…" opens the system's folder picker once.
2. From then on, a few seconds after each save, the app writes **`keireki-craft-copia.json`** in that
   folder: the 078 backup (every CV, photos inlined), always up to date. It also keeps **one copy per
   day, the last 7** (`keireki-craft-diaria-AAAA-MM-DD.json`, the owner's choice), so a mistake can be
   undone a few days back. Older daily copies are deleted; only files with a daily name.
   **Names follow the interface language** (the owner's choice), plain ASCII, two words per language
   that never collide across languages (no language's backup word is any language's daily word):
   es/ca/ca-valencia/pt `copia`·`diaria`, en `backup`·`daily`, it `backup`·`giornaliero`,
   fr `sauvegarde`·`quotidienne`, de `sicherung`·`taeglich`, eu `babeskopia`·`egunekoa`. After a
   language change the current file is written under the new name and the one under the old name is
   removed; daily copies of every language count when keeping the last 7.
   078's downloaded backup is named the same way (`keireki-craft-backup-2026-11-07.json` in English).
3. **Status** in the same place: "Guardando en «Documentos/CV» · hace 2 min", with "Cambiar carpeta"
   and "Dejar de guardar".
4. **Paused** — when the browser has not granted access in this visit (Chrome asks again on each
   visit unless "Permitir en cada visita" was chosen) or the folder is gone, nothing is written and a
   notice says so where the backup reminder appears: "La copia en la carpeta está en pausa ·
   Reanudar" (or "Elegir otra carpeta").
5. **Recovery** needs nothing new: if the browser loses its data, Import that file (078's restore).
6. Each write counts as a backup: while it works, the 7-day reminder does not appear.
7. Fixed on the way: Preferences' "Descargar copia de seguridad (JSON)" downloaded only the open CV;
   it becomes 078's "Hacer copia de seguridad" (every CV).

Where the API does not exist, nothing of this is shown and 078 works as it does.

## Why

078 depends on remembering; a folder on the computer (synced by Dropbox, OneDrive or iCloud if the
person wants) keeps an up-to-date copy without thinking about it, and it survives the browser
clearing its data.

## Acceptance criteria

- [ ] With the API: choose a folder; after an edit the file is there within a few seconds, in 078's
      format, with every CV; Import restores it.
- [ ] A daily copy is written once per day; with more than 7, the oldest daily copies are deleted and
      no other file in the folder is touched (in particular, no downloaded backup in any language).
- [ ] File names follow the interface language, for the folder and for 078's download; after a
      language change the old current file is replaced, not left behind.
- [ ] The status shows the folder's name and when it was last written; "Cambiar carpeta" and "Dejar
      de guardar" work; stopping forgets the folder (the file stays).
- [ ] Without access this visit, or with the folder gone: nothing is written, the paused notice
      appears, and "Reanudar" / "Elegir otra carpeta" brings it back.
- [ ] A successful write records a backup (the reminder stays away); a failed one does not.
- [ ] Without the API (Firefox, Safari, phones): no folder option anywhere; 078 unchanged.
- [ ] Preferences' backup button saves every CV.
- [ ] The folder handle is kept in IndexedDB, never in `localStorage`; no change to `CVData`.
- [ ] Nine languages; light and dark; `npm test`, `npm run build`, `qa:e2e` (a walk with the picker
      replaced by a private origin folder), `qa:consistency` pass.

## Out of scope

- Writing one file per CV; more than 7 days of history.
- Reading back from the folder automatically (Import does it).
- Any server or cloud API: syncing the folder is the person's own choice.
