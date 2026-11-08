/**
 * Direct PDF download (spec 031): the CV paginated exactly as for printing, then redrawn on PDF
 * pages with PDFKit — every word at the position the browser laid it out, in the embedded font.
 * The text stays text (selectable, searchable, readable by ATS) and no print dialog opens.
 *
 * The paginated DOM is the source of truth, not the CV data: one layout engine for the screen, the
 * print and this download, so templates are written once. PDFKit lives only in this module and is
 * loaded on demand.
 */
import type { CVData } from '@/types/cv'
import { withStandIns } from '@/core/fontStandIns'
import { familyNames } from './fonts'
import { exportCss, paginateInto, releasePagination } from './pdf'
import { isFontFace, renderTemplateHtml, resolvePhoto } from './render'
import { WOFF } from './pdfFonts'

/** A4 in PDF points. */
const PAGE_PT: [number, number] = [595.28, 841.89]

export interface Face {
  family: string
  weight: number
  italic: boolean
  ranges: [number, number][]
  url: string
}

type Rgba = { r: number; g: number; b: number; a: number }

export function parseColor(value: string): Rgba | null {
  const srgb = /color\(srgb ([^)]+)\)/.exec(value)
  if (srgb) {
    const [r, g, b, a = 1] = srgb[1]!.replace('/', ' ').split(/\s+/).filter(Boolean).map(Number)
    return { r: r! * 255, g: g! * 255, b: b! * 255, a }
  }
  const rgb = /rgba?\(([^)]+)\)/.exec(value)
  if (!rgb) return null
  const [r, g, b, a = 1] = rgb[1]!.split(/[\s,/]+/).filter(Boolean).map(Number)
  return { r: r!, g: g!, b: b!, a }
}

const visibleColor = (c: Rgba | null): c is Rgba => !!c && c.a > 0.01
const rgbOf = (c: Rgba): [number, number, number] => [c.r, c.g, c.b]

/* ---- fonts ------------------------------------------------------------------------------------ */

export function parseRanges(value: string): [number, number][] {
  if (!value) return [[0, 0x10ffff]]
  return value.split(',').map((part) => {
    const [from, to] = part.trim().replace(/^U\+/i, '').split('-')
    return [parseInt(from!, 16), parseInt(to ?? from!, 16)]
  })
}

/** Every bundled face the document declares, with the woff2 file behind it. */
function documentFaces(): Face[] {
  const faces: Face[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRule[]
    try {
      rules = Array.from(sheet.cssRules)
    } catch {
      continue
    }
    for (const rule of rules) {
      if (!isFontFace(rule)) continue
      const src = /url\(["']?([^"')]+\.woff2)["']?\)/.exec(rule.style.getPropertyValue('src'))
      if (!src) continue
      const weight = rule.style.getPropertyValue('font-weight').trim().split(/\s+/)
      faces.push({
        family: familyNames(rule.style.getPropertyValue('font-family'))[0] ?? '',
        // A variable face ("100 1000") is matched at its lower bound; only the UI font is one.
        weight: Number(weight[0]) || 400,
        italic: /italic|oblique/.test(rule.style.getPropertyValue('font-style')),
        ranges: parseRanges(rule.style.getPropertyValue('unicode-range')),
        url: new URL(src[1]!, rule.parentStyleSheet?.href ?? document.baseURI).href,
      })
    }
  }
  return faces
}

/**
 * The face the browser would use for one character: the first family of the stack that has a face
 * covering it, then the closest style and weight. `null` when only a system font could draw it.
 */
export function pickFace(faces: Face[], stack: string[], weight: number, italic: boolean, code: number): Face | null {
  for (const family of stack) {
    const candidates = faces.filter((f) => f.family === family && f.ranges.some(([a, b]) => code >= a && code <= b))
    if (!candidates.length) continue
    return candidates.sort(
      (x, y) => Number(x.italic !== italic) - Number(y.italic !== italic) || Math.abs(x.weight - weight) - Math.abs(y.weight - weight),
    )[0]!
  }
  return null
}

/** Characters the PDF standard fonts can draw (WinAnsi). */
const WIN_ANSI = /[\u0000-\u00ff\u20ac\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026]/

/**
 * The face for one character. A system-font stack (Georgia, Arial…) has no file the page can read:
 * its text goes out in a PDF standard font, except characters those cannot draw (Ł, ř…), which take
 * the bundled family of the same kind rather than disappearing.
 */
export function faceFor(faces: Face[], stack: string[], weight: number, italic: boolean, code: number): Face | null {
  const face = pickFace(faces, stack, weight, italic, code)
  if (face || WIN_ANSI.test(String.fromCodePoint(code))) return face
  return pickFace(faces, [stack.includes('serif') ? 'eb garamond' : 'source sans 3'], weight, italic, code)
}

