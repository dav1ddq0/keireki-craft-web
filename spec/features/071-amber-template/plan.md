# 071 · Amber: Plan

## Approach

Two steps. First Raleway joins the bundled fonts the same way the others did in spec 026; then the
template lives in `src/templates/amber/` and registers itself, built on the pieces Cobalt and
Monogram already use (side column first in the markup, full-height side band, `contactIcons.ts`,
`LevelDots`, diagonals as solid shapes for the direct PDF).

## Implementation

### 1 · Raleway
1. `package.json` / lockfile: `@fontsource/raleway` pinned to `5.3.0`, like the other Fontsource
   packages (approved by the user for this spec).
2. `src/styles/fonts.css`: `@font-face` rules for Raleway 400, 600, 700, 800 and 400 italic, Latin and
   Latin Extended, each with its `unicode-range`, generated from Fontsource's combined CSS as the
   others were.
3. `src/services/export/pdfFonts.ts`: the `.woff` twin of every new face in `WOFF`, so the direct PDF
   embeds it.
4. `src/core/stylePresets.ts`: `{ id: 'raleway', label: 'Raleway', value: "'Raleway', 'Segoe UI',
   system-ui, sans-serif", bundled: true }` in `FONT_OPTIONS`.
5. Tests: `bundledFonts.test.ts` already checks the faces are Latin / Latin Extended from installed
   packages, each with its `unicode-range`, and that an option is marked bundled exactly when it
   ships; Raleway joins its list of CV families. `pdfDirect.test.ts` already checks every face has
   its `.woff` twin; its face count goes from 69 to 79.

### 2 · The template
1. `src/templates/amber/index.ts`: `id: 'amber'`, supports `photo`, `sidebar`, `accentColor`,
   `customFont`, `multiPage`, `skillLevels`; defaults accent `#e8a200`, Raleway; tags two-column,
   photo, bold; its own palette of warm accents.
2. `src/templates/amber/Template.vue`:
   - `<aside data-side>` first: photo (drop frame: `border-radius: 50% 50% 50% 0` and a white ring),
     contact with icons, education, languages. `SIDE_KINDS = new Set(['education', 'languages'])`.
   - Main: header (name with the last word in a span, headline), then the rest of `sections` in order.
   - Timeline: a `border-left` per column, an accent bar per title, a dot per entry (pseudo-elements,
     background colours only).
   - Section icons: small inline SVG paths per section kind (summary, experience, education, skills,
     languages, contact, a generic one for custom sections), our own drawings.
   - Corner triangles as inline SVG (the direct PDF draws SVG shapes, not gradients or `clip-path`;
     spec 049/050).
   - Colours derived from the accent and a fixed charcoal; text on the accent uses the readable ink
     (spec 005), the accented name `--cv-accent-text` (spec 006).
3. `src/templates/amber/thumbnail.ts`: an SVG thumbnail in the style of the others.
4. `templates.amber.description` in the nine dictionaries (`es` first; `i18nDictionaries.test.ts`
   guards the keys).
5. `tests/amberTemplate.test.ts`: columns, the accented last word (and a one-word name), photo / no
   photo, empty name, skills with and without levels.
6. Template lists that name every id: `tests/templateRender.test.ts` (two-column),
   `qa/e2e/perf.cjs`, `qa/e2e/fidelity.cjs`, `qa/e2e/flows.cjs`.

### 3 · Verification
`npm test`, `npm run build`, `qa:e2e`, `qa:pdf`, `qa:roundtrip`, `qa:consistency`; screenshots in the
scratchpad with the sample CV; the spec's criteria marked; roadmap.

## Decisions

- **Education in the side column**, as the user chose. Cobalt and Monogram keep it in the main
  column because paged.js drops what follows an overflowing side column; here the existing warning
  (spec 033) tells the user, and education entries show school, degree and years in small type, with
  the description below in the same size.
- **No preset in the model**: references and other custom sections go in the main column (out of
  scope in the spec).
- **Five Raleway faces** (400, 600, 700, 800, 400 italic): 800 for the name and titles, 700 for
  entry titles, 600 for labels, italic for the organisation, as in the reference. 900 is left out.
- **Charcoal fixed, not derived from the accent**: the column must stay dark with any accent; the
  accent only colours the triangles, bars, dots and the last word of the name.

## Risks

- **Long education overflows page one's side column**: warning of spec 033; the sample CV must fit;
  checked in `qa:roundtrip`.
- **Heavy capitals in long languages** (German, Basque titles) wrap in the 360 px preview:
  `qa:consistency`, and `overflow-wrap` on titles.
- **Bundle size**: ten new WOFF2 files, fetched only when a CV uses Raleway; the WOFF twins only in the
  lazy PDF chunk.
- **PDF import of Amber**: the side column comes first in the text; `qa:roundtrip` shows whether the
  heuristics recover education there, as they do for Banner.
