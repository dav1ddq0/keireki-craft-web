# 082 · Plan

## Approach

1. **Amber: the direct PDF measures only what is on the page** (`src/services/export/pdfDirect.ts`).
   - A pure helper, `boxOnPage(rects, page)`: of a box's fragments (`getClientRects()`), the ones
     that meet the page's rectangle, joined; `null` when none does. Exported and unit-tested like the
     other helpers (`clipPolygon`, `shapePath`): one fragment, a sliver in the next column, a box
     wholly off the page, two fragments on the page.
   - `drawBox` and `drawImage` use it instead of `getBoundingClientRect()`, and draw nothing for
     `null`. The page's rectangle is already in the context (`origin`).
   - Fixes every template at once; the print already ignores what lies off the sheet.
   - `qa/pdf-compare.cjs` gets a mode `longname4`: the four-line name of the review, with each
     template's own style (`applyTemplateDefaults`), the case the current `longname` (three lines,
     the sample's style) does not reach.
2. **Retro: the live sheet follows the content** (`src/templates/retro/Template.vue`).
   - Unpaginated, the `::before` (sheet, side band and frame) takes the root's height:
     `height: calc(100% - var(--frame) - var(--frame-foot))`. The root is at least one page high
     (`min-height: 100%`), so a one-page CV is unchanged; a longer one gets a longer sheet. The ink
     part, a shadow from 208 mm down, then covers the frame to the foot of the content, and the
     root's `overflow: clip` (080 task 4) still cuts it at the bottom.
   - Paginated (`.cv-page--paged`), the height stays `297mm` minus the frame, as now: each paged
     page has its own sheet, and a fragment can be shorter than its page.
3. **Ledger: sections that Chrome can split** (`src/templates/ledger/Template.vue`).
   - `.section` becomes `display: flow-root`, the title `float: left; width: 23%`, the content
     `margin-left: calc(23% + var(--gap))`: the same two columns and gap, laid out as blocks.
     Tried in a scratch copy: the sample's section heights are identical (301 and 86 px), and with
     the experiences ×3 and ×4 page 1 holds 5 entries and Experience breaks between them.
   - The `.label` rule of spec 075 (`break-after: auto`) stays; its comment is updated (the title is
     no longer a grid item).
   - An absolutely positioned title was also tried; it changed the heights by 10 px, so not that.

## Decisions

- **Fix 1 in the PDF, not in Amber.** The sliver is paged.js's and appears in other templates
  (Ledger's long CV); measuring only the page protects them all. Amber's CSS is not touched.
- **Fix 3 in Ledger, not in paged.js or print.css.** Only Ledger puts a grid around a section that
  can be long; the review found no other template moving a whole section.
- **Retro's live sheet grows; it is not cut into A4 pages.** The live preview is one sheet for every
  template; drawing page breaks there is the paged view's job.

## Verification

- `npm test` (the helper's tests), `npm run build`.
- `qa:pdf` before and after: only Amber's `longname4` and the new mode change, and they pass.
- `qa:e2e`.
- Screenshots: Amber `longname4` PDF page 1; Retro live preview with 1, 2 and 3 pages, light and
  dark; Ledger sample and ×3 in the paged view.
- All in a clean worktree of HEAD with a full copy of `node_modules` (a link makes Vite refuse the
  font files and skews `qa:pdf`).

## Files

- `src/services/export/pdfDirect.ts`, `tests/pdfDirect.test.ts`
- `qa/pdf-compare.cjs`
- `src/templates/retro/Template.vue`
- `src/templates/ledger/Template.vue`
- `spec/constitution/roadmap.md`
