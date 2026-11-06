# 073 · The file name, where the CV is exported: Plan

_How what's described in `spec.md` gets implemented. Must respect `constitution/`._

## Approach

The name is chosen at export time and passed down to the download, so no stored data changes. One
default (`printTitle`) and one cleaning rule serve every format. The header input goes; renaming
moves to the My CVs sheet, which already holds Duplicate and Delete.

## Implementation

1. `services/export`: export the cleaning `printTitle` already does as `safeFileName(value)`, and a
   `fileName(data, chosen?)` that returns the cleaned choice or, when empty, `printTitle(data)`.
   `exportHtml` and `exportJson` take an optional name instead of slugifying.
2. `composables/useCvExport.ts`: `run(kind, name?)` uses `fileName(cv.data, name)` for PDF, JPG,
   HTML and JSON (print keeps `printTitle`, the document title).
3. A small `components/form/FileNameField.vue`: label, input, fixed extension, hint with the default
   when empty. Used by `ExportDialog.vue` (hidden for print), `ExportSheet.vue` (above the rows,
   which keep exporting on one tap) and `StepExport.vue` (above the options). Each holds the name
   in a local `ref`, reset to the default each time it opens.
4. `components/DesktopHeader.vue`: the `<input class="doc-title">` becomes a `<span aria-current="page">`
   with the name or "Untitled", ellipsis at 28ch. `tests/desktopHeader.test.ts` changes its first case.
5. `stores/cv.ts`: `rename(id, title)`: the open CV changes `data.meta.title` (autosave and undo as any
   edit); another one is loaded, changed and saved, then the list refreshes.
6. `components/documents/DocumentActionsSheet.vue`: a Rename row that turns into a field with Cancel
   and Save in the sheet, as Delete turns into its confirmation; `DocumentList.vue` calls `rename`.
7. i18n (nine languages): `exportView.fileName`, `exportView.fileNameHint`, `exportView.fileNameEmpty`,
   `actions.rename`, `documents.renameLabel`.
8. Tests: `fileName` (default, typed, unsafe, empty), the field per format, the header text, `rename`
   on the open and on another CV.

## Decisions

- **Not stored**: a per-download name needs no schema change; storing it was discarded (spec, out of
  scope).
- **One default for every format**: HTML and JSON get `Name – CV.html` instead of `name.html`, so the
  field shows one name whatever the format. The slug was a filesystem precaution the cleaning
  already covers.
- **Phone sheet keeps one-tap rows**: the field goes above them instead of turning the sheet into
  radios and a button as in the design mock-up; one tap per export stays, and the change is smaller.
- **Extension fixed, not typed**: the user cannot produce `cv.pdf.exe` or lose the extension.

## Risks

- **The header input was the only rename on desktop**: Rename in My CVs lands in the same change, so
  there is never a version without a way to rename.
- **`qa:e2e` or `qa:roundtrip` look for the old file names** (`.html`/`.json` slugs): update them with
  the new default in the same task.
