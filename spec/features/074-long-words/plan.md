# 074 · Long words stay in their column, in every template: Plan

_How what's described in `spec.md` gets implemented. Must respect `constitution/`._

## Approach

The fix Amber got in spec 072, applied where the probe finds an overflow, template by template:
the CSS stays inside each template's folder (no shared rule that would change every template's
layout at once).

## Implementation

1. `qa/pdf-compare.cjs`: a `longword` mode, the probe with one tagged word of real letters per field
   (a German compound of 39 characters, and one of 64), reporting template, column and field; run it first to fix the list.
2. For each template it flags, in its `Template.vue`:
   - text in narrow columns (side entries, skill and language names): `overflow-wrap: anywhere`;
   - names and titles that sit in a flex row next to marks or dates: `overflow-wrap: break-word` and
     `min-width: 0`, so the word breaks only when it cannot fit;
   - the full name: `overflow-wrap: break-word`;
   - grid or flex columns that widen: `minmax(0, …)` tracks or `min-width: 0` on the column.
3. A test per template touched, as `amberTemplate.test.ts` does: the rule is in its CSS.
4. `qa:pdf` on the sample CVs: the differences stay as they are.

## Decisions

- **Per template, not global**: one rule on every article would change how ordinary text wraps in
  templates that are fine today, and `anywhere` changes the min-content size of grid and flex items;
  per template, each change is visible and checked against that template's `qa:pdf` case.
- **No hyphenation**: see spec, out of scope.

## Risks

- **A title broken into a few letters** (`anywhere` on a flex item): `break-word` plus `min-width: 0`
  there, the pattern from spec 072; the probe's screenshots are looked at, not only its numbers.
- **The direct PDF wraps differently from the print**: the probe runs on both.
