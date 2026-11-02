# Tech stack and conventions

## Technologies

- **Language:** TypeScript (strict mode: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- **Framework / runtime:** Vue 3 (Composition API, `<script setup>`) + Vite + Pinia
- **Storage:** IndexedDB via `idb-keyval`, behind the `StorageAdapter` interface in `src/services/storage/` — no backend in v1
- **PDF:** `pdfjs-dist` for import/extraction, `pagedjs` for paginated preview/export layout
- **Tests:** Vitest (`tests/**/*.test.ts`); validated with `npm test` + `npm run build` (type-check `vue-tsc --noEmit` + build), and for UI/UX changes, agent-driven design/QA reviews before a feature is considered done
- **Deployment:** GitHub Pages, on the custom domain keireki-craft.eu at the root path `/` (see `base` / `BASE_PATH` in `vite.config.ts`)

## Key files / modules

- `src/types/cv.ts` : the central contract — the `CVData` model everything else depends on.
- `src/core/migrations.ts` : schema migrations for `CVData`; any shape change to the model needs an entry here.
- `src/core/history.ts` : undo/redo stack used by `stores/cv.ts`.
- `src/stores/cv.ts` : the single Pinia store for CV data, undo/redo, and autosave. Source of truth that almost every component reads.
- `src/stores/ui.ts` : view/UI state (wizard step, panel visibility, etc.), separate from document data.
- `src/services/storage/` : `StorageAdapter` interface + IndexedDB implementation — the only place that talks to persistence.
- `src/services/export/` : render → HTML / print / JSON; `pagedjs` usage lives only here.
- `src/services/pdfImport/` : extract (pdf.js) → heuristics → assemble, feeding the PDF import review screen.
- `src/templates/<name>/` : one folder per template (`Template.vue`, `index.ts`, `thumbnail.ts`), auto-registered via `src/templates/registry.ts`. New templates must not require changes to consuming code.
- `src/components/` : organized by feature (`form/`, `preview/`, `import/`, `documents/`, `ui/`), not by type.
- `src/composables/` : reusable stateful logic in the Vue "hooks" style (e.g. `useValidation`, `useCapabilities`).
- `src/i18n/` : `en.ts` / `es.ts` string tables.

## Commands

- `npm run dev` : starts the local dev server (Vite).
- `npm test` : runs the Vitest suite (`vitest run`).
- `npm run typecheck` : `vue-tsc --noEmit`.
- `npm run build` : type-check + production build. **This plus `npm test` is the pre-PR check.**

## Conventions

- Composition API with `<script setup lang="ts">` in every `.vue` component.
- Document state is centralized in `stores/cv.ts` via Pinia : don't duplicate local state that belongs there.
- Any change to `src/types/cv.ts` needs a matching migration in `src/core/migrations.ts` and coverage in `tests/migrations.test.ts`.
- A new template is self-contained under `src/templates/<name>/` and registers itself — never add template-specific branching to shared components.
- Path alias `@/` → `src/`, used consistently for all internal imports (configured in both `vite.config.ts` and `tsconfig.json`).
- No ESLint/Prettier/Husky are configured here (matching the project's other sibling apps) — `vue-tsc --noEmit` and the Vitest suite are the enforced gates.

## Visual style

- Each template owns its own visual language under `src/templates/<name>/Template.vue` and `thumbnail.ts` — no shared "theme" leaks between templates.
- Shared chrome (wizard, preview pane, dialogs) styling lives in `src/styles/app.css`; print-specific rules live in `src/styles/print.css` and must stay in sync with what `services/export/` produces.
- Live preview and exported output must render from the same template component — never fork markup between "preview" and "export" paths.
