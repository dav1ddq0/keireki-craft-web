/**
 * The slice of PDFKit's browser build the direct PDF export uses (spec 031). The package ships no
 * types; only what `services/export/pdfDirect` calls is declared, so a wrong call fails typecheck.
 */
declare module 'pdfkit' {
  interface TextOptions {
    lineBreak?: boolean
    baseline?: 'alphabetic' | 'top' | number
    characterSpacing?: number
    horizontalScaling?: number
    /** Both true: text render mode 2, the outline filled and stroked (a made-up bold, spec 088). */
    fill?: boolean
    stroke?: boolean
  }

  interface StandardFontData {
    name: string
  }

  export function registerStdFonts(...fonts: StandardFontData[]): void

  export default class PDFDocument {
    constructor(options?: {
      size?: [number, number]
      margin?: number
      autoFirstPage?: boolean
      compress?: boolean
      font?: string
      info?: Record<string, string | Date>
      lang?: string
    })
    addPage(options?: { size?: [number, number]; margin?: number }): this
    registerFont(name: string, src: ArrayBuffer | Uint8Array | string): this
    font(name: string): this
    fontSize(size: number): this
    fillColor(color: string | [number, number, number], opacity?: number): this
    strokeColor(color: string | [number, number, number], opacity?: number): this
    lineWidth(width: number): this
    lineCap(cap: 'butt' | 'round' | 'square'): this
    lineJoin(join: 'miter' | 'round' | 'bevel'): this
    miterLimit(limit: number): this
    dash(length: number, options?: { space?: number; phase?: number }): this
    undash(): this
    text(text: string, x: number, y: number, options?: TextOptions): this
    widthOfString(text: string, options?: TextOptions): number
    rect(x: number, y: number, w: number, h: number): this
    roundedRect(x: number, y: number, w: number, h: number, r: number): this
    moveTo(x: number, y: number): this
    lineTo(x: number, y: number): this
    path(d: string): this
    circle(x: number, y: number, r: number): this
    fill(rule?: 'nonzero' | 'even-odd'): this
    stroke(): this
    save(): this
    restore(): this
    clip(): this
    translate(x: number, y: number): this
    scale(x: number, y?: number): this
    transform(a: number, b: number, c: number, d: number, e: number, f: number): this
    image(
      src: ArrayBuffer | Uint8Array | string,
      x: number,
      y: number,
      options?: { width?: number; height?: number; cover?: [number, number]; fit?: [number, number]; align?: 'center'; valign?: 'center' },
    ): this
    link(x: number, y: number, w: number, h: number, url: string): this
    on(event: 'data', listener: (chunk: Uint8Array) => void): this
    on(event: 'end', listener: () => void): this
    end(): void
  }
}

declare module 'pdfkit/standard-fonts/*' {
  const font: import('pdfkit').StandardFontData
  export default font
}
