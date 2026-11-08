# 081 · Freelance: Plan

## Approach

As Retro (080): first the fonts join the bundled ones, then the template lives in
`src/templates/freelance/` and registers itself, built on the shared pieces (`resolveSections`,
`contactIcons.ts`, `languageLevelScore`, solid shapes and inline SVG for the direct PDF). One shared
addition: the direct PDF draws a grey image when the template asks for it.

## Implementation

### 1 · Dela Gothic One and Work Sans
1. `package.json` / lockfile: `@fontsource/dela-gothic-one` and `@fontsource/work-sans`, pinned to
   `5.3.0` (approved by the owner for this spec).
2. `src/styles/fonts.css`: `@font-face` rules, Latin and Latin Extended, each with its
   `unicode-range`, generated from Fontsource's CSS as the others were. Dela Gothic One 400 (its only
   weight); Work Sans 400, 500, 600, 700 and 400 italic.
3. `src/services/export/pdfFonts.ts`: the `.woff` twin of every new face.
4. `src/core/stylePresets.ts`: both in `FONT_OPTIONS`, `bundled: true`, with their descriptions in the
   nine dictionaries.
5. Tests: `bundledFonts.test.ts` (the new CV families), `pdfDirect.test.ts` (the face count).

### 2 · A grey photo in the direct PDF
1. `src/services/export/pdfDirect.ts`: when an image's computed `filter` has `grayscale(…)`, its bytes
   are re-encoded through a canvas with that filter (as the shadows already use `ctx.filter`); no
   filter, the bytes as today.
2. Test in `pdfDirect.test.ts`: an image with `filter: grayscale(1)` goes through the canvas, one
   without does not.

### 3 · The template
1. `src/templates/freelance/index.ts`: `id: 'freelance'`, supports `photo`, `sidebar`, `accentColor`,
   `customFont`, `multiPage`, `skillLevels`; defaults accent coral (`#ff6b61`, sampled from the
   reference), Work Sans; tags two-column, photo, bold; its own palette.
2. `src/templates/freelance/Template.vue`:
   - The root paints the paper on every page (a `::before` restored on paged.js's
     `[data-split-from]` fragments, as Retro); no `::after` (the direct PDF ignores `z-index`).
   - Cards: a thin ink border and a solid `box-shadow` offset down-right, the paper as background.
   - The corner shape is an inline SVG placed before the cards in the markup, so the direct PDF
     paints it first and the cards cover it, as `z-index` does in the preview.
   - Header card: the photo (`filter: grayscale(1)`, `object-fit: cover`) at the left, full height,
     with the wireframe sphere as inline SVG behind it; name in Dela Gothic One, headline.
   - `<aside data-side>`: about me (summary, contacts with `contactIcons.ts`), skills (bars from
     `level`, groups named smaller), languages (bar from `languageLevelScore`); main: education and
     experience as two-column grids of entries, custom sections. `SIDE_KINDS = new Set(['summary',
     'skills', 'languages'])`.
   - Titles use `'Dela Gothic One'` fixed; everything else `var(--cv-font)`.
3. `src/templates/freelance/thumbnail.ts`: an SVG thumbnail in the style of the others.
4. `templates.freelance.description` and the palette's colour names in the nine dictionaries.
5. `tests/freelanceTemplate.test.ts`: columns, cards, photo / no photo (no shape), the grey filter,
   empty name or headline, two-column entries, skill bars and none without a level, language bars
   only for recognised levels, display titles.
6. Template lists that name every id: `tests/templateRender.test.ts`, `tests/longWords.test.ts`,
   `qa/e2e/perf.cjs`, `qa/e2e/fidelity.cjs`, `qa/e2e/flows.cjs`.

### 4 · Verification
`npm test`, `npm run build`, `qa:e2e`, `qa:pdf`, `qa:roundtrip`, `qa:consistency`, `qa:security`;
screenshots with the sample CV (photo / none, default accent / dark); the criteria marked; roadmap
to "Done".

## Risks

- **Two-column entries in the PDF import**: entries side by side can interleave their lines. Retro's
  two-column education came back whole; if `qa:roundtrip` shows experience mixed, the entries are
  laid so each one's lines are read together (a row per pair, the left entry first), and the spec
  notes what changed.
- **A card split across pages**: paged.js cuts the box; the border and shadow are kept on both pieces
  (the open edges closed by the fragment rules), checked by `qa:pdf` with a long CV.
- **Narrow columns**: about 43 mm per entry; long words break (`longWords.test.ts`) and highlights
  wrap.
- **Bundle size**: new WOFF2 files fetched only when a CV uses them; the WOFF twins only in the lazy
  PDF chunk.
