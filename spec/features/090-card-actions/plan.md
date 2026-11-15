# 090 · Plan

## Components

- `src/components/documents/DocumentTileActions.vue` (new): the row on a card. Props `title` (for
  the accessible names). Emits `open`, `rename`, `duplicate`, `remove`. Owns only whether its menu is
  open.
- `src/components/documents/DocumentMenu.vue` (new): the ⋮ button and its menu (`role="menu"`, two
  `menuitem`s with their icons). Keyboard: Enter/Space/↓ open on the first item, ↑/↓ move, Home/End,
  Esc closes and returns the focus to ⋮, Tab closes. A click outside closes it (a `pointerdown`
  listener on the document while open). Emits `rename`, `duplicate`.
- `src/components/documents/DeleteDocumentDialog.vue` (new): a native `<dialog>` opened with
  `showModal()` (page inert, Esc handled by the browser), the same scrim as `ExportDialog`
  (`rgb(0 0 0 / 0.32)`), M3 basic dialog: `--md-surface-container-high`, 28 px corners, 24 px
  padding. Props `open`, `doc`. Emits `close`, `confirm`. `autofocus` on Cancelar.
- `DocumentList.vue`: the tile's `.actions` block becomes `DocumentTileActions`; `pendingDelete`
  holds the doc to delete and drives the dialog; the in-card confirmation goes. After deleting, the
  focus goes to the search field.

## Look

- Abrir: tonal (`--md-secondary-container` / `--md-on-secondary-container`), 40 px, full shape.
- ⋮ and trash: 40 px round icon buttons with the existing `m3-state` / `m3-target` (48 px target).
  Trash at rest: outline-variant border, `--text-muted`; hover/focus: `--md-error-container` /
  `--md-on-error-container`. The tooltip: a small inverse-surface label shown on hover and
  `:focus-visible`, decorative (`aria-hidden`), the name is on the button.
- Menu: `--md-surface-container` with the M3 menu shadow, 44 px items, icon + label.
- Icons as inline SVG, stroke `currentColor`, the ones drawn on the canvas.

## Strings (nine languages)

- `documents.removeOne`: "Eliminar «{title}»" (the trash's accessible name).
- `documents.deleteTitle`: "¿Eliminar «{title}»?"
- `documents.deleteBody`: "Se borrará de este navegador y no se puede deshacer."
- Reused: `actions.open`, `actions.rename`, `actions.duplicate`, `actions.remove`, `actions.cancel`,
  `documents.more` (the ⋮'s name), `documents.updated`, `documents.template`.
- `documents.deleteConfirm` stays: the phone's sheet uses it.

## Decisions

- **No mention of the backups in the window.** With a backup folder (spec 079) the current backup is
  rewritten a few seconds after the deletion, so "your backups don't change" would be false; only
  the daily copies keep it.
- **Native `<dialog>`, as `ExportDialog`**, not a new overlay: focus trap, inert page and Esc for free.
- **Cancelar and Eliminar the same size** (the user's call on the canvas): Cancelar outlined, Eliminar
  filled, both the 40 dp pill of `BaseButton`; the focus ring is the app's keyboard-only one.
- **The menu is our own small component**, not the `popover` attribute: two items, positioned under ⋮
  inside the card; the card does not clip it (no `overflow: hidden` on `.tile`).

## Verification

- Unit tests (`tests/documentTileActions.test.ts`, new): the row emits each action; the menu opens,
  moves with the arrows, closes on Esc and returns the focus; the dialog shows the CV, Cancelar does
  not emit `confirm`, Eliminar does.
- `DocumentList`: deleting goes through the dialog; Renombrar from the menu opens the form.
- `qa/e2e/flows.cjs` (docs+prefs): Duplicar through the menu, deleting through the trash and the
  window.
- Screenshots: light and dark, cards at 240 px and wider, menu open, dialog open; keyboard only.
- `npm test`, build, `qa:e2e`.

## Files

- New: `src/components/documents/DocumentTileActions.vue`, `DocumentMenu.vue`,
  `DeleteDocumentDialog.vue`, `tests/documentTileActions.test.ts`
- `src/components/documents/DocumentList.vue`, `src/i18n/*.ts`, `qa/e2e/flows.cjs`
- `spec/constitution/roadmap.md`
