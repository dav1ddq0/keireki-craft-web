# 065 · A README that shows the product

**Status:** done

Asked for by the user: improve the README after looking at how the best-known projects on GitHub
write theirs.

What those READMEs share (OpenResume and Reactive Resume, the closest projects; Excalidraw,
tldraw, LocalSend):
- The top sells the product: logo, one sentence, a link to the live app, a few badges.
- The product is seen: a demo GIF or a screenshot near the top; a grid of the resume templates.
- Features are told as what the user gets, in short groups with a bold label, not as a project
  history.
- Privacy has a section of its own in both resume builders.
- The technical part comes after: stack, structure, local development, contributing, license.

What is wrong with the current one: it opens with "Implementation of spec-cv-editor-en.md, phases
1 to 4", has no image and no demo link above the fold, tells the phase history, and is out of date
(3 templates named of 15, PDF import in 2 languages of 6, nothing on the six interface languages,
the JPG or copy image, the phone, Safari; nothing on the spec process or the QA suite).

Decisions (asked of the user):
- **English only.**
- **An animated GIF** of the editor.
- **The phase table goes.**

## 1 · Images

- `docs/readme-media.cjs` regenerates every image from the built app with Playwright, in English,
  with the English sample (Emma Clarke):
  - `demo.gif`: the headline typed into the form and the preview following it, then a few
    templates and an accent colour. It is the top of the README. Captured at twice the density
    and written 1600 px wide (task 4): at 880 px the text of the preview was blurred on a
    high-density screen, where GitHub shows the README's 880 CSS px with about 1760 real ones.
  - `templates-light.webp` / `templates-dark.webp`: the templates as one grid, the first page of
    each, named; GitHub picks the one matching its theme (`<picture>`).
  - `phone.webp`: the editor and the preview on a phone, side by side, on a transparent ground.
- The GIF is assembled from timed screenshots with Python's Pillow (not a project dependency;
  Playwright's own ffmpeg cannot write GIF). Stills are WebP.
- Into `docs/images/`.

## 2 · The README

In this order: centered header (logo, name, one sentence, links to the app, the features and
development, badges); the GIF; features in labelled groups; the template grid; privacy; getting
started (the app, then the commands, QA included); architecture (what is there today, updated and
shorter); how the project is built (specs in `spec/`, the QA scripts); browsers, deployment,
license, credits.

Verification: every link and image resolves; it reads in GitHub's light and dark themes.
