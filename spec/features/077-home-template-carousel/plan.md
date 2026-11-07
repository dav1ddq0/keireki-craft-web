# 077 · Plan

## Approach

The reference's mechanism with the app's live templates: a frame with `perspective`, a rig with
two faces (front, and back turned 180°, both `backface-visibility: hidden`), each holding a
`CvRenderer` with the sample in one template. The rig turns with the Web Animations API; the face
turned away is given the next template while it cannot be seen.

## Implementation

1. `components/documents/HomeCarousel.vue` (new, used only by `WelcomeView`):
   - props: the template ids; renders the frame, the two faces (sheet scaled to the frame as today,
     plus the name label) and the pause button;
   - `rig.animate()` with the keyframes 0° → 10° (40 %) → 170° (50 %) → 185° (90 %) → 360°, 8 s,
     `ease` per segment, infinite;
   - on each frame of the animation (`requestAnimationFrame` while running), the face turned away
     is set to its next template: the back while the angle is under 90°, the front past 270°;
   - pause: `animation.pause()` / `play()`; `visibilitychange` and an `IntersectionObserver` pause
     and resume it without changing the button's state;
   - `matchMedia('(prefers-reduced-motion: reduce)')`: no animation created, first template shown.
2. `WelcomeView.vue`: the hero uses `HomeCarousel`; the chips, `previewId`, the "Ver todas" link and
   their styles go; **Crear mi CV** calls `startBlank()` without a template.
3. i18n: `welcome.carouselPause`, `welcome.carouselPlay` in the nine dictionaries.
4. Tests: `tests/homeCarousel.test.ts` (jsdom, `Element.animate` mocked): which template each face
   holds at a given time, the swap only on the hidden face, pause/play, reduced motion creates no
   animation; `tests/welcomeView.test.ts`: no chips, Crear mi CV starts in the default template.
5. `qa/e2e/flows.cjs` home block: the chips checks replaced by the carousel's (it turns, the name
   changes, pause stops it, reduced motion keeps it still, no overflow at three widths in both
   themes).

## Decisions

- **Live templates, not images**: as spec 076, the preview is the product itself; two renders at
  once (one per face).
- **Web Animations API, not a CSS animation**: the swap has to know the angle, and pausing and the
  tests need the animation as an object.
- **Crear mi CV in the default template**: the carousel is not a choice, so it must not decide the
  CV's template.

## Proposed removals (to approve)

The hero's chips make these unused; they are removed only if the owner approves:

- `welcome.previewLabel`, `welcome.previewGroup`, `welcome.seeAll` in the nine dictionaries;
- `PREVIEW_IDS`'s use as chips (the list stays as the carousel's order), `.chips`, `.see-all` and
  `.preview-label` styles in `WelcomeView.vue`.

## Risks

- **Two live renders cost**: only while visible (paused otherwise), and the templates are already
  loaded for the preview.
- **A face showing the wrong template for a frame**: the swap happens at most once per face per
  turn and only while that face is turned away; the unit test checks the angle ranges.
