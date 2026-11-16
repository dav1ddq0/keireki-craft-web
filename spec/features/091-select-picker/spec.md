# 091 · Drop-down lists in the app's own look

**Status:** in progress

## What it does

When a drop-down is opened with a mouse, its list of options looks like the rest of the app (Material
3), instead of the flat rectangle with the system's blue that Chrome draws today:

- A card 4 px under the field: 16 px corners, `surface-container-highest`, elevation 3 with a thin
  `outline-variant` edge — the recipe the phone prefix and the AI lists already use.
- Options 44 px tall with 16 px at the sides and 8 px corners; a soft layer under the pointer; the
  chosen one on `secondary-container` with a ✓.
- A long list has a maximum height and scrolls; a list that does not fit below opens above.
- Light and dark theme.

It applies to the ten `<select>` of the app: the interface language (header, Preferences, the phone's
menu), the font, the CV language and the page margins (Style), the marital status, the month of a
date, the level of a skill, and "Assign to" in the PDF review. The closed field stays as it is.

The ⋮ menu of the My CVs cards (spec 090) takes the same recipe (it has 4 px corners and another
surface today).

## Why

Asked for by the user (canvas "Desplegables Material 3"): the open list was the only part of the
forms that did not look like the app, and the two lists the app draws itself already follow one
recipe.

## Acceptance criteria

- [ ] In Chrome/Edge 135+ with a mouse, each of the ten selects opens a list as on the canvas, light
      and dark.
- [ ] The closed field of each select looks as before (size, text, arrow, border, focus, disabled).
- [ ] Keyboard as today: Enter/Space/↓ open, arrows move, Enter chooses, Esc closes; typing a letter
      jumps; screen readers name the field and the options as before.
- [ ] A long list (font) scrolls inside the card; a list near the bottom of the window opens above.
- [ ] Browsers without the feature (Firefox, Safari before 27) and touch screens keep their native
      list; nothing breaks.
- [ ] The ⋮ menu of the cards: 16 px corners, `surface-container-highest`, elevation 3 with its edge,
      8 px item corners.
- [ ] Text 4.5:1 over its background in both themes; forced colours keep the list legible.
- [ ] `npm test`, build, `qa:e2e`, `qa:consistency`.

## Out of scope

- The date of birth's calendar (`type="date"`), the language level suggestions (`<datalist>`) and the
  accent colour picker: native pickers this technique cannot style (the user's call, for now).
- Touch screens: the phone's own picker stays.
- The closed fields.
