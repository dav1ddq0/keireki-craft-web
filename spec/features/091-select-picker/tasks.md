# 091 · Drop-down lists in the app's own look: Tasks

- [x] 1 · The base-select block in `app.css` (the list, the options, forced colours; the closed fields as before); the ⋮ menu to the same recipe
  - Closed fields measured before and after in Chromium (ten selects, light and dark): same size, padding, border, radius and colours. What base-select changed and was set back: its border, radius and background; `line-height` (now honoured); a long value wrapping; the filled triangle (a chevron again, as a mask, `ButtonText` in forced colours).
  - The header's and the PDF review's selects took the width of their longest option; base-select takes the chosen one's: `min-width: 8rem` keeps them (127/129 → 128 px).
  - A long value (the font) pushed the chevron out: the font select gets `<button class="select-value"><selectedcontent>` so it ends in an ellipsis; `vite.config.ts` tells Vue `selectedcontent` is an element.
  - A disabled select is no longer dimmed to 0.7 by Chromium: the font's value is at M3's 38 % (BaseField's own rule), as `SkillItemsEditor` already forced for the level.
  - `npm test` 1232 passed (3 skipped), build OK, `qa:consistency` 13/13, `qa:e2e` 232/232 (the first run failed one `[transitions]` timing check, untouched by this change; two reruns on the same build passed).
- [x] 2 · Verification: before/after screenshots of the ten selects, light and dark; keyboard only; Firefox and touch keep the native list; `npm test`, build, `qa:e2e`, `qa:consistency`; criteria marked; roadmap to "Done"
  - Firefox: no base-select, the four selects of Style stay `appearance: auto` and change the value; touch (Chromium, coarse pointer): `auto` too. No console errors.
  - Keyboard (light and dark): Tab reaches the field; Space, Enter and ↓ open; Esc closes without a change; ↓ + Enter chooses and the focus stays on the field; a letter jumps to the next option with it. The accessibility tree: combobox "Idioma del CV" with its nine options, as before.
  - Contrast: options 13.3:1 (light) and 9.6:1 (dark) on the card; the chosen one under the pointer 11.4:1 and 5.9:1. Forced colours: card edged, chosen on `SelectedItem`, chevron visible.
  - `npm test` 1232 passed (3 skipped), build OK, `qa:consistency` 13/13, `qa:e2e` 232/232 first run.
