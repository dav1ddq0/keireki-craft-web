# 053 · Visual gaps on the phone

**Status:** in progress

Seen by the user on an iPhone 17 (Safari, iOS 26), two screenshots: something paints over a piece
of the interface where nothing should. One commit each.

## 1 · The style preview painted over the base of the step bar

On the Template and style step the step bar ("Plantilla y estilo · 8 de 9") had a light, rounded
band over its lower edge, as if a second card sat on it.

Cause: the phone's pinned style preview (`StylePreviewStrip`) hides the form's top padding with a
solid shadow of the page colour, `0 -2em 0 0 var(--bg)`. That shadow reached 28 to 32 px up, but the
gap to the step bar is 16 px, and the strip (`z-index: 2`) is above the bar: unpinned, the shadow's
top 12 to 16 px, rounded, were painted over the bar.

Fix: what the strip paints above itself reaches exactly the wizard's gap (`--wizard-gap`, set by
`CvWizard`: 16 px, 8 px on a phone held sideways) — a `::before` band for the padding above and the
same-offset shadow for the strip's top corners. Unpinned it ends where the bar ends; pinned
(scrolled) it still covers the form's top padding.

Acceptance:
- Unpinned, nothing the strip paints reaches the step bar.
- Pinned, no scrolled content shows above the strip.

Verification: `qa:consistency` checks that whatever a pinned element of the form paints above itself
(solid shadow, `::before`) stays within the gap to the step bar, on every profile; with the old
shadow it fails (`div.strip paints 28px up, 16px to the bar`, Pixel 7). Screenshots pinned and
unpinned at an iPhone 15 Pro viewport (Chromium).

## 2 · The export sheet opened with a focus ring on its close button

Pending.
