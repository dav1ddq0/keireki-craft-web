# 091 · Drop-down lists in the app's own look: Plan

## Approach

The customizable `<select>` (`appearance: base-select` on the select and on `::picker(select)`):
CSS only, the real `<select>` stays, so the browser keeps the keyboard, focus, top layer, positioning
and accessibility. One block in `src/styles/app.css` styles every select at once; no component and
no JavaScript are added. It sits inside
`@supports (appearance: base-select)` and `@media (pointer: fine)`, so other browsers and touch
screens keep the native list (progressive enhancement).

## Implementation

1. `src/styles/app.css`, in that block:
   - `select, ::picker(select) { appearance: base-select }`.
   - The closed select reset to how it renders today: base-select gives the button its own border,
     padding, background and arrow (`::picker-icon`); each of the ten is checked against a screenshot
     taken before the change, and any per-field rule that differs is set back.
   - `::picker(select)`: 4 px gap (`margin-block`), `--shape-md`, `--md-surface-container-highest`,
     `box-shadow: var(--elevation-3), inset 0 0 0 1px var(--md-outline-variant)`, 4 px padding,
     `max-height` with scroll, `min-width: anchor-size(width)` so a narrow field (month) can have a
     wider list.
   - `option`: 44 px, `0 16px`, `--shape-sm`, `--type-body-large`; `:hover`/`:focus-visible` with the
     `--state-hover` layer; `:checked` on `--md-secondary-container` /
     `--md-on-secondary-container`; `option::checkmark` the ✓ in `currentColor`.
   - The existing `option, optgroup` colours (for the native list) stay for the fallback.
   - `@media (forced-colors: active)`: `Canvas`/`CanvasText`, `Highlight` on the chosen option.
2. `src/components/documents/DocumentMenu.vue`: the menu's corners, surface, shadow and item corners
   to the same recipe.
3. Checks: screenshots of the ten selects open and closed, light and dark, before and after;
   keyboard only; Firefox (native list); a touch emulation (native list).

## Decisions

- **`base-select`, not a custom listbox component**: no JavaScript, no rewrite of ten fields, the
  browser's accessibility and keyboard; the cost is that Firefox and older Safari keep their native
  list, which the user accepted ("cuando el default no es algo como hace Safari").
- **Only with a mouse** (`pointer: fine`): base-select replaces the phone's native picker (iOS wheel,
  Android sheet), which is better for a finger. Recommended to the user; changing it is one line.
- **16 px card, 8 px options**: the recipe the app's own lists (phone prefix, AI) already use; M3's
  stock menu has 4 px, but the app uses the md shape for floating surfaces.

## Risks

- **The closed field changes** under base-select (padding, arrow, height, `field-sizing`): the
  before/after screenshots of each select catch it; `qa:consistency` checks the type scale.
- **A disabled select** (the font, when unsupported): its 38 % opacity rule in `SkillItemsEditor`
  and the native dimming must still hold.
- **jsdom/Vitest** do not render pickers: the unit tests stay as they are; the browser checks carry
  this feature.

## Files

- `src/styles/app.css`, `src/components/documents/DocumentMenu.vue`
- Possibly a scoped rule in a field whose closed look changes
- `spec/constitution/roadmap.md`
