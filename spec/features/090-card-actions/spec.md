# 090 · My CVs: Open, a ⋮ menu and a trash button on each card

**Status:** done

## What it does

On wide screens, each card of My CVs trades its four outlined buttons (Abrir, Renombrar, Duplicar,
Eliminar), which wrap onto two rows, for one row (option C of the design canvas, chosen by the user):

1. **Abrir** — a tonal button, the card's main action.
2. **⋮** — a menu with **Renombrar** (icon: a text field with a cursor) and **Duplicar** (icon: a
   page with a plus). Renaming still happens in the card, as today.
3. **A round trash button**, apart at the end of the row: grey at rest, the error colour on hover or
   focus, with the tooltip "Eliminar".

Deleting is confirmed in a **modal window**, not in the card: the trash icon, "¿Eliminar «Mi CV»?",
"Se borrará de este navegador y no se puede deshacer.", a summary of the CV (initials, name,
template, last change) so the right one is deleted, and **Cancelar** / **Eliminar** (filled, error
colour).

## Why

Asked for by the user: the buttons looked dated, wrapped onto two rows, and "Eliminar" sat among the
everyday actions. A destructive action apart, behind a clear confirmation, is the common pattern (a
shop's cart, a file manager). The summary in the window matters because several CVs can share a name
("Mi CV").

## Acceptance criteria

- [x] Each card shows Abrir, ⋮ and the trash button on one row, the trash at the far end, at every
      card width the grid allows (240 px and up).
- [x] The ⋮ menu: opens on click, Enter or Space; arrow keys move between its two items; Esc or a
      click outside closes it and the focus returns to ⋮; choosing an item closes it. Only one menu is
      open at a time.
- [x] Renombrar from the menu opens today's rename form in the card; Duplicar duplicates as today.
- [x] On hover or keyboard focus the menu icons act out their item, in primary: Renombrar's cursor steps
      out of the field and blinks; Duplicar's copy rises from behind the page (none with reduced motion).
- [x] The trash button has an accessible name with the CV ("Eliminar «Mi CV»") and the tooltip
      "Eliminar"; hover and focus show the error colour, the bin grows a little and trembles, as an iOS app about to be deleted (none with reduced
      motion).
- [x] The confirmation is a modal `<dialog>`: the page behind is dimmed and inert; the focus starts on
      Cancelar; Esc and Cancelar close it without deleting; Eliminar deletes and closes it; the focus
      then goes to a sensible place (the search field, or the next card).
- [x] The window names the CV as its card does (name, else title, else "untitled") and shows its
      template and last change.
- [x] Light and dark theme; text and icons keep 4.5:1 (3:1 for icons) over their background.
- [x] Strings in the nine interface languages.
- [x] `npm test`, `npm run build`, `qa:e2e` (updated for the new controls). `qa:pdf` not run: no
      export is touched.

## Out of scope

- The phone list: its actions sheet (spec 073) with its own confirmation stays as it is.
- Undoing a deletion.
- The rename form itself (it stays in the card).
