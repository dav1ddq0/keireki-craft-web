# 086 · Plan

## Approach

- `src/components/preview/breakMarks.ts`: `measureBreakMarks(page, frame)` finds the
  `[data-page-break]` sections in the page and returns their position relative to the frame
  (`getBoundingClientRect`, already scaled), so the layer needs no zoom maths.
- `PreviewPane.vue` keeps the list of marks and measures again, once per frame, when the page
  changes size (its `ResizeObserver`), when its DOM changes (a `MutationObserver` on the page: edits,
  the switch, a template swap), when the zoom changes and when fonts finish loading.
- The marks are drawn in `.page-frame`, beside the scaled `.page-wrap`, not inside it: the label keeps
  its size at any zoom and nothing is added to the template's DOM or its filter (dark theme).
- New string `preview.pageBreak` in the nine interface languages.

## Decisions

- **An overlay, not CSS on the sections.** A `::before` or a border on `[data-page-break]` would move
  the content of the page, and the live sheet is the same component the exports render.
- **The template's own attribute decides.** Only sections with `data-page-break` get a mark, so the
  side-column rule of 022 shows as it is: no mark where no break applies.

## Verification

- Unit tests: the measuring (positions relative to the frame, one per marked section, none without);
  the pane draws a mark per marked section, labelled, hidden from assistive technology, and drops it
  when the break is unset.
- Screenshots with the user's CV: Minimalist, a one-column template, a template with the Summary in
  the side column; light and dark; desktop and phone.
- `npm test`, build, `qa:e2e`, `qa:pdf`.

## Files

- `src/components/preview/breakMarks.ts` (new), `src/components/preview/PreviewPane.vue`
- `src/i18n/*.ts`
- `tests/breakMarks.test.ts` (new)
- `spec/constitution/roadmap.md`
