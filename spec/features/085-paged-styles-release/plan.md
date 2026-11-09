# 085 · Plan

## Approach

- `paginateInto` (`src/services/export/pdf.ts`) keeps the previewer and, when it is done, takes the
  styles paged.js's polisher lists (`polisher.inserted`, one per sheet and its base, and
  `polisher.styleEl`) instead of comparing `<head>` before and after. The tagging and the release
  stay as they are.
- `src/pagedjs.d.ts` declares `polisher` on `Previewer`.
- The two test mocks of paged.js list their styles in a `polisher`, as the real one does; a new test
  adds a style of the page's own while the mock works and checks it survives the release.

## Decisions

- **paged.js's own list, not a filter on Vite's attribute.** The fault is in how we tell paged.js's
  styles apart, not in Vite; any style the page adds meanwhile is not ours to remove.

## Verification

- The new unit test fails on HEAD and passes with the fix; `npm test`, build.
- The stress load of the criteria, in a worktree with the trace of removed styles.
- `qa:pdf`, `qa:e2e`.

## Files

- `src/services/export/pdf.ts`, `src/pagedjs.d.ts`
- `tests/pdfPaginateStyles.test.ts`, `tests/pdfPaginate.test.ts`
- `spec/constitution/roadmap.md`
