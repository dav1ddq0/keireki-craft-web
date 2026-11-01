# Roadmap

_Order and status of features. Each entry points to its folder under `features/`._

## Done ✅

_Completed before this SDD process was adopted; listed here for context, not tracked as `features/XXX-...` folders. See `spec-cv-editor-en.md` for the original phased spec._

1. **Phase 1 — Core**: `CVData` model, store with persistence, full wizard, `classic` template, live preview, PDF export, JSON import/export.
2. **Phase 2 — Templates**: auto-discovery registry, `modern` and `compact` templates, style tokens, uneven capabilities, HTML export, paged.js.
3. **Phase 3 — PDF import**: pdf.js extraction, heuristics, review screen with manual assignment.
4. **Phase 4 — Polish**: multi-CV management, section reordering, custom sections, mobile layout, undo/redo.

## Done with SDD ✅

- **001** · Visual template elements: level indicator, `meridian`, `banner`
- **002** · Design panel: five-colour palette, curated font list, CV language selector
- **003** · Skill levels: schema v2 (`{ name, level? }`), skills form, level indicator variants
- **004** · Template families: `ledger`, `harbor`, `frame`
- **005** · Readable ink on accent backgrounds, `chevron`, `facet`
- **006** · Text-safe accent colour (`--cv-accent-text`) for light accents
- **007** · Code review of 001–006 and its fixes
- **008** · Interface contracts: `skillLevels` capability, i18n key guard
- **009** · Modern file upload (photo and import)
- **012** · Section library (presets over custom sections)
- **013** · Mobile experience (touch-first flow: step sheet, dock, bottom sheets, fitted preview)
- **014** · Optional personal data (date/place of birth, nationality, licence, marital status)
- **015** · GitHub Pages deployment (analysis; the workflow was already in place)
- **016** · Mobile polish (one-row header and dock, menu sheet, two panes on tablets and landscape)
- **017** · Security hardening (import validation, CSP, least-privilege CI, dependency advisories)
- **018** · Desktop redesign (step rail, header with Export, export dialog, collapsible entries, preview toolbar, My CVs grid)
- **019** · Desktop redesign, second part (template filters, CEFR picker, System theme, first-run chooser, preview section outline, side-by-side PDF review)
- **020** · Housekeeping (favicon, base path, README deployment, CI Node 24, photo type and size checks)
- **021** · Per-CV template (`meta.templateId`, schema v4; My CVs shows each CV's template and accent)
- **022** · PDF page breaks (blank first page fixed, print rules applied when paginating, per-section "New page", schema v5)
- **023** · CV suggestions (score and concrete advice in the Export step, from a pure function over `CVData`)
- **024** · PDF file name and print guidance (`<name> – CV.pdf` suggested by the print dialog)
- **025** · Photo crop and zoom (frame before storing: drag, zoom, rotate; 800 px JPEG; preview refreshes on replace)
- **026** · Bundled fonts (Fontsource, served from the app; PDF and HTML export use them)
- **027** · Fixes from the functional review (blank CV stored, phone export on the last step, Fit ≤ 100 %, screen-reader names)
- **028** · Vue best-practices pass (async races in the preview and crop dialog, custom-section store actions, `DateRangeFields`, `useModalDialog`, Vue 3.5 idioms)
- **029** · Material 3 interface (M3 tokens and components, Roboto Flex, System theme by default, `theme-color`, no glare in dark, 48 dp targets, fonts by need)
- **030** · Expand the preview on desktop (the rail folds to a navigation rail, Esc to return) and zoom no longer cuts the page
- **031** · Direct PDF download (no print dialog: the paginated pages redrawn as a text PDF with PDFKit, fonts embedded; print stays)
- **032** · The side column stays on page one (Banner, Harbor, Facet, Chevron: side column first in the markup)
- **033** · Side bands to the foot of every page, a warning when the side column cannot fit page one, e-mails and URLs wrap at sensible points
- **034** · Import hardening from a security review (typed import, education `null` kept, no control/bidi characters in PDF names, pdf.js without eval)
- **035** · Review fixes: dashed and dotted borders in the direct PDF, untested branches covered, browser checks in `qa/` (`npm run qa`)
- **036** · The print no longer ends in a blank page (paged.js's break after the last page lifted)
- **037** · Upload → download → upload fixes (a JSON photo shows after import, PDF import keeps touching pieces of a word together, file names keep Ł, Ø and ß)
- **038** · Desktop polish (month and year fields in the UI language, lighter rounded fields, highlights as rows, export checks contrast)
- **039** · The app is called Keireki Craft (name, `KC` mark, storage and preferences migrated from the old name)
- **040** · PDF import recovers more of the CV (columns read in order, entries from several cells, skills and languages as templates lay them out; 24 → 104 of 104 on the round trip)
- **041** · The page no longer rearranges while a PDF is built (paged.js's copy of the CSS came after the original and won the ties)
- **042** · Vue best-practices pass over the latest components (the startup notice and the month-date rules out of the root and the field)
- **043** · Design consistency: the interface uses the type scale, one button style, the weights and elevations of the tokens, and `qa:consistency` keeps it so
- **044** · A slider that looks like the rest of the app (the style step's two range inputs)
- **045** · Consistency everywhere: one view title, spacing on the 4 px grid, the browser suite over a device matrix
- **046** · Cobalt: a template with a tinted header, a round photo and a pale sidebar
- **047** · A guard against being framed (clickjacking on hosts that cannot send headers)
- **048** · Transitions: steps slide, views fade, the preview toggles use View Transitions
- **049** · Monogram: a diagonal two-tone header with initials or a photo; LinkedIn and GitHub icons
- **050** · The PDF download looks like the page: stand-in fonts for Georgia/Arial/Times, SVG boxes, ring shadows, round strokes
- **051** · What 050 left: Palatino, Tahoma and Verdana stand-ins, and soft shadows in the PDF
- **052** · The open doubts, one at a time (long sidebars, fonts on screen, shadows, scans, palette…)
- **053** · Visual gaps on the phone (the style preview over the step bar, a focus ring on the sheets' close button)
- **054** · The preview's template button, only where it does something (hidden on the style step)
- **055** · The paginated view no longer turns the dark theme white (paged.js gets no print-only rules)
- **056** · Phone: a country code selector with the flag, the default country detected from the IP (language/time zone as fallback)
- **057** · French, Italian, Portuguese and German: the CV and the interface
- **058** · The GitHub and LinkedIn links show the networks' own marks
- **059** · The sample CV in the interface language, with a local person for each
- **060** · PDF import in French, Italian, Portuguese and German (headings, months, levels)

## Next 🔜

<!-- Add the next feature as `XXX · <Name>` once its features/XXX-.../spec.md exists. -->


## Backlog / ideas 💡

- **Phase 5–6 — Backend**: stateless FastAPI service, then sync. Out of scope for v1; the app must stay fully usable with the backend permanently absent.

> Every new feature is created as `features/XXX-feature-name/` with `spec.md`, `plan.md`, and `tasks.md` before any code is touched.