/** A PDF standard font for system-font stacks the page cannot read (Georgia, Arial…). */
export function standardFont(stack: string[], weight: number, italic: boolean): string {
  const bold = weight >= 600
  if (stack.includes('monospace')) return `Courier${bold ? '-Bold' : ''}${italic ? (bold ? 'Oblique' : '-Oblique') : ''}`
  if (stack.includes('serif')) return bold ? (italic ? 'Times-BoldItalic' : 'Times-Bold') : italic ? 'Times-Italic' : 'Times-Roman'
  return `Helvetica${bold ? '-Bold' : ''}${italic ? (bold ? 'Oblique' : '-Oblique') : ''}`
}

/** `…/inter-latin-400-normal-C38fXH4l.woff2` (built) or `…/inter-latin-400-normal.woff2` (dev) → its WOFF URL. */
export function woffFor(woff2Url: string): string {
  const file = woff2Url.split('/').pop()!.replace(/\.woff2$/, '')
  return WOFF[file] ?? WOFF[file.replace(/-[\w-]{8}$/, '')] ?? woff2Url
}

const fontBytes = new Map<string, Promise<ArrayBuffer>>()
function loadFont(url: string): Promise<ArrayBuffer> {
  let pending = fontBytes.get(url)
  if (!pending) {
    pending = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Font ${url}: ${r.status}`)
      return r.arrayBuffer()
    })
    pending.catch(() => fontBytes.delete(url))
    fontBytes.set(url, pending)
  }
  return pending
}

/* ---- drawing ---------------------------------------------------------------------------------- */

type Doc = import('pdfkit').default

interface Ctx {
  doc: Doc
  faces: Face[]
  registered: Set<string>
  /** The page being drawn: its top-left is the PDF origin, and opacity is accumulated up to it. */
  page: Element
  origin: DOMRect
  k: number
}

/** The opacity an element is painted with: its own times every ancestor's, up to the page. */
const opacityCache = new WeakMap<Element, number>()
function opacityOf(c: Ctx, el: Element): number {
  const cached = opacityCache.get(el)
  if (cached !== undefined) return cached
  const own = parseFloat(getComputedStyle(el).opacity)
  const value = (Number.isNaN(own) ? 1 : own) * (el === c.page || !el.parentElement ? 1 : opacityOf(c, el.parentElement))
  opacityCache.set(el, value)
  return value
}

/** A CSS length that may be a percentage of `basis` (border radii, clip-path points). */
const lengthOf = (value: string, basis: number) => (value.trim().endsWith('%') ? (parseFloat(value) / 100) * basis : parseFloat(value) || 0)

/** `clip-path: polygon(…)` as an SVG path in PDF units over the box at x, y, w × h (CSS px sizes). */
export function clipPolygon(value: string, c: Ctx, r: DOMRect): string | null {
  const m = /^polygon\((?:(?:nonzero|evenodd),\s*)?(.+)\)$/.exec(value.trim())
  if (!m) return null
  const points = m[1]!.split(',').map((pair) => {
    const [px, py] = pair.trim().split(/\s+/) as [string, string]
    return [X(c, r.left + lengthOf(px, r.width)), Y(c, r.top + lengthOf(py, r.height))]
  })
  return `M${points.map(([x, y]) => `${x} ${y}`).join(' L')} Z`
}

const X = (c: Ctx, px: number) => (px - c.origin.left) * c.k
const Y = (c: Ctx, px: number) => (px - c.origin.top) * c.k

export function transformText(text: string, transform: string): string {
  if (transform === 'uppercase') return text.toUpperCase()
  if (transform === 'lowercase') return text.toLowerCase()
  if (transform === 'capitalize') return text.replace(/(^|\s)(\S)/g, (_, s, ch: string) => s + ch.toUpperCase())
  return text
}

/** The outer shadows of a box-shadow (rings, offset copies, soft shadows): offsets, blur, spread and colour, topmost first. */
export function outerShadows(value: string): { dx: number; dy: number; blur: number; spread: number; color: Rgba }[] {
  if (!value || value === 'none') return []
  const shadows: { dx: number; dy: number; blur: number; spread: number; color: Rgba }[] = []
  // Split on the commas between shadows, not those inside rgb( … ) or color( … ).
  for (const part of value.split(/,(?![^(]*\))/)) {
    if (/\binset\b/.test(part)) continue
    const colorText = /(?:rgba?|color)\([^)]*\)/.exec(part)?.[0] ?? ''
    const color = parseColor(colorText)
    const [dx = 0, dy = 0, blur = 0, spread = 0] = part.replace(colorText, '').trim().split(/\s+/).map(parseFloat)
    if (color && visibleColor(color)) shadows.push({ dx, dy, blur, spread, color })
  }
  return shadows
}

/** The inverse of the normal distribution's upper tail: z such that P(Z > z) = p (Abramowitz & Stegun 26.2.23). */
function normalTailInverse(p: number): number {
  const q = Math.min(p, 1 - p)
  const t = Math.sqrt(-2 * Math.log(q))
  const z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t ** 3)
  return p <= 0.5 ? z : -z
}

/**
 * A soft shadow as nested translucent shapes: PDF has no blur, so the shape is grown by `offset` px
 * (shrunk when negative) in layers of `alpha`, placed where a Gaussian of σ = blur / 2 reaches each
 * step of the shadow's opacity, so the layers add up to the same falloff the browser paints. No blur:
 * one layer of the colour's own alpha, the ring or offset copy it is.
 */
export function shadowLayers(blur: number, spread: number, opacity: number): { offset: number; alpha: number }[] {
  const target = Math.min(0.999, Math.max(0, opacity))
  if (!(blur > 0)) return [{ offset: spread, alpha: target }]
  const n = 24
  const alpha = 1 - Math.pow(1 - target, 1 / n)
  const sigma = blur / 2
  return Array.from({ length: n }, (_, i) => {
    // After k layers the shadow reaches (1 − (1 − alpha)^k) of the full opacity, `share` of the way up.
    const share = Math.min(0.999, (1 - Math.pow(1 - alpha, i + 1)) / target)
    return { offset: spread + sigma * normalTailInverse(share), alpha }
  })
}

/**
 * A soft shadow as a PNG with alpha, blurred by the canvas itself (σ = blur / 2, as CSS): the exact
 * falloff, smooth at any zoom. `null` where the canvas cannot blur (then the layered shadow is used).
 * The picture is the shape grown by the spread, with `pad` px of room around it for the blur.
 */
async function softShadowPng(width: number, height: number, radius: number, blur: number, color: Rgba): Promise<{ bytes: Uint8Array; pad: number } | null> {
  const scale = 2
  const pad = Math.ceil(blur * 1.5)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil((width + 2 * pad) * scale)
  canvas.height = Math.ceil((height + 2 * pad) * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx || !('filter' in ctx)) return null
  ctx.scale(scale, scale)
  // The filter works in bitmap pixels, not in the scaled coordinates: σ is scaled by hand.
  ctx.filter = `blur(${(blur / 2) * scale}px)`
  ctx.fillStyle = `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${color.a})`
  ctx.beginPath()
  ctx.roundRect(pad, pad, width, height, Math.max(0, radius))
  ctx.fill()
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  return png ? { bytes: new Uint8Array(await png.arrayBuffer()), pad } : null
}

async function drawBox(c: Ctx, el: Element, style: CSSStyleDeclaration) {
  const r = el.getBoundingClientRect()
  if (r.width < 0.5 || r.height < 0.5) return
  const x = X(c, r.left), y = Y(c, r.top), w = r.width * c.k, h = r.height * c.k
  const radius = Math.min(lengthOf(style.borderTopLeftRadius, Math.min(r.width, r.height)), r.width / 2, r.height / 2) * c.k
  const alpha = opacityOf(c, el)
  // Under the box, the lowest shadow first: a ring around a photo or a dot is a bigger shape behind it.
  for (const { dx, dy, blur, spread, color } of outerShadows(style.boxShadow).reverse()) {
    if (blur > 0) {
      const w0 = r.width + 2 * spread, h0 = r.height + 2 * spread
      const shadow = w0 > 0 && h0 > 0 ? await softShadowPng(w0, h0, Math.max(0, radius / c.k + spread), blur, { ...color, a: color.a * alpha }) : null
      if (shadow) {
        c.doc.image(shadow.bytes, X(c, r.left + dx - spread - shadow.pad), Y(c, r.top + dy - spread - shadow.pad), { width: (w0 + 2 * shadow.pad) * c.k, height: (h0 + 2 * shadow.pad) * c.k })
        continue
      }
    }
    for (const grow of shadowLayers(blur, spread, color.a * alpha)) {
      const s = grow.offset * c.k
      if (w + 2 * s <= 0 || h + 2 * s <= 0) continue
      c.doc.save()
      if (radius > 0) c.doc.roundedRect(x + dx * c.k - s, y + dy * c.k - s, w + 2 * s, h + 2 * s, Math.max(0, radius + s))
      else c.doc.rect(x + dx * c.k - s, y + dy * c.k - s, w + 2 * s, h + 2 * s)
      c.doc.fillColor(rgbOf(color), grow.alpha).fill()
      c.doc.restore()
    }
  }
  const bg = parseColor(style.backgroundColor)
  if (visibleColor(bg)) {
    c.doc.save()
    const clip = style.clipPath !== 'none' ? clipPolygon(style.clipPath, c, r) : null
    if (clip) c.doc.path(clip)
    else if (radius > 0) c.doc.roundedRect(x, y, w, h, radius)
    else c.doc.rect(x, y, w, h)
    c.doc.fillColor(rgbOf(bg), bg.a * alpha).fill()
    c.doc.restore()
  }
  const sides = [
    ['Top', x, y, x + w, y],
    ['Right', x + w, y, x + w, y + h],
    ['Bottom', x, y + h, x + w, y + h],
    ['Left', x, y, x, y + h],
  ] as const
  const styles = sides.map(([s]) => style.getPropertyValue(`border-${s.toLowerCase()}-style`))
  const widths = sides.map(([s], i) => (styles[i] === 'none' || styles[i] === 'hidden' ? 0 : parseFloat(style.getPropertyValue(`border-${s.toLowerCase()}-width`)) || 0))
  // A uniform solid border with rounded corners is one stroke; otherwise each side on its own.
  const colors = sides.map(([s]) => parseColor(style.getPropertyValue(`border-${s.toLowerCase()}-color`)))
  const solid = styles.every((s) => s !== 'dashed' && s !== 'dotted')
  if (solid && radius > 0 && widths.every((v) => v > 0 && v === widths[0]) && visibleColor(colors[0]!)) {
    const bw = widths[0]! * c.k
    c.doc.save().lineWidth(bw)
    c.doc.roundedRect(x + bw / 2, y + bw / 2, w - bw, h - bw, Math.max(0, radius - bw / 2))
    c.doc.strokeColor(rgbOf(colors[0]!), colors[0]!.a * alpha).stroke()
    c.doc.restore()
    return
  }
  sides.forEach(([, x1, y1, x2, y2], i) => {
    const bw = widths[i]! * c.k
    const color = colors[i]!
    if (bw <= 0 || !visibleColor(color)) return
    // The border sits inside the box: offset the stroke by half its width.
    const inset = bw / 2
    const dx = i === 1 ? -inset : i === 3 ? inset : 0
    const dy = i === 0 ? inset : i === 2 ? -inset : 0
    c.doc.save().lineWidth(bw)
    const pattern = dashPattern(styles[i]!, widths[i]!, Math.hypot(x2 - x1, y2 - y1) / c.k)
    if (pattern) c.doc.dash(pattern.mark * c.k, { space: pattern.gap * c.k })
    c.doc.moveTo(x1 + dx, y1 + dy).lineTo(x2 + dx, y2 + dy)
    c.doc.strokeColor(rgbOf(color), color.a * alpha).stroke().restore()
  })
}

/**
 * Chrome's dashes and dots, in CSS px, as it paints them on screen and in print (measured, spec
 * 035): dashed is a 3w mark and 2w gap (2w and w from 3 px), dotted a w mark and w gap; the gap is
 * then stretched so the side starts and ends with a mark. `null` for solid sides.
 */
export function dashPattern(style: string, width: number, length: number): { mark: number; gap: number } | null {
  if ((style !== 'dashed' && style !== 'dotted') || width <= 0) return null
  const [markRatio, gapRatio] = style === 'dotted' ? [1, 1] : width >= 3 ? [2, 1] : [3, 2]
  const mark = width * markRatio
  const gap = width * gapRatio
  const count = Math.max(1, Math.round((length + gap) / (mark + gap)))
  if (count < 2) return null
  return { mark, gap: Math.max(0, (length - count * mark) / (count - 1)) }
}

/* ---- images and SVG --------------------------------------------------------------------------- */

/** How grey a computed `filter` makes an image, 0–1 (spec 081): `grayscale(1)`, `grayscale(60%)`; 0 without one. */
export function grayscaleOf(filter: string): number {
  const match = /grayscale\(\s*([\d.]*)(%?)\s*\)/.exec(filter)
  if (!match) return 0
  const amount = match[1] ? Number(match[1]) / (match[2] ? 100 : 1) : 1
  return Number.isFinite(amount) ? Math.min(1, Math.max(0, amount)) : 0
}

/** RGBA pixels turned grey in place, `amount` of the way, by the luminance CSS's `grayscale()` uses. */
export function grayPixels(pixels: Uint8ClampedArray, amount: number): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const luma = 0.2126 * pixels[i]! + 0.7152 * pixels[i + 1]! + 0.0722 * pixels[i + 2]!
    for (let j = i; j < i + 3; j++) pixels[j] = pixels[j]! + (luma - pixels[j]!) * amount
  }
}

/**
 * The image as JPEG or PNG bytes (what PDF can embed); anything else is re-encoded through a canvas,
 * and so is a picture to be drawn grey (`gray` > 0), its pixels turned by hand: PDF has no filters.
 */
async function imageBytes(img: HTMLImageElement, gray = 0): Promise<Uint8Array | null> {
  try {
    const blob = await (await fetch(img.currentSrc || img.src)).blob()
    const embeddable = blob.type === 'image/jpeg' || blob.type === 'image/png'
    if (embeddable && gray === 0) return new Uint8Array(await blob.arrayBuffer())
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    if (gray > 0) {
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
      grayPixels(pixels.data, gray)
      ctx.putImageData(pixels, 0, 0)
    }
    const type = blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92))
    return out ? new Uint8Array(await out.arrayBuffer()) : null
  } catch {
    return null
  }
}

/** The photo: its content box, cropped like `object-fit: cover`, clipped to its rounded corners, grey if asked. */
async function drawImage(c: Ctx, img: HTMLImageElement, style: CSSStyleDeclaration) {
  const bytes = await imageBytes(img, grayscaleOf(style.filter))
  if (!bytes) return
  const r = img.getBoundingClientRect()
  const inset = (side: string) => (parseFloat(style.getPropertyValue(`border-${side}-width`)) || 0) + (parseFloat(style.getPropertyValue(`padding-${side}`)) || 0)
  const left = r.left + inset('left'), top = r.top + inset('top')
  const width = r.width - inset('left') - inset('right'), height = r.height - inset('top') - inset('bottom')
  if (width <= 0 || height <= 0) return
  const radius = Math.min(lengthOf(style.borderTopLeftRadius, Math.min(r.width, r.height)), width / 2, height / 2) * c.k
  const x = X(c, left), y = Y(c, top), w = width * c.k, h = height * c.k
  c.doc.save()
  if (radius > 0) c.doc.roundedRect(x, y, w, h, radius).clip()
  else c.doc.rect(x, y, w, h).clip()
  const fit = style.objectFit
  if (fit === 'cover' || fit === 'contain') c.doc.image(bytes, x, y, { [fit === 'cover' ? 'cover' : 'fit']: [w, h], align: 'center', valign: 'center' })
  else c.doc.image(bytes, x, y, { width: w, height: h })
  c.doc.restore()
}

/** An SVG shape's geometry as path data in its own user units. */
export function shapePath(shape: SVGElement): string | null {
  const n = (name: string) => parseFloat(shape.getAttribute(name) ?? '0') || 0
  switch (shape.tagName.toLowerCase()) {
    case 'path':
      return shape.getAttribute('d')
    case 'polygon':
    case 'polyline': {
      const nums = (shape.getAttribute('points') ?? '').trim().split(/[\s,]+/).map(Number)
      const pts: string[] = []
      for (let i = 0; i + 1 < nums.length; i += 2) pts.push(`${nums[i]} ${nums[i + 1]}`)
      return pts.length ? `M${pts.join(' L')}${shape.tagName.toLowerCase() === 'polygon' ? ' Z' : ''}` : null
    }
    case 'rect': {
      const [x, y, w, h] = [n('x'), n('y'), n('width'), n('height')]
      return `M${x} ${y} H${x + w} V${y + h} H${x} Z`
    }
    case 'circle':
    case 'ellipse': {
      const cx = n('cx'), cy = n('cy')
      const rx = shape.tagName.toLowerCase() === 'circle' ? n('r') : n('rx')
      const ry = shape.tagName.toLowerCase() === 'circle' ? n('r') : n('ry')
      return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`
    }
    case 'line':
      return `M${n('x1')} ${n('y1')} L${n('x2')} ${n('y2')}`
    default:
      return null
  }
}

