import type { StyleTokens } from '@/types/cv'
import type { TemplateCapability, TemplateDefinition } from '@/types/template'
import { DEFAULT_STYLE, DEFAULT_TEMPLATE_ID } from '@/core/factory'

export { DEFAULT_TEMPLATE_ID }

/**
 * Auto-discovery (spec §4). Adding a template is creating a folder with an
 * `index.ts` default-exporting a `TemplateDefinition` — no edit to this file,
 * no edit to any component.
 *
 * The definitions are eager (they are a few hundred bytes each and the picker
 * needs all of them); the *components* they point at are lazy.
 */
const modules = import.meta.glob<{ default: TemplateDefinition }>('./*/index.ts', { eager: true })

export const templates: TemplateDefinition[] = Object.entries(modules)
  .map(([path, mod]) => {
    const definition = mod.default
    if (!definition?.id) throw new Error(`Template at ${path} has no valid default export`)
    return definition
  })
  .sort((a, b) => a.name.localeCompare(b.name))

export function getTemplate(id: string): TemplateDefinition {
  return templates.find((t) => t.id === id) ?? templates.find((t) => t.id === DEFAULT_TEMPLATE_ID) ?? templates[0]
}

export function supports(id: string, capability: TemplateCapability): boolean {
  return getTemplate(id).supports.includes(capability)
}

/** Capabilities the active template ignores — the UI dims those controls. */
export function missingCapabilities(id: string, needed: TemplateCapability[]): TemplateCapability[] {
  const template = getTemplate(id)
  return needed.filter((c) => !template.supports.includes(c))
}

/**
 * A value counts as untouched while it is still some template's default (or the
 * global one). The moment the user picks their own accent or face, it stops
 * matching any of them and template switches leave it alone from then on.
 *
 * This keeps "switching templates never destroys the user's choices" true
 * without adding a `styleTouched` flag to `CVData` — which would be a schema
 * change carrying a migration, for a fact we can already derive.
 */
function isUntouched(key: 'accentColor' | 'fontFamily', value: string): boolean {
  if (value === DEFAULT_STYLE[key]) return true
  return templates.some((template) => template.defaults?.[key] === value)
}

/**
 * Returns the style tokens to use after switching to `id`, preserving anything
 * the user has deliberately chosen.
 */
export function applyTemplateDefaults(id: string, style: StyleTokens): StyleTokens {
  const defaults = getTemplate(id).defaults
  if (!defaults) return style

  const next = { ...style }
  if (isUntouched('accentColor', style.accentColor)) next.accentColor = defaults.accentColor
  if (isUntouched('fontFamily', style.fontFamily)) next.fontFamily = defaults.fontFamily
  return next
}

/**
 * The accent a template would show if picked now: its own while the user is on defaults, the user's
 * once they chose one. What a gallery thumbnail is painted in (style step, phone template sheet):
 * painting every thumbnail in the current accent hid the very differences a gallery exists to show.
 */
export function accentIfChosen(id: string, style: StyleTokens): string {
  return applyTemplateDefaults(id, style).accentColor
}
