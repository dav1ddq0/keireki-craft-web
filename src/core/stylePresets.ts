/**
 * Curated choices offered by the style step. Kept as data (no Vue, no store) so
 * they can be unit-tested and reused.
 */

/** Suggested accent colours; the free colour input stays available next to them. */
export const PALETTE = ['#ffd86f', '#7c55e4', '#f2614c', '#10cf65', '#334fdc'] as const

export function isSameColor(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export interface FontOption {
  id: string
  label: string
  /** CSS `font-family` stack, ending in a generic family. */
  value: string
  /**
   * The app ships a face for this stack (spec 026): the font itself, or a metric-compatible stand-in
   * (Carlito for Calibri, Caladea for Cambria, EB Garamond for Garamond). Otherwise it depends on
   * what the computer has installed.
   */
  bundled: boolean
}

/**
 * The fonts the style step offers. The bundled ones are served by the app (spec 026); the rest are
 * system fonts, used when the computer has them.
 *
 * The first four keep the exact values the select used before, so documents that
 * already store them keep matching an option; the Iowan stack is the editorial
 * template's own default and must be listed or the select would render blank.
 */
export const FONT_OPTIONS: FontOption[] = [
  { id: 'sourceSans', label: 'Source Sans', value: "'Source Sans 3', 'Segoe UI', system-ui, sans-serif", bundled: true },
  { id: 'inter', label: 'Inter', value: "'Inter', system-ui, -apple-system, sans-serif", bundled: true },
  { id: 'georgia', label: 'Georgia', value: "Georgia, 'Times New Roman', serif", bundled: false },
  { id: 'jetbrainsMono', label: 'JetBrains Mono', value: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace", bundled: true },
  { id: 'iowan', label: 'Iowan Old Style', value: "'Iowan Old Style', Georgia, 'Times New Roman', serif", bundled: false },
  { id: 'calibri', label: 'Calibri', value: "Calibri, Carlito, 'Segoe UI', system-ui, sans-serif", bundled: true },
  { id: 'cambria', label: 'Cambria', value: "Cambria, Caladea, Georgia, serif", bundled: true },
  { id: 'helvetica', label: 'Helvetica', value: "'Helvetica Neue', Helvetica, Arial, sans-serif", bundled: false },
  { id: 'arial', label: 'Arial', value: "Arial, 'Liberation Sans', Helvetica, sans-serif", bundled: false },
  { id: 'timesNewRoman', label: 'Times New Roman', value: "'Times New Roman', Times, 'Liberation Serif', serif", bundled: false },
  { id: 'garamond', label: 'Garamond', value: "Garamond, 'EB Garamond', 'Times New Roman', serif", bundled: true },
  { id: 'palatino', label: 'Palatino', value: "'Palatino Linotype', Palatino, 'Book Antiqua', serif", bundled: false },
  { id: 'tahoma', label: 'Tahoma', value: "Tahoma, 'DejaVu Sans', Verdana, sans-serif", bundled: true },
  { id: 'verdana', label: 'Verdana', value: "Verdana, 'DejaVu Sans', Geneva, sans-serif", bundled: true },
  { id: 'raleway', label: 'Raleway', value: "'Raleway', 'Segoe UI', system-ui, sans-serif", bundled: true },
]

/** Page margins offered by the style step; anything else in a file falls back to the default. */
export const PAGE_MARGINS = ['10mm', '13mm', '16mm', '20mm'] as const

/**
 * An accent colour as the colour input produces it. The value ends up in a CSS variable that
 * templates paint as a background, so anything looser (`url(…)`) would let a file load a remote
 * resource when the CV is opened (spec 017).
 */
export function isAccentColor(value: unknown): value is string {
  return typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
}

export function isFontOption(value: unknown): value is string {
  return FONT_OPTIONS.some((font) => font.value === value)
}

export function isPageMargin(value: unknown): value is string {
  return (PAGE_MARGINS as readonly unknown[]).includes(value)
}

export interface CvLanguageOption {
  code: string
  /** Written in its own language so it stays readable whatever the UI language is. */
  label: string
}

/** Languages the templates have month names, section titles and level labels for. */
export const CV_LANGUAGES: CvLanguageOption[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ca', label: 'Català' },
  { code: 'ca-valencia', label: 'Valencià' },
  { code: 'eu', label: 'Euskara' },
]

/** The "native" level offered next to the CEFR ones, per CV language; templates recognise each. */
export const NATIVE_LEVEL: Record<string, string> = { es: 'Nativo', en: 'Native', fr: 'Langue maternelle', it: 'Madrelingua', pt: 'Nativo', de: 'Muttersprache', ca: 'Llengua materna', 'ca-valencia': 'Llengua materna', eu: 'Ama hizkuntza' }
