# 076 · Plan

## Approach

1. **`WelcomeView.vue` is rewritten in place**, same file, same `ui.view === 'welcome'` entry in
   `App.vue` and the same first-run rule. The existing app header stays above it (no second
   header; language and theme are already in Preferences). Sections are plain `<section>`s with
   headings `h1`/`h2`/`h3` in order.
2. **Consistency, component by component** (nothing new is styled from scratch):
   | Home element | Taken from |
   |---|---|
   | Page container | My CVs: `max-width: 1180px`, `padding: 20px`, centred, `gap` between sections |
   | Title | The welcome's `.title` today: `clamp(--size-28, 4vw, --size-32)`, weight 700 |
   | Section headings | `.view-title` (24 px, 700) |
   | Lead and hints | `--type-body-large`, `--text-muted` |
   | Buttons | `BaseButton`: `primary` (Crear mi CV), `secondary` (Importar mi PDF), `ghost` (Cargar un ejemplo) |
   | Template chips | `m3-chip` + `m3-state` with `aria-pressed`, in a wrapping row (scrolling on a phone) |
   | Preview sheet | The editor preview's paper: white sheet, shadow, on `--surface-2`, with the `cv-preview-paper` class so dark dims it (`brightness(0.88)`, `app.css`) |
   | Check list | The welcome's `.points` with the `--md-success` check |
   | Step numbers | The wizard's step circles (`StepRail`): 28 px circle, `--md-primary-container` |
   | Template cards | The style step's gallery card: `TemplateThumb` + name, `--border`, `--shape-lg` |
   | Your-data answers | Import's `.card` (`--surface`, `--border`, `--radius`) |
   | Footer line | The sidebar's privacy note: `--type-body-small`, `--text-muted` |
   Colours come only from the semantic aliases (`--text`, `--text-muted`, `--accent`, `--surface`,
   `--surface-2`, `--border`), so the dark theme needs no rule of its own. `TemplateThumb` already
   maps its drawing to the dark roles. Checked in both themes: `qa:consistency` grabs the welcome in
   light and dark at 1440×900, iPad and phones; the e2e block adds a dark pass at 390 px.
3. **Hero preview: the real template.** `CvRenderer` (`data`, `templateId`) renders a
   `createSampleCV(locale)` kept in a local `computed`, never stored, in a fixed-height frame,
   scaled with a CSS `transform` from its A4 width and clipped at the bottom. A local
   `previewTemplate` ref drives it. Chips: Classic, Aurora, Cobalt, Editorial, Monograph, Harbor,
   Facet, Banner, and a "Ver todas" link to the template section.
4. **Template section: `TemplateThumb`**, the authored SVGs used by the style step and the phone
   sheet. Four live renders would load four template components and their fonts on first paint.
5. **Starting in a template.** `startBlank(templateId?)`: `await cv.createNew()`, then
   `cv.chooseTemplate(templateId)`, the style step's gallery pick (it also takes the template's own
   accent and face while the user has none, and stores it as the last template). The hero starts on
   the default template (Classic) and **Crear mi CV** uses the one shown: what you see is what you
   get. "Ver las {n} plantillas" starts the same way and opens the style step, where all of them are.
   No store or model change, so no migration.
6. **Counts:** `templates.length` and `LOCALES.length`.
7. **i18n:** the `welcome` block gets the new keys in the nine dictionaries at once (they are typed
   `typeof es`). The old keys no longer shown (`blankTitle` … `pdf`) were removed, approved by the
   owner. Spanish and English written from the canvas; the
   other seven translated, Catalan, Valencian and Basque flagged for a native review as in spec 070.
8. **Layout:** grid/flex with `gap`, `auto-fit` columns; the hero is a wrapping row that stacks
   under ~720 px. No breakpoint logic in script.

## Decisions

- **The app's look, not the canvas's.** Owner's call: the canvas's dark facts band, 800-weight wide
  display type, orange underline and blue closing band are dropped. The facts join the existing
  check list; the closing is a line and a button.
- **No editor screenshot.** It would be one Spanish, light-theme picture shown in nine languages and
  both themes, and about 240 KB more for the offline install (spec 067). The live hero already shows
  the product.
- **Thumbnails, not renders, in the template section** (point 4).
- **Same file, not a new `HomeView`**: the welcome's tests, QA checks and `App.vue` wiring keep
  their names; the change is one component.

## Files

- `src/components/documents/WelcomeView.vue` — rewritten.
- `src/i18n/{es,en,fr,it,pt,de,ca,ca-valencia,eu}.ts` — `welcome` keys.
- `tests/welcomeView.test.ts` — new structure, template start, counts, aria-pressed.
- `qa/e2e/flows.cjs` — the heading text; overflow at 390 / 1024 / 1440.
- `spec/constitution/roadmap.md` — 076 in "Next", then "Done".