/** Inline SVG (Chevron's header, Facet's corners): each shape under the exact matrix the browser used. */
function drawSvg(c: Ctx, svg: SVGSVGElement) {
  for (const shape of Array.from(svg.querySelectorAll<SVGGraphicsElement>('path, polygon, polyline, rect, circle, ellipse, line'))) {
    const style = getComputedStyle(shape)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    const d = shapePath(shape)
    const m = shape.getScreenCTM()
    if (!d || !m) continue
    const alpha = opacityOf(c, shape)
    const fill = parseColor(style.fill)
    const stroke = parseColor(style.stroke)
    c.doc.save()
    // Screen matrix, then CSS px on the page → PDF points.
    c.doc.transform(c.k * m.a, c.k * m.b, c.k * m.c, c.k * m.d, c.k * (m.e - c.origin.left), c.k * (m.f - c.origin.top))
    if (visibleColor(fill) && !/^(line|polyline)$/i.test(shape.tagName)) {
      c.doc.path(d).fillColor(rgbOf(fill), fill.a * (parseFloat(style.fillOpacity) || 1) * alpha).fill(style.fillRule === 'evenodd' ? 'even-odd' : 'nonzero')
    }
    const strokeWidth = parseFloat(style.strokeWidth) || 0
    if (visibleColor(stroke) && strokeWidth > 0) {
      // `non-scaling-stroke` keeps the width in screen px whatever the viewBox scale; otherwise it is in user units.
      const scale = style.vectorEffect === 'non-scaling-stroke' ? Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1 : 1
      c.doc.path(d).lineWidth(strokeWidth / scale).lineCap(style.strokeLinecap as 'butt' | 'round' | 'square').lineJoin(style.strokeLinejoin as 'miter' | 'round' | 'bevel')
        .strokeColor(rgbOf(stroke), stroke.a * (parseFloat(style.strokeOpacity) || 1) * alpha).stroke()
    }
    c.doc.restore()
  }
}

