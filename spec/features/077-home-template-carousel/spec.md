# 077 · The home's preview turns through the templates by itself

**Status:** done

## What it does

The hero of the home (spec 076) shows the sample CV in one template at a time, and it changes by
itself: the sheet drifts a few degrees, then **turns on its vertical axis in 0.8 s and comes out as
the next template**, then drifts again. It is a showcase, not a picker:

- **No chips.** The row "Mismo CV, otra plantilla:" with its chips and "Ver todas" goes; nothing in
  the preview can be chosen.
- **The template's name** identifies each one, in a small label on the sheet that turns with it.
- **What can be adjusted in it**, in two cards overlapping the sheet's edge, turning with it (as in
  the reference): **Color de acento**, the template's accent marked among the style step's suggested
  colours; and **Tipografía**, a few of the style step's fonts, each in its own face, the template's
  marked, only on templates whose font can be changed. Hidden on narrow screens (under 600 px), where
  they would cover the sheet.
- The sheets are the **real templates rendered live** with the sample CV in the interface language,
  in each template's own accent and face, as today (no screenshots).
- **Crear mi CV** starts in the default template, whatever the carousel shows.
- A **pause / play** button in a corner of the preview stops it and starts it again.

Order: the eight templates the chips showed (Classic, Aurora, Cobalt, Editorial, Monograph, Harbor,
Facet, Banner), in a loop.

## Why

The chips asked the visitor to do something before they knew what the product was; the owner
wants the preview to show, unasked, that one CV can wear every design. The motion is the one the
owner chose from a commercial CV builder's landing (studied with REA: a CSS 3D card with two faces,
a slow drift and a quick turn, the hidden face changing CV while it faces away). The mechanism is
reused; none of its images, texts or cards.

## Acceptance criteria

- [x] The hero shows the sample CV in one template, rendered by its real component, with the
      template's name on the sheet; no chips, no "Ver todas" in the hero.
- [x] Every 4 s it turns to the next of the eight templates: about 3.2 s of drift (0° to 10°) and a
      0.8 s turn (10° to 170°, and on the way back 185° to 360°); the next template is never seen
      changing (it changes on the face turned away).
- [x] Each face shows a **Color de acento** card (the template's accent marked, the style step's
      `PALETTE` beside it) and, only if the template supports `customFont`, a **Tipografía** card (the
      template's font marked, each name in its face); the values come from the template and the style
      step, never typed in; no cards under 600 px wide.
- [x] The pause button stops the motion where it is and shows "play"; pressed again it continues.
      It is a real button with a label in the nine languages, a ≥ 48 px target, visible focus.
- [x] `prefers-reduced-motion: reduce`: no motion and no timer; the first template stands still with
      its name.
- [x] Nothing runs while it cannot be seen: the motion stops with the tab hidden and with the hero
      scrolled out of view, and resumes when it is back.
      (Tab hidden: unit test; out of view: checked in the app, scrolling `main.scroll-view`.)
- [x] **Crear mi CV** (both) starts a blank CV in the default template; **Usar** on a template card
      and the rest of the home are unchanged.
- [x] The preview stays a picture for assistive technology (`aria-hidden`, `inert`), as today; the
      pause button is outside it.
- [x] Light and dark themes, 1440 / 1024 / 390 px: no horizontal overflow, the turn stays inside the
      frame, the name label readable (contrast ≥ 4.5:1) in both themes.
- [x] Only existing tokens and components; no new dependency, font or image.
- [x] `npm test`, `npm run build`, `npm run qa:e2e` (the home block updated), `npm run qa:consistency`
      pass: 1034 tests, qa:e2e 199/199, qa:consistency 13/13 over 425 views (its `settled` no
      longer waits for an endless animation).

## Out of scope

- Choosing a template from the hero (the chips of spec 076 are removed on purpose).
- Swiping or dragging the carousel.
- The templates section, How it works, Your data and the footer (unchanged).
