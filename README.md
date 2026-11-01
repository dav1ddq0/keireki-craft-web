# Keireki Craft

A local-first CV editor: guided form, live preview and an extensible template
system. Everything runs in the browser — no account, no server, no connection
required. Implementation of [`spec-cv-editor-en.md`](./spec-cv-editor-en.md),
phases 1 to 4.

```bash
npm install
npm run dev        # http://localhost:5173/vue-cv-maker/
npm test           # unit tests (Vitest)
npm run typecheck  # vue-tsc
npm run build      # production bundle into dist/
```

## What is implemented

| Phase | Scope | State |
|---|---|---|
| 1 — Core | `CVData` model, store with persistence, full wizard, `classic` template, live preview, PDF export, JSON import/export | ✅ |
| 2 — Templates | Auto-discovery registry, `modern` and `compact`, style tokens, uneven capabilities, HTML export, paged.js | ✅ |
| 3 — PDF import | pdf.js extraction, heuristics, review screen with manual assignment | ✅ |
| 4 — Polish | Multi-CV management, section reordering, custom sections, mobile layout, undo/redo | ✅ |
| 5–6 — Backend | Stateless FastAPI service, then sync | Not started (out of scope for v1) |

The app is deliberately usable with the backend permanently absent: nothing in
phases 1–4 talks to a server, with two exceptions. The phone's default country asks
`ipwho.is` for the country code of the connection (spec 056): a single request, the answer
holds no IP, nothing is stored, and if it fails the editor works the same. And the "Improve
with AI" button (spec 063) opens Claude, ChatGPT or Gemini in a new tab with a prompt that
carries the text of that one field in the link; it only happens when you choose an assistant,
and the app itself makes no request.

## Architecture

```
src/
├── types/cv.ts          the central contract — everything else depends on it
├── core/                model factories, schema migrations, history, debounce
├── stores/              cv (data + undo/redo + autosave), ui (view state)
├── services/
│   ├── storage/         StorageAdapter interface + IndexedDB implementation
│   ├── export/          render → HTML / print / JSON; paged.js lives only here
│   └── pdfImport/       extract (pdf.js) → analyze (heuristics) → assemble
├── templates/           one folder per template, auto-registered
└── components/          form (wizard steps), preview, import, documents, ui
```

Four rules hold the design together, and each has a test guarding it:

1. **One source of truth per template.** A single `.vue` component serves the
   live preview, the printable HTML and the PDF. `services/export/render.ts`
   mounts it off-screen for the non-interactive outputs.
2. **Templates are pure.** Exactly one prop (`data: CVData`), no store access, no
   mutation, no hardcoded colors or fonts. Enforced by
   `tests/templateContract.test.ts`.
3. **Data is never lost.** A template that lacks a capability *ignores* the
   related data; switching back restores it. Imports and migrations fill missing
   fields rather than dropping unknown ones.
4. **paged.js is encapsulated.** It appears in `services/export/pdf.ts` and
   nowhere else, always on a container outside the Vue-managed tree, and plain
   `window.print()` remains a complete fallback if it is dropped.

## Adding a template

Create `src/templates/<id>/` with an `index.ts` default-exporting a
`TemplateDefinition` and a `Template.vue` taking `data: CVData`. The registry
picks it up through `import.meta.glob` — no existing file changes. The contract
test suite runs against it automatically.

Declare only the capabilities the template actually renders (`photo`, `sidebar`,
`accentColor`, `customFont`, `multiPage`); the wizard dims the controls it cannot
honour and keeps the data untouched.

## Storage

| Key | Contents |
|---|---|
| `cv:{id}` | the full `CVData` |
| `photo:{id}` | the photo as a `Blob` |
| `index` | `CVSummary[]` for the document list |

Photos are stored as blobs (≈33% smaller than base64) and resolved to object URLs
at render time. Exported JSON inlines the photo as base64 so the file stays
self-contained. `localStorage` holds only UI preferences.

Private browsing and quota failures are detected and surfaced, and the app asks
for `navigator.storage.persist()` on startup.

## PDF import

Three stages, all client-side:

1. **Extract** — `pdf.js` text fragments grouped into lines by Y coordinate,
   keeping font size and weight.
2. **Analyze** — direct fields by regex, date ranges in Spanish and English,
   name by largest first-page text, section headers by keyword + size + weight +
   line shape. Pure functions, no DOM.
3. **Review** — nothing is applied silently. Low-confidence fields are flagged,
   unclassified blocks default to *discard*, and the full raw text is always
   available.

Two-column and heavily designed CVs extract badly; the review screen is what makes
an imperfect extraction useful. Scanned PDFs are detected and reported — OCR is
out of scope.

## Browser support

Chrome and Firefox are the tested targets. Print output differs slightly between
browsers; Chrome currently gives the closest match to the on-screen preview.

## Deployment

Published at <https://dav1ddq0.github.io/vue-cv-maker/> by `.github/workflows/deploy.yml`: every
push to `main` installs, runs the tests, builds and deploys to GitHub Pages. A red test suite blocks
the deploy.

- **One-time setup:** repository *Settings → Pages → Build and deployment → Source: GitHub Actions*.
- **Base path:** `vite.config.ts` defaults to `/vue-cv-maker/`, the project-site path, so
  `npm run preview` behaves like production. Set `BASE_PATH` to build for another location, for
  example `BASE_PATH=/ npm run build` for a user site or a custom domain.
- **Content-Security-Policy:** the build adds a CSP `<meta>` tag (GitHub Pages cannot send headers);
  it is not applied by `npm run dev`.

## Credits

- Country flags: [flag-icons](https://github.com/lipis/flag-icons) © 2013 Panayiotis Lipiridis, MIT License.
