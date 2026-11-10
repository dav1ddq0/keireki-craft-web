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
