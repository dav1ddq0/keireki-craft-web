# 090 · My CVs: Open, a ⋮ menu and a trash button on each card: Tasks

- [x] 1 · `DocumentTileActions`, `DocumentMenu`, `DeleteDocumentDialog`; wired in `DocumentList`; strings in nine languages; unit tests — commit: 9599805
  - On the way, from the user: Cancelar and Eliminar the same 40 dp pill (Cancelar outlined), and the
    bin's lid lifts on hover or focus (not with reduced motion).
  - `documents.delete` is its own key: English `actions.remove` is "Remove", which did not match a
    "Delete …?" title. Catalan, Valencian and Basque strings await a native review.
- [x] 2 · `qa/e2e` updated for the new controls; verification (screenshots light/dark, keyboard only, `npm test`, build, `qa:e2e`); criteria marked; roadmap to "Done"
  - `qa/e2e` (docs+prefs): Duplicar through the ⋮ menu; the trash opens the dialog, Cancelar keeps the
    CV (a new check), Eliminar deletes it.
  - Built site in Chromium, light and dark: the row is one line at viewports 840–1440 px (cards 253–309
    px); menu under ⋮ over the cards below; dialog over a dimmed page, both buttons 40 px tall.
  - Keyboard only: Enter on ⋮ focuses Renombrar, ↓ Duplicar, Enter duplicates and the focus returns
    to ⋮; Tab reaches the trash; Enter opens the dialog on Cancelar; Esc closes it back on the trash;
    Tab + Enter on Eliminar deletes, the focus goes to the search. No console errors.
  - The lid: rotated 16° on hover; `none` with `prefers-reduced-motion: reduce`.
  - `npm test` 1232 passed (3 skipped), build OK, `qa:e2e` 232/232. `qa:pdf` not run: no export is
    touched.
- [x] 3 · From the user, after: on hover or focus the bin grows a little (×1.15) and trembles, as an iOS app about to be deleted (±7°, 0.32 s, repeated while hovered); the lid no longer lifts; none with reduced motion
  - Built site: at rest no animation and no scale; on hover `jiggle` (rotation swinging between about −7° and +7°) and scale 1.15; nothing with `prefers-reduced-motion: reduce`. No console errors. Build OK.
- [x] 4 · From the user (a screencast): Renombrar's and Duplicar's icons come alive on hover or keyboard focus, in primary: the cursor steps 2 px out of the field and blinks (1 s); a second page rises from behind the first, up and right; none with reduced motion
  - Built site, light and dark: at rest as before (the copy hidden); on hover the caret in primary, moved 2 px, `blink`; on Duplicar the copy at full opacity in primary; ↓ onto Duplicar with the keyboard shows it too. With `reduce`: no movement, no copy. No console errors.
  - `npm test` 1232 passed (3 skipped), build OK, `qa:e2e` 232/232.
- [x] 5 · From the review: with the keyboard the bin trembles three times (about 1 s) and stops, since the focus can rest on it (back from the dialog with Esc) and a tremble without end would distract (WCAG 2.2.2); under the pointer it goes on
  - Built site: Enter on the trash, Esc back on it: trembling at once, no animation running 1.3 s later (still at ×1.15); then under the pointer `infinite` and running; at rest none. With `reduce`: nothing. No console errors. Build OK, `qa:e2e` 232/232.
