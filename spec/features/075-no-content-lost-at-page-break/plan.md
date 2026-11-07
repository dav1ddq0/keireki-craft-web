# 075 · Nothing is lost at a page break: Plan

_How what's described in `spec.md` gets implemented. Must respect `constitution/`._

## Approach

Measure again after the cut, which paged.js does not do: a small paged.js handler of our own, kept
in `services/export/pdf.ts` with the rest of paged.js. Where a template's own rules make Chrome
break at the worst place (ledger), the template changes.

## Implementation

1. `qa/pdf-compare.cjs`: a `sidegrow` part, every template with the sample CV plus 0 to 20 skills:
   no text outside its page in the print, the same pages and text in the direct PDF, and the
   warning on whenever the main column starts on page 2.
2. `services/export/pdf.ts`: a paged.js `Handler` with `onOverflow`. Given the range paged.js is
   about to remove, it hides that content instead (the start node and what follows it at every
   level), drops the bottom padding and margin of the boxes that will be split, as paged.js's own
   `[data-split-to]` rule does, and measures again with `layout.findOverflow`. If something before the
   cut now lies outside the page, the cut moves there; repeat until nothing new appears; restore.
   Registered once, before the first run.
3. `templates/ledger`: the section title, beside its content in a grid, does not forbid a break
   after it (`break-after: auto`); check the other templates with grid sections (editorial).
4. `services/export/render.ts` (`sideColumnOverflows`): measure the side column down to its last
   section's bottom margin (the padding was already counted).
5. Tests: the handler on a small paginated fixture in `qa:pdf`; unit tests for the warning's
   measurement.

## Decisions

- **A handler, not a patch of paged.js**: paged.js stays as installed (no fork, no
  `patch-package`); `onOverflow` is its public hook and may return a different range.
- **Hide, not remove, while measuring**: the range is removed by paged.js only once, with the
  right break token; the trial leaves the DOM as it found it.
- **Fix ledger's titles too**: the handler alone would move ledger's whole body to page 2 (Chrome's
  earliest break); with the title not forbidding a break, only what does not fit moves.

## Risks

- **A layout loop** (moving the cut makes something else overflow): the cut only moves earlier, and
  at most a few times per page.
- **Slower pagination**: one extra measurement per page, only when paged.js found an overflow.
- **A template laid out differently in the ordinary cases**: `qa:pdf` on every template, the
  differences compared before and after.