/**
 * How far `el`'s text box reaches under its baseline, measured, not guessed from metrics. Measured
 * off the line, in a hidden copy of the font (spec 072): a probe in the text's own line is a break
 * opportunity, and when the text wraps to a new line the probe stayed on the line before, a whole
 * line off. Inserted where the text starts, so the element's children are what they were before.
 */
const descentCache = new WeakMap<Element, number>()
function descentOf(el: Element): number {
  const cached = descentCache.get(el)
  if (cached !== undefined) return cached
  const probe = document.createElement('span')
  probe.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap'
  const letter = document.createTextNode('x')
  const marker = document.createElement('span')
  marker.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
  probe.append(letter, marker)
  const firstText = Array.from(el.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
  el.insertBefore(probe, firstText ?? el.firstChild)
  const range = document.createRange()
  range.selectNodeContents(letter)
  const descent = range.getBoundingClientRect().bottom - marker.getBoundingClientRect().bottom
  range.detach()
  probe.remove()
  descentCache.set(el, descent)
  return descent
}

async function drawText(c: Ctx, node: Text, style: CSSStyleDeclaration, el: Element) {
  const raw = node.textContent ?? ''
  if (!raw.trim()) return
  const parsed = parseColor(style.color)
  if (!visibleColor(parsed)) return
  const color = { ...parsed, a: parsed.a * opacityOf(c, el) }
  const stack = withStandIns(familyNames(style.fontFamily))
  const weight = Number(style.fontWeight) || 400
  const italic = style.fontStyle !== 'normal'
  const size = parseFloat(style.fontSize) * c.k
  const spacing = (parseFloat(style.letterSpacing) || 0) * c.k
  const range = document.createRange()
  const words = raw.matchAll(/\S+/g)
  let descent: number | null = null
  for (const match of words) {
    const start = match.index!
    // Segments of one word that share a font file (latin / latin-ext), each placed where it was laid out.
    let segStart = start
    let segFace: Face | null | undefined
    const flush = async (end: number) => {
      if (end <= segStart) return
      range.setStart(node, segStart)
      range.setEnd(node, end)
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0)
      if (!rects.length) return
      if (descent === null) descent = descentOf(el)
      // A word broken across lines (overflow-wrap) yields one rect per line: draw it per character.
      if (rects.length > 1 && end - segStart > 1) {
        for (let i = segStart; i < end; i++) {
          const saved = segStart
          segStart = i
          await drawRun(c, node, i, i + 1, segFace ?? null, stack, weight, italic, size, spacing, color, style.textTransform, descent)
          segStart = saved
        }
        return
      }
      await drawRun(c, node, segStart, end, segFace ?? null, stack, weight, italic, size, spacing, color, style.textTransform, descent)
    }
    for (let i = start; i < start + match[0].length; ) {
      const code = raw.codePointAt(i)!
      const face = faceFor(c.faces, stack, weight, italic, code)
      if (segFace !== undefined && face?.url !== segFace?.url) {
        await flush(i)
        segStart = i
      }
      segFace = face
      i += code > 0xffff ? 2 : 1
    }
    await flush(start + match[0].length)
  }
  range.detach()
}

