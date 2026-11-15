# 089 · Plan

## Approach

- `src/core/searchMatch.ts` (new, pure): `foldText(value)` (the fold `DocumentList` uses today:
  NFD, diacritics out, lower case), `matchesQuery(text, query)` and `highlightParts(text, query)`,
  which returns `{ text, match }[]` with the original letters. It folds letter by letter and keeps,
  for each folded letter, the index it came from, so a match found in the folded text marks the
  letters as written ("martin" → "Mart" + "í" + "n").
- `src/components/documents/HighlightedText.vue` (new): renders the parts, each match in a `<mark>`.
- `DocumentList.vue`: the filter becomes `matchesQuery(fullName, q) || matchesQuery(title, q)`; the
  tile's name and title lines render through `HighlightedText`. The label rule
  (`fullName || title || untitled`) stays; the "untitled" fallback is never marked.
- The mark's style, in `HighlightedText.vue`: `background: var(--md-primary-container)`,
  `color: var(--md-on-primary-container)`, `border-radius: 3px`, `box-shadow: 0 0 0 1px` in the same
  colour (a little breathing room without padding, so nothing moves). Both themes come from the
  existing M3 tokens. Under `forced-colors: active` it falls back to `Mark` / `MarkText`.

## Decisions

- **Each field on its own.** Searching name and title as one string can keep a card for a query that
  spans both, with nothing to mark. Matching per field keeps "what you see marked is why it stayed".
- **A fill, not bold or colour alone.** Bold changes the width of the text (the card would move);
  colour alone fails users who don't tell hues apart; an underline reads as a link.
- **No new strings, no change to `types/cv.ts`**: no migration needed.

## Verification

- Unit tests (`tests/searchMatch.test.ts`, new): accents both ways, every occurrence, adjacent
  matches merged, empty query, a query not found, letters whose fold changes length.
- `tests/documentSearch.test.ts`: the marks in the name and title lines; a query across name and
  title no longer keeps the card.
- Screenshots in light and dark of "na" and "martin" with the sample CVs.
- `npm test`, build, `qa:e2e`.

## Files

- `src/core/searchMatch.ts` (new), `src/components/documents/HighlightedText.vue` (new)
- `src/components/documents/DocumentList.vue`
- `tests/searchMatch.test.ts` (new), `tests/documentSearch.test.ts`
- `spec/constitution/roadmap.md`
