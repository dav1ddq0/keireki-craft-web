# 086 · The live preview shows where a page break is: Tasks

- [x] 1 · `measureBreakMarks`, the marks in `PreviewPane`, the string in nine languages; unit tests — commit: ef2f303
- [x] 2 · Verification: screenshots, `npm test`, build, `qa:e2e`; criteria marked; roadmap to "Done"
  - The user's CV (Minimalist, a break before the Summary): the mark 4 px above the Summary, as wide
    as it, in light and dark, desktop and phone; Classic and Aurora the same; Banner (Summary in the
    side column) none. The mark follows two zoom steps, a longer Experience above, the switch off and
    on another section, and a change to Classic.
  - Dark theme: the theme's own primary (pale blue) hardly showed on the paper; the mark keeps the
    light theme's blue.
  - In a clean worktree of ef2f303: `npm test` 1210/1210, build OK, `qa:e2e` 231/231. `qa:pdf` not
    run: only the live preview changes, and no export renders it.
- [x] 3 · The two cases of criterion 3 left to a manual check, checked in Chromium (Playwright, dev server)
  - The user's CV (Minimalist), breaks before the Summary and the Education: each mark's top, left
    and width within 1 px of its section's, at every step.
  - Resizing the panel: the window at 1180, 1700, 1024 and 1440 px with the page fitted (scale 0.38
    to 0.87), then at 1180 and 1700 with a zoom the user picked (0.9).
  - A font that loads late: EB Garamond over a monospace fallback, its files held back 2.5 s. While
    loading (`document.fonts.status` "loading") the marks sit on the sections laid out in the
    fallback; when it arrives the Education moves up 40.6 px and its mark with it.
  - Mutation: without the `loadingdone` listener the Education's mark stays 40.6 px below its section.