async function drawRun(
  c: Ctx, node: Text, from: number, to: number, face: Face | null, stack: string[], weight: number, italic: boolean,
  size: number, spacing: number, color: Rgba, transform: string, descent: number,
) {
  const range = document.createRange()
  range.setStart(node, from)
  range.setEnd(node, to)
  const rect = Array.from(range.getClientRects()).find((r) => r.width > 0)
  range.detach()
  if (!rect) return
  let text = transformText((node.textContent ?? '').slice(from, to), transform)
  let fontName: string
  if (face) {
    if (!c.registered.has(face.url)) {
      c.doc.registerFont(face.url, await loadFont(woffFor(face.url)))
      c.registered.add(face.url)
    }
    fontName = face.url
  } else {
    fontName = standardFont(stack, weight, italic)
    // Only what no bundled font covers either reaches here outside WinAnsi (emoji, CJK): left out.
    text = [...text].filter((ch) => WIN_ANSI.test(ch)).join('')
    if (!text) return
  }
  c.doc.font(fontName).fontSize(size).fillColor(rgbOf(color), color.a)
  // Each run takes exactly the width the browser gave it: glyph advances differ by a hair between
  // engines (kerning, hinting), which otherwise opened uneven gaps between words. Clamped, so a
  // wrong measurement cannot stretch a word visibly.
  const natural = c.doc.widthOfString(text, { characterSpacing: spacing })
  const scaling = natural > 0 ? Math.min(115, Math.max(85, ((rect.width * c.k - spacing) / natural) * 100)) : 100
  c.doc.text(text, X(c, rect.left), Y(c, rect.bottom - descent), {
    lineBreak: false,
    baseline: 'alphabetic',
    characterSpacing: spacing,
    horizontalScaling: scaling,
  })
}

