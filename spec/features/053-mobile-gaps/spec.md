# 053 · Visual gaps on the phone

**Status:** done — the check on a real iPhone (Safari) is left to the user; WebKit cannot run on this machine

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

Opened by a tap, the export sheet showed the close button with its keyboard focus ring (and the
focused state layer), a ring that also overlapped the first card.

Cause: `showModal()` focuses the first focusable element, the close button, and Safari matches
`:focus-visible` on it even when the dialog was opened by pointer. A WebKit bug, open since 2022 and
confirmed on iOS in 2026 ([247416](https://bugs.webkit.org/show_bug.cgi?id=247416), duplicate
[309245](https://bugs.webkit.org/show_bug.cgi?id=309245)); Chrome and Firefox focus the same button
without the ring. Under the 48 px button the sheet's header left 2 px, and the ring reaches 4 px out.

Fix, in `BottomSheet` (so every sheet: export, menu, step picker, document actions, custom-section
picker):
- `autofocus` on the `<dialog>`: the sheet itself takes the focus on open. Safari does so since
  18.6 (tests by [Manuel Matuzović](https://www.matuzo.at/blog/2023/focus-dialog), 2023 and 2025;
  16.5 still focused the first control), Firefox too; Chromium ignores it and keeps the close
  button, which it does not ring. Tab then goes to the close button.
- The sheet, not being a control, shows no ring of its own (`.sheet:focus-visible`).
- 8 px under the header instead of 2, so the close button's keyboard ring stays off the content.

If Safari still rang the button, the fallback is focusing the dialog after `showModal()` in
`useModalDialog`.

Verification: `tests/bottomSheet.test.ts` (the autofocus, no sheet ring, room for the ring), fails
without the fix. In a phone viewport, Firefox: the focus lands on the sheet with no ring, Tab rings
the close button clear of the first card; Chromium: the close button, no ring. WebKit cannot run on
this machine: the user checks on the iPhone. `qa:consistency` 12/12, `qa:e2e` 123/123 (Chromium).

## 3 · Pinned, the style preview let scrolled content show at its bottom corners

Found while fixing 1: the strip's bottom corners are rounded and nothing covered the form scrolling
under them, so pinned, the fields showed through the two corners.

Fix: a third solid shadow of the page colour, one corner radius (`--shape-lg`, 20 px) down, covers
them; unpinned it stays inside the step's 24 px gap to the gallery. The strip's 1 px border is now
the first shadow, so neither cover hides it (the top border was hidden before).

Verification: the `qa:consistency` check now also measures what a pinned element paints below
itself against the distance to what follows it; a 32 px shadow fails it (`div.strip paints 32px
down, 24px to section.block`, Pixel 7). Screenshots pinned at an iPhone 15 Pro viewport (Chromium).

