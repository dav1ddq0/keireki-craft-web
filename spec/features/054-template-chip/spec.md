# 054 · The preview's template button, only where it does something

**Status:** done

The preview toolbar (laptop and desktop) shows the template as a button, "Modern · Cambiar", that
takes you to the Template and style step. On that step the gallery is already on screen, so the
button did nothing: a control that looks live and is not.

## What it does

- On the Template and style step, with the form on screen, the button is not shown.
- With the preview at full width (the form hidden) it is shown on every step, that one included:
  there it brings the form, and the gallery, back.
- On every other step it is unchanged.
- The zoom controls stay on the right when the button is not there (`margin-inline-start: auto`).

## Acceptance

- Style step, form shown: no template button; zoom aligned right as on the other steps.
- Style step, full-width preview: the button is there and opens the gallery.
- Any other step: the button is there.

## Verification

`tests/previewToolbar.test.ts` covers the three cases (fails without the fix). At 1440 × 900
(Chromium): the zoom group is 12 px from the right edge with and without the button. `npm test`,
`qa:consistency` 12/12, `qa:e2e` 123/123.