function drawLinks(c: Ctx, page: Element) {
  for (const a of Array.from(page.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
    for (const r of Array.from(a.getClientRects())) {
      if (r.width > 0) c.doc.link(X(c, r.left), Y(c, r.top), r.width * c.k, r.height * c.k, a.href)
    }
  }
}

/* ---- generated content ------------------------------------------------------------------------ */

const NO_PSEUDO = 'cv-pdf-no-pseudo'
const MARKER_ATTR = 'data-pdf-marker'

/** Copies every computed property of `from` onto `el`'s inline style. */
function copyStyle(from: CSSStyleDeclaration, el: HTMLElement) {
  for (let i = 0; i < from.length; i++) {
    const name = from.item(i)
    if (name === 'content') continue
    el.style.setProperty(name, from.getPropertyValue(name))
  }
}

/**
 * `::before` / `::after` and list markers are painted by the browser but are not in the DOM, so
 * neither a Range nor a box query reaches them: separators («·»), bullets and decorative bars went
 * missing. On this private copy of the pages they become real spans with the same computed style,
 * laid out where the browser put them, and are then drawn like any other text or box.
 */
function materializeGenerated(page: Element) {
  const sheet = document.createElement('style')
  sheet.textContent = `.${NO_PSEUDO}::before, .${NO_PSEUDO}::after { content: none !important; } .${NO_PSEUDO}::marker { content: none !important; }`
  page.prepend(sheet)
  const jobs: (() => void)[] = []
  for (const el of Array.from(page.querySelectorAll<HTMLElement>('*'))) {
    if (el === sheet) continue
    for (const which of ['::before', '::after'] as const) {
      const ps = getComputedStyle(el, which)
      const match = /^"((?:[^"\\]|\\.)*)"$/.exec(ps.content)
      if (!match) continue
      const span = document.createElement('span')
      copyStyle(ps, span)
      span.textContent = match[1]!.replace(/\\(.)/g, '$1')
      jobs.push(() => (which === '::before' ? el.prepend(span) : el.append(span)))
      jobs.push(() => el.classList.add(NO_PSEUDO))
    }
    const style = getComputedStyle(el)
    if (style.display === 'list-item' && ['disc', 'circle', 'square'].includes(style.listStyleType) && style.listStylePosition === 'outside') {
      const color = getComputedStyle(el, '::marker').color
      jobs.push(() => el.setAttribute(MARKER_ATTR, `${style.listStyleType}|${color}`))
    }
  }
  // Measure everything first, then change the DOM, so no measurement sees a half-converted page.
  for (const job of jobs) job()
}

