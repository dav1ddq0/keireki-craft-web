# 064 · Phone dock: icons, copy and a quick template switch

**Status:** in progress

## What it does

On the phone the bottom dock is the only toolbar, and it wasted room on text. Now:

- The Edit / Preview switch shows **icons only** (each keeps its name for screen readers and as a
  tooltip).
- In **preview**, the dock holds, in one row: the switch, a **template button** (accent swatch +
  template name + ▾), **Copy image** (moved out of the corner of the page, where it covered the CV)
  and **Export** as an icon.
- The template button opens a **bottom sheet with the templates** (their real thumbnails, two
  columns, the current one marked). Tapping one changes the CV behind the sheet at once; the sheet
  stays open to try another. Same rules as the style step: a template brings its own accent and face
  only while the user has not chosen theirs.
- In **edit** mode the dock keeps the switch (icons) and the main action (Next, or Export with its
  text on the last step).

Design approved by the owner: canvas "Dock del móvil – Keireki Craft".

## Why

The preview on a phone had no way to change template quickly (the preview's template button is
desktop/tablet only) and the copy button sat over the document. Freeing the dock's labels makes room
for both where the thumb is.

## Acceptance criteria

- [ ] Phone (≤ 640 px): the switch buttons show only their icon, both named (`aria-label`, `title`).
- [ ] Preview mode: switch · template button · Copy image · Export (icon, named "Exportar"), in one row
      that fits a 320 px screen without horizontal scroll.
- [ ] Copy image is no longer drawn over the page on the phone; its state ("Copiado", the failure and
      the Share fallback of spec 062) shows above the dock without moving the row.
- [ ] Where images cannot be copied, the copy button is absent and the template button takes its room.
- [ ] The template button names the current template and opens the sheet; the sheet lists every
      template with its thumbnail and name, marks the current one, and a tap applies it (undoable,
      autosaved) and keeps the sheet open. Closing returns focus to the button.
- [ ] Picking a template from the sheet does exactly what picking it in the style step does
      (one shared store action).
- [ ] Edit mode: Next with its text; on the last step, Export with its text (spec 027).
- [ ] Desktop and tablet are unchanged.
- [ ] `qa:consistency` and `qa:e2e` (phone block) pass.

## Out of scope

- Filters or descriptions in the sheet (the style step keeps them).
- Changing colours or fonts from the dock.
