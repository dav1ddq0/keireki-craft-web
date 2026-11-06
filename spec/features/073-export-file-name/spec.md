# 073 · The file name, where the CV is exported

**Status:** done

## What it does

1. **Export asks for the file name.** The desktop export dialog, the phone export sheet and the
   export step show a "File name" field, filled with the name the file gets today. The extension is
   shown next to it, fixed, and follows the format (`.pdf`, `.jpg`, `.html`, `.json`). The name
   applies to that download only: it is not stored in the CV, and the next export starts from the
   default again. Cleared, the field says which name will be used. For "Print / save as PDF" the
   field gives way to the existing note: there the browser proposes the name.
2. **"My CV" in the header is the page you are on, not a field.** The breadcrumb "My CVs / <name>"
   keeps "My CVs" as the link back; the document name becomes plain text, cut with "…" when long.
3. **Rename in My CVs.** Each CV's menu offers Rename next to Duplicate and Delete; it asks for the
   new name in the same sheet and saves it.

Design: https://claude.ai/artifact/2LvL3F7D1CN2U6pi7UFbXT (header, export dialog, My CVs, phone).

## Why

The document name in the header looks like a button, but tapping it gives a keyboard: it was taken
for a way to another section. It is also not the name of the exported file, which comes from the
person's full name; a user who wants to choose that name has nowhere to do it. The file name belongs
where the file is made, and the document name where documents are managed.

## Acceptance criteria

- [x] The desktop dialog, the phone sheet and the export step show the "File name" field, filled with
      the default name; the fixed extension next to it follows the chosen format.
- [x] Downloading PDF, JPG, HTML or JSON uses the typed name plus the format's extension.
- [x] The default name is the same for every format: `<full name> – CV`, else the document name,
      else `CV` (today's PDF and JPG name). HTML and JSON stop using the lowercase slug.
- [x] The typed name goes through the same cleaning as today's PDF name: no path or control
      characters and no bidi overrides reach the file name; an empty or only-unsafe name falls back
      to the default.
- [x] Cleared, the hint under the field names the default that will be used.
- [x] With "Print / save as PDF" the field is not shown; the note about the browser's name stays.
- [x] Nothing about the name is stored: the CV data, its schema and its migrations are unchanged; a
      new export (or a reopened dialog) starts from the default.
- [x] The desktop header shows the document name as text (`aria-current="page"`), with no input and
      no hover border; a long name is cut with "…"; "My CVs" still goes back to the list.
- [x] My CVs: the CV menu has Rename; it asks for the name in the sheet (filled with the current
      one), saves it on confirm, and the card shows it. Renaming the open CV changes it in the editor
      too. An empty name is not saved.
- [x] Every label is in the nine interface languages.
- [x] `npm test`, `npm run build`, `qa:e2e` and `qa:consistency` pass.

## Verification

`npm test` 973 passed: `fileName` (typed, default, unsafe, blank), the HTML and JSON names from
`useCvExport`, the dialog's field (extension per format, none for printing, the default named when
cleared, a fresh default on reopening), the header's name as text, `cv.rename` (open CV with undo,
another in storage, blank refused) and Rename in the phone sheet. `vue-tsc`, `npm run build`.
`qa:e2e` 156/156, `qa:consistency` 13/13, `qa:roundtrip` 448/448 (the files are named
"Łucja Øster-Ñúñez – CV" in PDF, HTML and JSON), `qa:security` 57/57 (no path, control or bidi
character in any download name). In the built app: "CV Frontend 2026" typed gives
`CV Frontend 2026.pdf`, `.jpg`, `.html` and `.json`; `../a<U+202E>fdp.exe` gives `afdp.exe.pdf`; a blank
field gives `Nadia Martín Reyes – CV.jpg`; renaming on desktop and on a phone shows the new name on the
card and in the header. `src/types/cv.ts` and the migrations are unchanged. Screenshots of the
dialog, the phone sheet, the export step, the header and both rename forms.

Beyond the plan: on desktop My CVs has no menu but buttons on each tile, so Rename is a button there
and opens its field in the tile, as Delete opens its confirmation. `slugify`, which no export used any
more, was removed with its test (approved). The PDF keeps the CV's own title inside whatever the file
is called.

## Out of scope

- Remembering a chosen file name per CV (it would need a schema change and a migration): not asked
  for; the default already follows the person's name.
- The browser's own name for "Print / save as PDF", which the page cannot set beyond the title.
- Renaming from the editor on phones (the phone header has no document name today).
