import { createApp, h } from 'vue'
import type { CVData } from '@/types/cv'
import { getTemplate } from '@/templates/registry'
import { loadPhoto } from '@/services/storage'
import { blobToDataUrl } from './json'

/**
 * Renders a template component to an HTML string, off-screen.
 *
 * This is what keeps "one source of truth per template" (spec §3) true across
 * all three outputs: the live preview, the printable HTML and the PDF all come
 * from the same `.vue` component. Nothing here knows a template's markup.
 */
export async function renderTemplateHtml(data: CVData, templateId: string): Promise<string> {
  return withMountedTemplate(data, templateId, (host) => host.innerHTML)
}

/** Mounts the template off-screen at A4 width, laid out with its fonts, for `use`; then removes it. */
async function withMountedTemplate<T>(data: CVData, templateId: string, use: (host: HTMLElement) => T): Promise<T> {
  const component = await getTemplate(templateId).component()
  const host = document.createElement('div')
  // Off-screen rather than `display: none`: hidden subtrees skip layout, and
  // paged.js needs real box metrics to decide where pages break.
  host.style.cssText = 'position:absolute;left:-99999px;top:0;width:210mm;'
  document.body.appendChild(host)

  const app = createApp({ render: () => h(component, { data }) })
  app.mount(host)
  try {
    await nextFrame()
    // Laying the CV out requests its fonts; paged.js measures text, so it must see the real ones (spec 026).
    await document.fonts?.ready
    return use(host)
  } finally {
    app.unmount()
    host.remove()
  }
}

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

/**
 * Whether the template's side column (`[data-side]`) is taller than what page 1 leaves it (spec 033).
 * The side column comes first in the markup, so paged.js puts it on page 1 whole; if it does not fit,
 * the main column can only start on page 2. Measured on the column's content, not its box, which the
 * grid stretches to the main column's height.
 */
export async function sideColumnOverflows(data: CVData, templateId: string): Promise<boolean> {
  // The stored photo is a `photo:{id}` reference, not a loadable URL; templates size the photo
  // with CSS, so a transparent pixel keeps the column's height without requesting anything.
  const measured = data.personal.photo ? { ...data, personal: { ...data.personal, photo: TRANSPARENT_PIXEL } } : data
  return withMountedTemplate(measured, templateId, (host) => {
    const side = host.querySelector<HTMLElement>('[data-side]')
    const article = host.firstElementChild
    if (!side || !article) return false
    const sheet = document.createElement('div')
    sheet.style.cssText = 'height:297mm'
    host.appendChild(sheet)
    const pageHeight = sheet.getBoundingClientRect().height
    sheet.remove()
    const top = side.getBoundingClientRect().top - article.getBoundingClientRect().top
    return top + sideColumnHeight(side) > pageHeight + 0.5
  })
}

/**
 * The side column's height as paged.js lays it out: down to its last child's bottom margin, which
 * the column's bottom padding keeps inside it (spec 075), plus that padding and border.
 */
export function sideColumnHeight(side: HTMLElement): number {
  const sideTop = side.getBoundingClientRect().top
  const children = Array.from(side.children)
  const contentBottom = children.length
    ? Math.max(...children.map((c) => c.getBoundingClientRect().bottom + (parseFloat(getComputedStyle(c).marginBottom) || 0)))
    : sideTop
  const style = getComputedStyle(side)
  return contentBottom - sideTop + (parseFloat(style.paddingBottom) || 0) + (parseFloat(style.borderBottomWidth) || 0)
}

/**
 * Collects every same-origin stylesheet rule currently applied to the app.
 *
 * Scoped-style CSS is emitted by Vite as `<style>` tags in dev and as a linked
 * sheet in a build, so reading the live CSSOM is the only way to get a
 * template's styles without duplicating them. Cross-origin sheets throw on
 * `cssRules` access and are skipped.
 */
export function collectDocumentCss(options: { fontFaces?: boolean } = {}): string {
  const { fontFaces = true } = options
  const chunks: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    // paged.js output from an earlier run (see `PAGED_STYLE_ATTR` in pdf.ts): copying it would make
    // the CSS grow with every export.
    if (sheet.ownerNode instanceof Element && sheet.ownerNode.hasAttribute('data-cv-paged')) continue
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        // A standalone file cannot follow the app's font URLs; it embeds its own (see fonts.ts).
        if (!fontFaces && isFontFace(rule)) continue
        chunks.push(rule.cssText)
      }
    } catch {
      // Cross-origin sheet (e.g. a font CDN) — the @import in the export head covers it.
    }
  }
  return chunks.join('\n')
}

/** jsdom has no `CSSFontFaceRule`; a missing class simply means there is nothing to skip. */
export function isFontFace(rule: CSSRule): rule is CSSFontFaceRule {
  return typeof CSSFontFaceRule !== 'undefined' && rule instanceof CSSFontFaceRule
}

/**
 * Swaps the `photo:{id}` storage reference for something renderable.
 * `object` URLs are cheap and right for on-screen preview; exports need a
 * `data:` URL so the file still shows the photo once it leaves this browser.
 */
export async function resolvePhoto(
  data: CVData,
  as: 'objectUrl' | 'dataUrl',
): Promise<{ data: CVData; revoke: () => void }> {
  const reference = data.personal.photo
  if (!reference?.startsWith('photo:')) return { data, revoke: () => {} }

  const blob = await loadPhoto(reference)
  if (!blob) {
    const stripped = { ...data, personal: { ...data.personal, photo: undefined } }
    return { data: stripped, revoke: () => {} }
  }

  const url = as === 'objectUrl' ? URL.createObjectURL(blob) : await blobToDataUrl(blob)
  const resolved = { ...data, personal: { ...data.personal, photo: url } }
  return {
    data: resolved,
    revoke: () => {
      if (as === 'objectUrl') URL.revokeObjectURL(url)
    },
  }
}

/** Two frames: one for Vue to patch the DOM, one for the browser to lay it out. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  )
}
