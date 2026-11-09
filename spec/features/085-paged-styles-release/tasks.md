# 085 · A pagination releases only paged.js's styles: Tasks

- [x] 1 · `paginateInto` releases its polisher's styles; the mocks list theirs; the regression test — commit: f4b9a0e
- [x] 2 · Verification: `npm test`, build, the stress load, `qa:pdf`, `qa:e2e`; criteria marked; roadmap to "Done"
  - The regression test fails on 73c8f6f and passes with the fix. Stress load, 25 minutes: before,
    4 "converts" failures (cobalt, editorial), each traced to `releasePagination` removing the
    template's style; after, 100 runs of 108/108. In a clean worktree of f4b9a0e: `npm test`
    1207/1207, build OK, `qa:e2e` 231/231, `qa:pdf` 482/483 with the same results as after 082
    (the one failure is Monogram's longname4 italic, out of scope).