/**
 * A list bullet as Chrome paints it: not the "•" glyph but a shape sized from the font's ascent,
 * in whole CSS pixels — d = round(ascent / 3) across, its edge d + 6 px before the text, its
 * centre d − 0.5 px above the baseline. Measured at 10–100 px in Source Sans 3 and Inter, and
 * against the printed PDF; the ascent is read from the item's first line.
 */
function drawMarker(c: Ctx, li: Element) {
  const [type, colour] = li.getAttribute(MARKER_ATTR)!.split('|') as [string, string]
  const color = parseColor(colour)
  const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT)
  let text: Text | null = null
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.textContent?.trim()) {
      text = n as Text
      break
    }
  }
  if (!text || !visibleColor(color)) return
  const range = document.createRange()
  const first = text.textContent!.search(/\S/)
  range.setStart(text, first)
  range.setEnd(text, first + 1)
  const rect = range.getClientRects()[0]
  range.detach()
  if (!rect) return
  const baseline = rect.bottom - descentOf(text.parentElement!)
  const ascent = baseline - rect.top
  const contentLeft = li.getBoundingClientRect().left + (parseFloat(getComputedStyle(li).paddingLeft) || 0)
  const px = Math.max(1, Math.round(ascent / 3))
  const d = px * c.k
  const cx = X(c, contentLeft - px - 6 - px / 2)
  const cy = Y(c, baseline - (px - 0.5))
  c.doc.save()
  if (type === 'square') c.doc.rect(cx - d / 2, cy - d / 2, d, d).fillColor(rgbOf(color), color.a).fill()
  else if (type === 'circle') c.doc.lineWidth(d / 6).circle(cx, cy, d / 2 - d / 12).strokeColor(rgbOf(color), color.a).stroke()
  else c.doc.circle(cx, cy, d / 2).fillColor(rgbOf(color), color.a).fill()
  c.doc.restore()
}

