import type { Layout } from 'pagedjs'
import type { CVData } from '@/types/cv'
import printCss from '@/styles/print.css?raw'
import { collectDocumentCss, renderTemplateHtml, resolvePhoto } from './render'
import { safeFileName } from './download'

/**
 * Every interaction with paged.js is confined to this module (spec §6 and the
 * risk register): the library is lightly maintained and rewrites the DOM it
 * touches. Templates never import it, and if it has to go, only this file
 * changes — plain `window.print()` remains a complete fallback.
 */

const PRINT_ROOT_ID = 'print-root'

/** Marks the `<style>` elements a paged.js run added to `<head>`; `collectDocumentCss` skips them. */
export const PAGED_STYLE_ATTR = 'data-cv-paged'

/**
 * paged.js appends its styles to `<head>` on every run and never removes them. Left there, the next
 * export copied them into its own CSS, which then doubled on every run (72 KB, 166 KB, 354 KB…) until
 * pagination crawled (spec 022). Each container keeps only the styles of its latest run.
 */
const pagedStyles = new WeakMap<HTMLElement, HTMLStyleElement[]>()

/** Drops the styles of `container`'s last pagination; call once its pages are gone. */
export function releasePagination(container: HTMLElement): void {
  for (const style of pagedStyles.get(container) ?? []) style.remove()
  pagedStyles.delete(container)
}

export interface PrintOptions {
  /** Run paged.js first. Falls back to plain print if pagination fails. */
  paginate?: boolean
}

/**
 * What the browser proposes as the PDF's file name: it uses `document.title` (spec 024).
 * "Nadia Martín Reyes – CV"; the document title when there is no name; "CV" when there is neither.
 */
export function printTitle(data: CVData): string {
  // Nothing unsafe reaches the file name or the PDF's title (spec 034).
  const name = safeFileName(data.personal.fullName)
  if (name) return `${name} – CV`
  return safeFileName(data.meta.title) || 'CV'
}

/**
 * The stem of an exported file, without the extension: the name the user typed in Export, made safe,
 * or the print title when that leaves nothing (spec 073). The same for every format.
 */
export function fileName(data: CVData, chosen = ''): string {
  return safeFileName(chosen) || printTitle(data)
}

export async function printCv(
  data: CVData,
  templateId: string,
  options: PrintOptions = {},
): Promise<void> {
  const { data: rendered, revoke } = await resolvePhoto(data, 'objectUrl')
  const root = ensurePrintRoot()
  root.innerHTML = ''
  const appTitle = document.title

  try {
    const html = await renderTemplateHtml(rendered, templateId)

    if (options.paginate) {
      const ok = await paginateInto(root, html, exportCss())
      if (!ok) fillUnpaginated(root, html)
    } else {
      fillUnpaginated(root, html)
    }

    // Pagination is async; the print dialog must not open before it resolves, nor before the fonts
    // the pages ask for have loaded (spec 026).
    await nextFrame()
    await document.fonts?.ready
    await new Promise<void>((resolve) => {
      const done = () => {
        window.removeEventListener('afterprint', done)
        clearTimeout(timer)
        resolve()
      }
      // Some Safari versions never fire `afterprint`; don't leak the promise.
      const timer = setTimeout(done, 60_000)
      window.addEventListener('afterprint', done)
      document.title = printTitle(data)
      window.print()
    })
  } finally {
    document.title = appTitle
    root.innerHTML = ''
    releasePagination(root)
    revoke()
  }
}

/**
 * The CSS paged.js is given, in two sheets so that they can be told apart in `<head>` afterwards:
 * the document's own (the templates' and, since they cannot be told from them, the interface's) and
 * the print rules, which must stay the last word.
 */
export interface ExportCss {
  app: string
  print: string
}

/** A rule at the head of each sheet, to find the `<style>` paged.js makes of it (spec 041). */
const APP_SHEET = 'cv-export-app-sheet'
const PRINT_SHEET = 'cv-export-print-sheet'

/** Markup + CSS as handed to paged.js, the HTML export and (Phase 5) WeasyPrint. */
export function exportCss(): ExportCss {
  // No @font-face: the fonts are already registered in this document, and paged.js re-declares every
  // rule it gets in a sheet of its own, where the copied font URLs no longer resolve. Being later,
  // those broken faces won, and the PDF came out in the system font (spec 026).
  return {
    app: `.${APP_SHEET}{--cv-export-sheet:app}\n${withoutPrintMedia(collectDocumentCss({ fontFaces: false }))}`,
    print: `.${PRINT_SHEET}{--cv-export-sheet:print}\n${withoutPrintMedia(printCss)}`,
  }
}

/**
 * `css` without its print-only `@media` blocks (`print`, `only print`, `print and (…)`).
 *
 * paged.js takes the rules out of every `@media print` and adds them unconditionally to the sheet it
 * puts in `<head>`, where they hit the whole interface: print.css's `html, body { background: #fff }`
 * turned the dark theme white for as long as the paginated view was open (spec 055). They are not
 * needed there: when the pages are printed, the document's own print.css applies them.
 * Comments are dropped; strings are kept whole, braces in them included.
 */
