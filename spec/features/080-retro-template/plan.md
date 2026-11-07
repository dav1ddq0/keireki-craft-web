# 080 · Retro: Plan

## Approach

As Amber (071): first the fonts join the bundled ones the way Raleway did, then the template lives in
`src/templates/retro/` and registers itself, built on the shared pieces (`resolveSections`,
`contactIcons.ts`, `onAccent` / `accentText`, solid shapes for the direct PDF).

## Implementation

### 1 · Roboto Slab and Montserrat
1. `package.json` / lockfile: `@fontsource/roboto-slab` and `@fontsource/montserrat`, pinned to
   `5.3.0` (approved by the owner for this spec).
2. `src/styles/fonts.css`: `@font-face` rules, Latin and Latin Extended, each with its
   `unicode-range`, generated from Fontsource's CSS as the others were. Roboto Slab 400 and 700 (the
   name and titles); Montserrat 400, 500, 600, 700 and 400 italic.
3. `src/services/export/pdfFonts.ts`: the `.woff` twin of every new face.
4. `src/core/stylePresets.ts`: both in `FONT_OPTIONS`, `bundled: true`, with their descriptions in the
   nine dictionaries as Raleway's.
5. Tests: `bundledFonts.test.ts` (the new CV families), `pdfDirect.test.ts` (the face count).

### 2 · The template
1. `src/templates/retro/index.ts`: `id: 'retro'`, supports `photo`, `sidebar`, `accentColor`,
   `customFont`, `multiPage`, `skillLevels`; defaults accent mint (`#8be0d4`, sampled from the
   reference), Montserrat; tags two-column, photo, bold; its own palette.
2. `src/templates/retro/Template.vue`:
   - The frame: solid boxes behind the sheet, the accent above and ink at the bottom, and a thin ink
     line around the white sheet; repeated on every page as Amber's side band is (pseudo-elements on
     the root, set again on paged.js's `[data-split-from]` fragments).
   - Header: greeting (`GREETINGS` per CV language, in the template), the name in Roboto Slab 700,
     the headline in a black tab; the photo in an ink ring with the triangle as inline SVG; the
     zig-zag as inline SVG; contact row with `contactIcons.ts`.
   - Summary band across the page; then `<aside data-side>` with skills (one tab per group: the
     group's category, else the section's title) and languages; main: experience, education (two
     columns, dotted divider), custom sections. `SIDE_KINDS = new Set(['skills', 'languages'])`.
   - Headings use `'Roboto Slab'` fixed; everything else `var(--cv-font)`.
   - Text on the accent uses `onAccent`; the pale band and side column are the accent mixed with
     white, so any accent stays light behind ink text.
3. `src/templates/retro/thumbnail.ts`: an SVG thumbnail in the style of the others.
4. `templates.retro.description` in the nine dictionaries.
5. `tests/retroTemplate.test.ts`: columns, greeting per language and none without a name, photo / no
   photo (no ring, no triangle), empty headline (no tab), tabs per skill group (category or section
   title), levels as text.
6. Template lists that name every id: `tests/templateRender.test.ts`, `tests/longWords.test.ts`,
   `qa/e2e/perf.cjs`, `qa/e2e/fidelity.cjs`, `qa/e2e/flows.cjs`, and the `qa:pdf` / `qa:roundtrip`
   lists if they name ids.

### 3 · Verification
`npm test`, `npm run build`, `qa:e2e`, `qa:pdf`, `qa:roundtrip`, `qa:consistency`; screenshots with
the sample CV (photo / none, default accent / dark); the criteria marked; roadmap to "Done".

## Risks

- **The greeting read as the headline or summary by the PDF import**: the name is found as the
  largest line, so the greeting does not join it; if `qa:roundtrip` shows it elsewhere, the
  heuristics drop a line that is exactly a known greeting.
- **The frame across pages**: the direct PDF draws backgrounds and SVG, not gradients or
  `clip-path`; the frame is solid boxes. `qa:pdf` compares print, direct and preview.
- **A long skills column** overflows page one: warning of spec 033; the sample CV must fit.
- **Bundle size**: new WOFF2 files fetched only when a CV uses them; the WOFF twins only in the
  lazy PDF chunk.