async function drawPage(c: Ctx, page: Element) {
  const walker = document.createTreeWalker(page, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const el = node.parentElement!
      if (el.closest('svg')) continue
      await drawText(c, node as Text, getComputedStyle(el), el)
      continue
    }
    const el = node as Element
    // An SVG is drawn whole by drawSvg; its inner nodes are not CSS boxes.
    if (el.parentElement?.closest('svg')) continue
    const style = getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden' || opacityOf(c, el) === 0) continue
    if (el instanceof SVGSVGElement) {
      // The svg element is a CSS box too (the discs behind the contact icons), then its shapes.
      await drawBox(c, el, style)
      drawSvg(c, el)
      continue
    }
    await drawBox(c, el, style)
    if (el instanceof HTMLImageElement) await drawImage(c, el, style)
    if (el.hasAttribute(MARKER_ATTR)) drawMarker(c, el)
  }
  drawLinks(c, page)
}

/* ---- entry ------------------------------------------------------------------------------------ */

/** Builds the CV as a PDF file, laid out exactly as the print would be. */
export async function buildDirectPdf(data: CVData, templateId: string, title: string): Promise<Blob> {
  const { data: rendered } = await resolvePhoto(data, 'dataUrl')
  const host = document.createElement('div')
  // Laid out (paged.js measures it) but never seen; opacity rather than visibility, which every
  // descendant would inherit and read as "hidden".
  host.style.cssText = HIDDEN_HOST
  document.body.appendChild(host)
  try {
    const html = await renderTemplateHtml(rendered, templateId)
    if (!(await paginateInto(host, html, exportCss()))) throw new Error('Pagination failed')
    await document.fonts?.ready
    return await pdfFromPagination(host, title, data.meta.language)
  } finally {
    releasePagination(host)
    host.remove()
  }
}

const HIDDEN_HOST = 'position:fixed;left:-10000px;top:0;opacity:0;pointer-events:none'

/**
 * The drawing half of `buildDirectPdf`: the pages paged.js left in `paginated`, as a PDF. Exported
 * so the browser checks in `qa/` can hand it small paginated fixtures (opacity, bullets, borders).
 */
export async function pdfFromPagination(paginated: HTMLElement, title: string, lang: string): Promise<Blob> {
  const [{ default: PDFDocument, registerStdFonts }, ...std] = await Promise.all([
    import('pdfkit'),
    import('pdfkit/standard-fonts/Helvetica'),
    import('pdfkit/standard-fonts/HelveticaBold'),
    import('pdfkit/standard-fonts/HelveticaOblique'),
    import('pdfkit/standard-fonts/HelveticaBoldOblique'),
    import('pdfkit/standard-fonts/TimesRoman'),
    import('pdfkit/standard-fonts/TimesBold'),
    import('pdfkit/standard-fonts/TimesItalic'),
    import('pdfkit/standard-fonts/TimesBoldItalic'),
    import('pdfkit/standard-fonts/Courier'),
    import('pdfkit/standard-fonts/CourierBold'),
    import('pdfkit/standard-fonts/CourierOblique'),
    import('pdfkit/standard-fonts/CourierBoldOblique'),
  ])
  registerStdFonts(...std.map((m) => m.default))

  const copyHost = document.createElement('div')
  copyHost.style.cssText = HIDDEN_HOST
  document.body.appendChild(copyHost)
  try {
    // paged.js keeps resize observers on its pages and re-runs layout when one changes size, which
    // the span conversion below does. A copy keeps paged.js's styles but none of its observers.
    const pagesCopy = paginated.cloneNode(true) as HTMLElement
    pagesCopy.removeAttribute('id')
    copyHost.appendChild(pagesCopy)

    const doc = new PDFDocument({ size: PAGE_PT, margin: 0, autoFirstPage: false, info: { Title: title, Creator: 'Keireki Craft' }, lang })
    const chunks: Uint8Array[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    const done = new Promise<void>((resolve) => doc.on('end', resolve))
    const faces = documentFaces()
    const registered = new Set<string>()
    for (const page of Array.from(pagesCopy.querySelectorAll('.pagedjs_page'))) {
      doc.addPage({ size: PAGE_PT, margin: 0 })
      materializeGenerated(page)
      const origin = page.getBoundingClientRect()
      await drawPage({ doc, faces, registered, page, origin, k: PAGE_PT[0] / origin.width }, page)
    }
    doc.end()
    await done
    return new Blob(chunks as BlobPart[], { type: 'application/pdf' })
  } finally {
    copyHost.remove()
  }
}