export function withoutPrintMedia(css: string): string {
  let out = ''
  let i = 0
  while (i < css.length) {
    const next = skipToken(css, i)
    if (next > i) {
      // A comment is dropped, a string copied.
      if (css[i] !== '/') out += css.slice(i, next)
      i = next
    } else if (css.startsWith('@media', i) && /[\s(]/.test(css[i + 6] ?? '')) {
      const open = findOutside(css, i, '{')
      if (open < 0) return out + css.slice(i)
      const prelude = css.slice(i + 6, open)
      if (isPrintOnly(prelude)) {
        i = blockEnd(css, open)
      } else {
        out += css.slice(i, open + 1)
        i = open + 1
      }
    } else {
      out += css[i]
      i++
    }
  }
  return out
}

/** A media query list every query of which is print only (`not print`, `screen, print` are not). */
function isPrintOnly(prelude: string): boolean {
  const queries = prelude.split(',').map((query) => query.trim().toLowerCase())
  return queries.every((query) => /^(only\s+)?print\b/.test(query))
}

/** The end of a comment or a string starting at `i`, else `i`. */
function skipToken(css: string, i: number): number {
  if (css.startsWith('/*', i)) {
    const end = css.indexOf('*/', i + 2)
    return end < 0 ? css.length : end + 2
  }
  const quote = css[i]
  if (quote === '"' || quote === "'") {
    let j = i + 1
    while (j < css.length && css[j] !== quote) j += css[j] === '\\' ? 2 : 1
    return Math.min(j + 1, css.length)
  }
  return i
}

/** The index of `char` from `i` on, outside comments and strings; -1 if there is none. */
function findOutside(css: string, i: number, char: string): number {
  while (i < css.length) {
    const next = skipToken(css, i)
    if (next > i) i = next
    else if (css[i] === char) return i
    else i++
  }
  return -1
}

/** The index just past the `}` that closes the block opened at `open`. */
function blockEnd(css: string, open: number): number {
  let depth = 0
  let i = open
  while (i < css.length) {
    const next = skipToken(css, i)
    if (next > i) {
      i = next
      continue
    }
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return i + 1
    i++
  }
  return css.length
}

/** Cuts moved earlier on one page at most: each move is earlier, so this only bounds a pathology. */
export const MAX_REMEASURES = 8

/**
 * Hides what follows `start` (it included) up to the end of `root`, and drops the bottom padding and
 * margin of the boxes it lies in, as paged.js does to the boxes a page break splits
 * (`[data-split-to]`). Returns the function that puts everything back. Exported for its tests.
 */
export function hideFrom(start: Node, root: Element): () => void {
  const undo: Array<() => void> = []
  /** Sets inline styles on `el`, to be undone to the very attribute it had (or none). */
  const restyle = (el: HTMLElement | SVGElement, styles: Record<string, string>) => {
    const before = el.getAttribute('style')
    Object.assign(el.style, styles)
    undo.push(() => (before === null ? el.removeAttribute('style') : el.setAttribute('style', before)))
  }
  const hide = (node: Node) => {
    if (node instanceof HTMLElement || node instanceof SVGElement) {
      restyle(node, { display: 'none' })
    } else if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
      const wrap = document.createElement('span')
      wrap.style.display = 'none'
      node.parentNode.replaceChild(wrap, node)
      wrap.appendChild(node)
      undo.push(() => wrap.replaceWith(node))
    }
  }
  for (let node: Node | null = start; node && node !== root; node = node.parentNode) {
    for (let sibling: Node | null = node === start ? node : node.nextSibling; sibling; ) {
      const next: Node | null = sibling.nextSibling
      hide(sibling)
      sibling = next
    }
    const box = node.parentNode
    if (box instanceof HTMLElement && box !== root) restyle(box, { paddingBottom: '0', marginBottom: '0' })
  }
  return () => undo.reverse().forEach((restore) => restore())
}

/**
 * paged.js cuts a page at the first thing laid out past it and removes the rest, without measuring
 * what is left. Removing it can make the page overflow again: a box that was split gets its bottom
 * padding back (a side column whose neighbour no longer runs on), an empty section shell stays at
 * the foot, and Chrome then moves an earlier section past the sheet, where nothing prints it
 * (spec 075). This measures the page as the cut will leave it and moves the cut before anything
 * that would fall outside, until nothing new does. Exported for its tests.
 */
export function remeasureAfterCut(overflow: Range | undefined, rendered: Element, bounds: DOMRect, layout: Layout): Range | undefined {
  if (!overflow) return overflow
  let cut = overflow
  for (let i = 0; i < MAX_REMEASURES; i++) {
    // A cut inside a text node keeps that text in the trial, measured where it is: it still runs
    // past the page, so its column still runs on and nothing earlier can move. Only what follows it
    // is hidden; when nothing does (the last text of a paragraph it splits), the cut stands as is.
    const start = cut.startContainer.nodeType === Node.TEXT_NODE ? cut.startContainer.nextSibling : cut.startContainer.childNodes[cut.startOffset] ?? null
    if (!start || !rendered.contains(start)) return cut
    const restore = hideFrom(start, rendered)
    let again: Range | undefined
    try {
      again = layout.findOverflow(rendered, bounds)
    } finally {
      restore()
    }
    if (!again || again.compareBoundaryPoints(Range.START_TO_START, cut) >= 0) return cut
    cut = again
  }
  return cut
}

