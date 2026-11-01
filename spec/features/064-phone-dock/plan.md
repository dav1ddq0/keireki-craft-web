# 064 · Phone dock: Plan

## Approach

The dock (`MobileDock.vue`) already knows the mode; in preview it renders three more controls. The
template sheet is a new component on `BottomSheet`. The copy button gets a `compact` look for the
dock, with its state in a bubble above it. The template pick moves into the CV store so the style
step and the sheet share it.

## Implementation

1. `stores/cv.ts`: `chooseTemplate(id)` = `setTemplate` + `applyTemplateDefaults`; `StepStyle.vue`
   uses it instead of its local function.
2. `components/preview/TemplateSheet.vue`: `BottomSheet` with a two-column grid of the templates
   (thumbnail SVG painted in the accent each would get, name, current marked with `aria-pressed`);
   a tap calls `chooseTemplate` and keeps the sheet open.
3. `CopyImageButton.vue`: prop `compact`: icon only, the state (and the Share button) in a bubble
   above, positioned absolutely so the dock row does not move.
4. `MobileDock.vue`: the switch's labels hidden on both buttons; in preview, template button +
   `CopyImageButton compact` + Export as icon FAB; edit mode unchanged.
5. `PreviewPane.vue`: drop the floating copy button on the phone.
6. i18n: `dock.template` ("Plantilla: {name}. Cambiar"), `dock.templatesTitle`, `dock.templatesHint`
   in the six languages.
7. Tests (`mobileDock`, new `templateSheet`, `copyCvImage`), `qa/e2e` phone block, `qa:consistency`.

## Decisions

- **Export as an icon in preview**: with text it does not fit next to the template button at 390 px;
  in edit mode it keeps its text, where it is the only action.
- **Sheet stays open after a pick**: the point is to compare templates on the CV behind it.
- **Shared store action** instead of a second copy of the style step's logic.

## Risks

- **Narrow phones (320 px)**: the template name truncates with an ellipsis; checked in `qa/e2e`
  widths.
- **The copy state bubble covering the page**: it is short-lived (2–15 s) and sits above the dock.
