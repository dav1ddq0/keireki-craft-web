# 076 · A home that shows the product

**Status:** done

## What it does

The first-run screen (`WelcomeView`, spec 019) becomes a short home page. It is built from the
app's own vocabulary (the same buttons, chips, cards, type scale and colours as the editor, My CVs
and Import), so it reads as the first screen of the app, not as a separate marketing site.
A visitor with no CV saved sees, top to bottom:

1. **Hero.** The title "Tu CV, en tu navegador. Y en ningún otro sitio.", one line on what the app
   does, then **Crear mi CV** (filled button), **Importar mi PDF** (outlined) and **Cargar un
   ejemplo** (text button). Under them, the welcome's check list, now: {n} plantillas ·
   {n} idiomas · Sin cuenta · Sin analítica.
   Beside it (above it on a phone), the **sample CV rendered live** in the interface language on a
   sheet like the editor's preview, with a row of template chips: the same CV changes design,
   nothing is retyped.
2. **How it works.** Three steps with the wizard's numbered circles: start as you like (blank,
   sample, PDF), write with the wizard and its live preview, download (PDF, HTML, JPG, JSON).
3. **Templates.** Four of them, Classic, Cobalt, Editorial and Aurora (chosen by the owner;
   there is no usage data), as cards with their thumbnail and **Usar**, and a link to all of them.
4. **Your data.** Two questions, one card each: where the CV is stored, and what happens on another
   computer or when the browser clears its data (the JSON copy, the low-space warning).
5. **Closing.** One line and **Crear mi CV** again, then a muted footer line: Keireki Craft · MIT
   licence · the GitHub link.

**Usar** on a template, and a chip followed by **Crear mi CV**, start a blank CV in that template.

Returning visitors are unchanged: with a CV saved, the app opens the editor as it does now.

## Why

The welcome is three cards on an empty page: it says what to click, not what the product is.
A first visit should show, before any click, the two things that set Keireki Craft apart: the CV
never leaves the browser, and one CV can wear any template. The reference studied (a commercial
CV builder's landing) shows the product in the hero and offers import from the first screen; this
keeps those two ideas and drops what does not apply (AI headline, ratings, employer logos, a
cookie banner).

The structure was agreed on a canvas (https://claude.ai/artifact/VNta2NGB4nKG6NKveS22Ju); its
marketing styling (dark band, wide display type, orange underline, colour blocks) was then
dropped by the owner for consistency with the app.

## Acceptance criteria

- [x] First run (no CV stored) shows the home; with a CV stored the editor opens as before, and a
      reload after any of the actions does not show the home again (spec 027 kept).
- [x] **Crear mi CV** (both) opens the wizard on a stored blank CV; **Importar mi PDF** opens
      Import; **Cargar un ejemplo** opens the sample CV in the interface language.
- [x] The hero renders the sample CV with the real template component (no image); each chip changes
      it, the selected chip has `aria-pressed="true"`, and **Crear mi CV** then starts in that template.
- [x] **Usar** on a template card starts a blank CV in that template.
- [x] The counts come from the template registry and `LOCALES`, never typed in.
- [x] Only existing components and tokens: `BaseButton`, `m3-chip`, `TemplateThumb`, the M3 type
      scale and colour roles, `--shape-*`. No new token, no hard-coded colour.
- [x] Every string is in the nine dictionaries (`i18nDictionaries` test passes); no claim the
      README does not support.
- [x] **Light and dark themes, both required.** Every section follows the theme picked in
      Preferences (and the system's, when it follows the system), with no rule of its own: surfaces,
      text, borders, buttons, chips and thumbnails switch together. The hero's CV stays a white sheet,
      dimmed in dark like the editor's preview. Text contrast ≥ 4.5:1 in both, focus ring visible in both.
- [x] `npm run qa:consistency` walks the home in light and dark (it already grabs the welcome on
      every format and theme it checks) with no new finding.
- [x] 1440, 1024 and 390 px wide: no horizontal overflow, hero stacks on a phone, targets ≥ 48 px
      (the M3 target the app uses).
- [x] Keyboard: every action is a real button or link, in reading order; the chips are a labelled group
      (checked by structure: the unit test and the e2e find them by role; no keyboard walk recorded).
- [x] No new dependency, no new font file, no image added to the build.
- [x] `npm test`, `npm run build`, `npm run qa:e2e` pass (the welcome checks updated).

## Out of scope

- A separate marketing page for search engines (prerendered HTML, its own URL). The home lives
  inside the app; SEO stays with `index.html`'s meta and `og-image.png` (spec 066).
- A screenshot of the editor in "How it works" (decided in `plan.md`).
- Showing the home to returning visitors, or a way back to it from the menu.
- Popularity data for templates: there is no analytics, by design.