/**
 * After paged.js removes what it cut, Chrome can keep the page's earlier fragmentation: a row that
 * fits stays drawn in the column past the sheet, where nothing prints it (Ledger's sections as
 * blocks, spec 082). The breaks and the content are already final; laying each page's content out
 * afresh (hidden, measured, shown) puts every box where it belongs. Exported for its tests.
 */
export function relayoutPages(container: HTMLElement): void {
  for (const area of container.querySelectorAll<HTMLElement>('.pagedjs_page_content')) {
    const content = area.firstElementChild
    if (!(content instanceof HTMLElement)) continue
    const before = content.getAttribute('style')
    content.style.display = 'none'
    void area.offsetHeight
    if (before === null) content.removeAttribute('style')
    else content.setAttribute('style', before)
  }
  void container.offsetHeight
}

let remeasureRegistered = false

/** Registers `remeasureAfterCut` on paged.js's overflow hook, once for every later run. */
function registerRemeasure(pagedjs: typeof import('pagedjs')): void {
  if (remeasureRegistered) return
  remeasureRegistered = true
  class RemeasureAfterCut extends pagedjs.Handler {
    onOverflow(overflow: Range | undefined, rendered: Element, bounds: DOMRect, layout: Layout) {
      return remeasureAfterCut(overflow, rendered, bounds, layout)
    }
  }
  pagedjs.registerHandlers(RemeasureAfterCut)
}

/**
 * Paginates `html` into `container` using paged.js.
 *
 * `container` MUST live outside the Vue-managed tree: paged.js chunks and
 * rewrites the nodes it is given, and Vue patching the same nodes afterwards
 * produces corrupted output. Callers pass an imperative-only element.
 *
 * Returns `false` when pagination failed, so callers can fall back.
 */
export async function paginateInto(
  container: HTMLElement,
  html: string,
  css: ExportCss,
): Promise<boolean> {
  releasePagination(container)
  const before = new Set(document.head.querySelectorAll('style'))
  // paged.js appends a copy of the document's CSS, interface included, after the original. Equal
  // rules then come twice and the later copy wins their ties, so a base rule beat the media query
  // that overrides it and the app re-laid itself out for as long as the pages existed: the rail
  // and the panes moved while a PDF was built or the paginated view was open (spec 041). Ahead of
  // the original the copy changes nothing there, and the host still sees the same rules in the
  // same order, the print rules last. It is moved as soon as it is added, a microtask before the
  // browser can lay the page out with it in the wrong place, not when paged.js is done.
  const place = (records: MutationRecord[]) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof HTMLStyleElement && node.textContent?.includes(APP_SHEET) && document.head.firstChild !== node) document.head.prepend(node)
      }
    }
  }
  const mover = new MutationObserver(place)
  mover.observe(document.head, { childList: true })
  try {
    const pagedjs = await import('pagedjs')
    registerRemeasure(pagedjs)
    const { Previewer } = pagedjs
    const previewer = new Previewer()
    // The `.cv-page` wrapper is what every print.css rule is scoped to (keep entries whole, section
    // page breaks); without it paged.js laid the CV out ignoring all of them (spec 022).
    const page = `<div class="cv-page cv-page--paged">${html}</div>`
    // An object entry feeds paged.js raw CSS text instead of a URL to fetch.
    await previewer.preview(page, [{ 'cv-export-app.css': css.app }, { 'cv-export-print.css': css.print }], container)
    relayoutPages(container)
    return container.querySelector('.pagedjs_page') !== null
  } catch (error) {
    // A failed run leaves its half-built pages behind; printed before the fallback they were blank sheets.
    container.innerHTML = ''
    console.warn('[export] paged.js failed; falling back to unpaginated output', error)
    return false
  } finally {
    mover.disconnect()
    const added = [...document.head.querySelectorAll('style')].filter((style) => !before.has(style))
    for (const style of added) style.setAttribute(PAGED_STYLE_ATTR, '')
    pagedStyles.set(container, added)
  }
}

/** Phase 1 path: a single flowing page, the browser decides the breaks. */
function fillUnpaginated(root: HTMLElement, html: string): void {
  const page = document.createElement('div')
  page.className = 'cv-page'
  page.innerHTML = html
  root.appendChild(page)
}

function ensurePrintRoot(): HTMLElement {
  let root = document.getElementById(PRINT_ROOT_ID)
  if (!root) {
    root = document.createElement('div')
    root.id = PRINT_ROOT_ID
    document.body.appendChild(root)
  }
  return root
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  )
}
