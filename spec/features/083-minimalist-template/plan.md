# 083 · Minimalist: Plan

## Approach

As Freelance (081), without the fonts' step: Montserrat and Raleway are bundled already. The template
lives in `src/templates/minimalist/` and registers itself, built on the shared pieces
(`resolveSections`, `contactLines` and `contactIcons.ts`, `languageLevelScore`, `groupHasLevels`,
`styleVars`). No shared code changes unless the PDF import needs one (task 2).

## Implementation

### 1 · The template
1. `src/templates/minimalist/index.ts`: `id: 'minimalist'`, supports `photo`, `sidebar`, `accentColor`,
   `customFont`, `multiPage`, `skillLevels`; defaults a dusty rose accent (`#c98b84`: its 14 % and 26 %
   tints with white are the design's two papers) and Raleway; tags two-column, photo, minimal; its own
   palette of soft accents.
2. `src/templates/minimalist/Template.vue`:
   - The root is a grid, main `1.45fr` on the left, side `1fr` on the right. Both papers are painted by
     one `::before` on the root, a page tall (a solid side block over the main paper), restored on
     paged.js's `[data-split-from]` fragments as in Retro and Freelance; no `::after` (the direct PDF
     ignores `z-index`).
   - Papers as `color-mix(in srgb, var(--cv-accent) 14% / 26%, #fff)`.
   - `<aside data-side>` first in the reading order of the side only: photo (`border-radius: 50%`,
     `object-fit: cover`), name, headline; Contact (`contactHeading`) with `contactLines` and their icons,
     then `personal.links` (a square, label, address); languages. Side titles on a band: the main
     paper as their background, the width of the side column.
   - `<main>`: summary; education as pairs (`.pair`, the halves `2.4em` apart, as Freelance, which the
     import reads row by row); experience with a square per entry; custom sections as a timeline (a
     vertical rule and a square per entry, as borders and solid boxes); skills as a two-column grid of
     rows: circle (the initials, `aria-hidden`), name, bar (`role="img"` with its label, as Freelance).
   - Titles: `'Montserrat'` fixed, uppercase, 700; everything else `var(--cv-font)`; the name italic 400.
   - `SIDE_KINDS = new Set(['languages'])`; with `sidebar` off, languages go to the main column.
3. `src/templates/minimalist/initials.ts`: a skill's initials (first letters of its first two words,
   or its first two letters; letters only, any script), with its test.
4. `src/templates/minimalist/thumbnail.ts`: an SVG thumbnail in the style of the others.
5. `templates.minimalist.description` and any new palette colour names in the nine dictionaries.
6. `tests/minimalistTemplate.test.ts`: columns and side on the right, both papers and the split rule,
   photo / none, empty name or headline, side bands, links in Contact, education pairs, timeline,
   skill circles with initials and bars, none without a level, language bars, Montserrat titles.
7. Template lists that name every id: `tests/templateRender.test.ts`, `tests/longWords.test.ts`,
   `qa/e2e/perf.cjs`, `qa/e2e/fidelity.cjs`, `qa/e2e/flows.cjs`.

### 2 · The PDF import, if the roundtrip asks for it
`qa:roundtrip` over every template. The skills' initials are text in the PDF: if the import takes
them for skills or glues them to the names, it learns to leave out a one- or two-letter word set
apart on the left of a skill's line (`heuristics.ts` or `layout.ts`, with tests). Not needed if the
roundtrip already passes; then this task records that and closes.

### 3 · Verification
`npm test` (in a clean copy as well: the local Vitest cache keeps the registry from before
`minimalist/`), `npm run build`, `qa:e2e`, `qa:pdf minimalist`, `qa:roundtrip`, `qa:consistency`,
`qa:security`; screenshots with the sample CV (photo / none, default accent / dark); the criteria
marked; roadmap to "Done".

## Risks

- **The initials in the PDF import** (task 2): kept smaller than the skills' names and apart from them.
- **The side paper on every page**: a side column that runs on would end where its content ends; the
  root's `::before` paints both papers a page tall on every fragment instead.
- **A dark accent**: its tints stay pale (14 % and 26 %); the circles use `--cv-on-accent`.
- **The side on the right in the import**: columns are told apart by their headings, wherever they
  are; checked by the roundtrip.
