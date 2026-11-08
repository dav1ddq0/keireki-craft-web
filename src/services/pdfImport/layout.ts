import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import { isSectionHeading } from './patterns'

/** One reconstructed visual line (a cell of one: see `CELL_GAP`), with the style signals the heuristics need. */
export interface ExtractedLine {
  page: number
  /** Distance from the top of the page, in PDF units. */
  y: number
  x: number
  /** Where the last glyph ends; with `x` it is the line's extent across the page (spec 040). */
  end: number
  text: string
  fontSize: number
  fontName: string
  bold: boolean
}

/** A positioned piece of a line, as pdf.js hands it back. */
export interface TextFragment {
  x: number
  /** Where the fragment's last glyph ends. */
  end: number
  text: string
  fontSize: number
  fontName?: string
  /** The item is letter-spaced text: a gap next to it is one between letters more often than words. */
  tracked?: boolean
}

/** Fragments whose baselines differ by less than this are the same line. */
const Y_TOLERANCE = 2.5

/**
 * A gap wider than this share of the font size between two fragments of a line is a word space.
 * Measured on the app's own PDFs (spec 037): fragments that touch (a letter from another font
 * file, an e-mail split at its break points) sit within ±0.03 em; word spaces are 0.17 em or more.
 */
const WORD_GAP = 0.1

/** ...and next to letter-spaced text, where every letter is that far from the next. */
const TRACKED_WORD_GAP = 0.3

/**
 * A gap wider than this many font sizes ends a cell: the text on the other side is a different
 * column or a label and its value, not the next words of the line (spec 040). Word spaces and the
 * " · " between items measure well under one em.
 */
const CELL_GAP = 2

/** The narrowest strip of the page that no text crosses and that still counts as a gutter, in PDF units. */
const GUTTER_MIN = 12

/**
 * Headers do not count when looking for a gutter: a cell wider than this share of the text, or set
 * this many times larger than the usual type, may cross it. Everything else may not, or the ragged
 * right edge of a column would read as a gutter.
 */
const HEADER_WIDTH = 0.8
const HEADER_SIZE = 1.35

/** A column needs this many cells, mostly in runs of lines this close, to be text that flows. */
const FLOW_MIN_CELLS = 3
const FLOW_LINE_GAP = 2.4

/**
 * pdf.js hands back positioned fragments, not lines. Fragments at the same height are one line,
 * which a wide gap splits into cells; `readingOrder` then puts the cells of a page in the order a
 * person reads them, column by column where the page has columns.
 */
export function groupIntoLines(items: TextItem[], page: number, boldFonts?: ReadonlySet<string>): ExtractedLine[] {
  const buckets: { y: number; fragments: TextFragment[] }[] = []

  for (const item of items) {
    if (!('str' in item) || !item.str.trim()) continue
    const [, , , scaleY, x, y] = item.transform as number[]
    const fragment = {
      x,
      end: x + (item.width || 0),
      text: item.str,
      fontSize: Math.abs(scaleY) || 0,
      fontName: String(item.fontName ?? ''),
      tracked: (item as TrackedItem).tracked,
    }
    const bucket = buckets.find((candidate) => Math.abs(candidate.y - y) <= Y_TOLERANCE)
    if (bucket) bucket.fragments.push(fragment)
    else buckets.push({ y, fragments: [fragment] })
  }

  const lines = buckets.flatMap(({ y, fragments }) =>
    splitIntoCells(fragments).map((cell) => {
      const first = cell[0]!
      return {
        page,
        y,
        x: Math.min(...cell.map((f) => f.x)),
        end: Math.max(...cell.map((f) => f.end)),
        text: closeOpeningQuotes(collapseLetterSpacing(joinFragments(cell).replace(/\s+/g, ' ').trim())),
        fontSize: Math.max(...cell.map((f) => f.fontSize)),
        fontName: first.fontName ?? '',
        bold: cell.some((f) => (boldFonts ? boldFonts.has(f.fontName ?? '') : isBold(f.fontName ?? ''))),
      }
    }),
  )
  return readingOrder(lines.filter((line) => line.text.length > 0))
}

/**
 * An opening quote that starts a word is drawn apart from it at the start of a line in a printed PDF
 * ("‘ rigor’", spec 083): the space after it goes. Only where a word starts, so a closing “ or ‘ (the
 * German „Qualität“ und) keeps the space after it.
 */
function closeOpeningQuotes(text: string): string {
  return text.replace(/(^|\s)([‘“])\s+(?=[\p{L}\p{N}])/gu, '$1$2')
}

/** The fragments of one line, left to right, cut wherever the gap is wider than `CELL_GAP`. */
function splitIntoCells(fragments: TextFragment[]): TextFragment[][] {
  const cells: TextFragment[][] = []
  let end = -Infinity
  for (const fragment of [...fragments].sort((a, b) => a.x - b.x)) {
    if (!cells.length || fragment.x - end > CELL_GAP * fragment.fontSize) cells.push([])
    cells.at(-1)!.push(fragment)
    end = Math.max(end, fragment.end)
  }
  return cells
}

/**
 * The cells of one page in reading order. PDF y grows upward, so descending y is top to bottom.
 * Where the page has two or more columns of flowing text, each column is read on its own, the one
 * with the largest type (the name) first, and a cell that crosses a gutter (a header) ends the band
 * of columns above it. Otherwise it is plain top to bottom, left to right.
 */
export function readingOrder(cells: ExtractedLine[]): ExtractedLine[] {
  return inBands([...cells].sort((a, b) => b.y - a.y || a.x - b.x))
}

/** The fewest cells worth looking for columns in. */
const BAND_MIN_CELLS = 8

/**
 * Columns often cover only part of a page: a full-width summary above a skills column and a
 * languages column, or a centred headline above two columns. When the whole page has no gutter,
 * the longest run of rows at the bottom, and failing that at the top, that does is read by column
 * and the rest is looked at again on its own.
 */
function inBands(topToBottom: ExtractedLine[]): ExtractedLine[] {
  if (topToBottom.length < BAND_MIN_CELLS) return topToBottom
  const whole = byColumns(topToBottom)
  if (whole) return whole
  for (let from = 1; from <= topToBottom.length - BAND_MIN_CELLS + 1; from++) {
    const below = byColumns(topToBottom.slice(from))
    if (below) return [...inBands(topToBottom.slice(0, from)), ...below]
  }
  for (let to = topToBottom.length - 1; to >= BAND_MIN_CELLS - 1; to--) {
    const above = byColumns(topToBottom.slice(0, to))
    if (above) return [...above, ...inBands(topToBottom.slice(to))]
  }
  return topToBottom
}

/** `topToBottom` read column by column, or null when it has no two columns of flowing text. */
function byColumns(topToBottom: ExtractedLine[]): ExtractedLine[] | null {
  const found = findGutters(topToBottom)
  if (!found.length) return null
  // The strip between the two halves of entries set two by two is not a gutter between columns.
  const pairs = pairGutters(topToBottom, found)
  const gutters = withoutValueStrips(topToBottom, found.filter((gutter) => !pairs.includes(gutter)))
  if (!gutters.length) return pairs.length ? rowByRow(topToBottom, secondOfPairs(topToBottom, pairs, found)) : null

  const crosses = (cell: ExtractedLine) => gutters.some((g) => cell.x < g.end && cell.end > g.start)
  const columnOf = (cell: ExtractedLine) => gutters.filter((g) => cell.x >= g.end).length
  const columns = Array.from({ length: gutters.length + 1 }, (_, index) => topToBottom.filter((cell) => !crosses(cell) && columnOf(cell) === index))
  const flowing = columns.map((column, index) => (flows(column) ? index : -1)).filter((index) => index >= 0)
  if (flowing.length < 2) return null
  // Section headings in one column, their text beside them in another, is a table of labels and
  // values: it reads top to bottom. Columns of their own have headings of their own: several each, or
  // one set in capitals (a side column with only its languages, spec 083), or two side by side on one
  // row, which a table never has.
  const headed = flowing.map((index) => columns[index]!.filter((cell) => isSectionHeading(cell.text)))
  const total = headed.reduce((sum, cells) => sum + cells.length, 0)
  const ownHeadings = headed.every((cells) => cells.length >= Math.max(2, total * COLUMN_HEADING_SHARE) || cells.some((cell) => isCapitals(cell.text)))
  const sideBySide = headed.some((cells, i) => headed.slice(i + 1).some((others) => cells.some((a) => others.some((b) => Math.abs(a.y - b.y) <= SAME_ROW))))
  if (!ownHeadings && !sideBySide) return null

  // A column of labels or dates reads with the flowing column nearest to it.
  const target = (index: number) => flowing.reduce((best, candidate) => (Math.abs(candidate - index) < Math.abs(best - index) ? candidate : best))
  const largest = topToBottom.filter((cell) => !crosses(cell)).reduce((best, cell) => (cell.fontSize > best.fontSize ? cell : best))
  const first = target(columnOf(largest))
  const order = [first, ...flowing.filter((index) => index !== first)]
  const second = secondOfPairs(topToBottom, pairs, found)

  const out: ExtractedLine[] = []
  let band = new Map<number, ExtractedLine[]>(order.map((index) => [index, []]))
  const flush = () => {
    for (const index of order) out.push(...rowByRow(band.get(index)!, second))
    band = new Map(order.map((index) => [index, []]))
  }
  for (const cell of topToBottom) {
    if (crosses(cell)) {
      flush()
      out.push(cell)
    } else band.get(target(columnOf(cell)))!.push(cell)
  }
  flush()
  return out
}

/**
 * Entries set two by two (spec 081): the second of each pair stands in a column with no headings of
 * its own, about as wide as the one on its left, which has them (or which has none either, on a page
 * the section runs on to). The strip between them is the gutter of a pair, not of two columns.
 * An entry's title that wraps can leave a word that looks like a heading ("Stack"); set smaller than
 * the neighbour's headings, it is not one, unless it is set in capitals (spec 083).
 */
function pairGutters(topToBottom: ExtractedLine[], gutters: Gutter[]): Gutter[] {
  const crosses = (cell: ExtractedLine) => gutters.some((g) => cell.x < g.end && cell.end > g.start)
  const columnOf = (cell: ExtractedLine) => gutters.filter((g) => cell.x >= g.end).length
  const columns = Array.from({ length: gutters.length + 1 }, (_, index) => topToBottom.filter((cell) => !crosses(cell) && columnOf(cell) === index))
  const flowing = columns.map((column) => flows(column))
  // A heading counts where it starts, even across the strip: it may be as wide as both entries.
  const headed = columns.map((_, index) => topToBottom.filter((cell) => columnOf(cell) === index && isSectionHeading(cell.text)))
  const span = (cells: ExtractedLine[]) => Math.max(...cells.map((c) => c.end)) - Math.min(...cells.map((c) => c.x))

  const pairs: Gutter[] = []
  for (let index = 1; index < columns.length; index++) {
    const host = index - 1
    if (!flowing[host] || !flowing[index] || pairs.includes(gutters[host - 1]!)) continue
    if (!headed[host]!.length && flowing.filter(Boolean).length > 2) continue
    const smallest = headed[host]!.length ? Math.min(...headed[host]!.map((cell) => cell.fontSize)) : 0
    if (headed[index]!.some((cell) => cell.fontSize >= COMPANION_HEADING * smallest || isCapitals(cell.text))) continue
    const [a, b] = [span(columns[index]!), span(columns[host]!)]
    if (Math.min(a, b) >= COMPANION_WIDTH * Math.max(a, b)) pairs.push(gutters[host]!)
  }
  return pairs
}

/** The cells between a pair's gutter and the next gutter on the page: the second entry of each pair. */
function secondOfPairs(topToBottom: ExtractedLine[], pairs: Gutter[], gutters: Gutter[]): Set<ExtractedLine> {
  const inSecond = (cell: ExtractedLine, pair: Gutter) => cell.x >= pair.end && cell.end <= (gutters.find((g) => g.start >= pair.end)?.start ?? Infinity)
  return new Set(topToBottom.filter((cell) => pairs.some((pair) => inSecond(cell, pair))))
}

/** A pair's two columns are about as wide: the narrower at least this share of the wider. */
const COMPANION_WIDTH = 0.6

/** A heading in a pair's second column is set at least this share of the size of its first's. */
const COMPANION_HEADING = 0.9

/** Rows of pairs are this many type sizes apart, baseline to baseline, more than lines of one entry. */
const ROW_GAP = 1.8

/**
 * A column and the second column of its pairs, top to bottom, read row by row: where neither has
 * text for a while a row ends, and each row is its first column's lines, then its second's.
 */
function rowByRow(cells: ExtractedLine[], second: ReadonlySet<ExtractedLine>): ExtractedLine[] {
  if (!cells.some((cell) => second.has(cell))) return cells
  const out: ExtractedLine[] = []
  let row: ExtractedLine[] = []
  const end = () => {
    out.push(...row.filter((cell) => !second.has(cell)), ...row.filter((cell) => second.has(cell)))
    row = []
  }
  cells.forEach((cell, i) => {
    const above = cells[i - 1]
    if (above && above.y - cell.y > ROW_GAP * Math.max(above.fontSize, cell.fontSize)) end()
    row.push(cell)
  })
  end()
  return out
}

/** The vertical strips, inside the text, that no cell but a header crosses. */
type Gutter = { start: number; end: number }

function findGutters(cells: ExtractedLine[]): Gutter[] {
  const left = Math.min(...cells.map((c) => c.x))
  const right = Math.max(...cells.map((c) => c.end))
  const sizes = cells.map((c) => c.fontSize).sort((a, b) => a - b)
  const usualSize = sizes[Math.floor(sizes.length / 2)]!
  const body = cells
    .filter((c) => c.end - c.x <= HEADER_WIDTH * (right - left) && c.fontSize <= HEADER_SIZE * usualSize)
    .sort((a, b) => a.x - b.x)

  // The stretches of the page that body text covers, merged; the wide gaps between them are gutters.
  const gutters: Gutter[] = []
  let covered = body[0]?.end ?? 0
  for (const cell of body) {
    if (cell.x - covered >= GUTTER_MIN) gutters.push({ start: covered, end: cell.x })
    covered = Math.max(covered, cell.end)
  }
  return gutters
}

/** Each column of text of its own has at least this share of the section headings. */
const COLUMN_HEADING_SHARE = 0.25

/** Cells whose baselines are this close (PDF units) are on one row. */
const SAME_ROW = 2.5

/** A value beside a row has at most this many words. */
const VALUE_WORDS = 3

/**
 * A column of short values, each on the row of a cell on its left, has no lines of its own: the
 * levels set at the right edge of a side column, across from their languages (spec 083). It is part
 * of the column on its left, and the strip between them is no gutter, not even for a name that
 * crosses it.
 */
function withoutValueStrips(topToBottom: ExtractedLine[], gutters: Gutter[]): Gutter[] {
  const crosses = (cell: ExtractedLine) => gutters.some((g) => cell.x < g.end && cell.end > g.start)
  const columnOf = (cell: ExtractedLine) => gutters.filter((g) => cell.x >= g.end).length
  return gutters.filter((_, index) => {
    const column = topToBottom.filter((cell) => !crosses(cell) && columnOf(cell) === index + 1)
    return !(column.length && column.every((cell) => isValueBesideRow(cell, topToBottom)))
  })
}

function isValueBesideRow(cell: ExtractedLine, topToBottom: ExtractedLine[]): boolean {
  return (
    !isSectionHeading(cell.text) &&
    cell.text.split(/\s+/).length <= VALUE_WORDS &&
    topToBottom.some((other) => other.end < cell.x && Math.abs(other.y - cell.y) <= SAME_ROW)
  )
}

/** Written in capitals, as headings are and words in a sentence are not. */
function isCapitals(text: string): boolean {
  return /\p{Lu}/u.test(text) && text === text.toLocaleUpperCase()
}

/** Text that flows: several cells, most of them a line or two below the one above. */
function flows(column: ExtractedLine[]): boolean {
  if (column.length < FLOW_MIN_CELLS) return false
  const close = column.slice(1).filter((cell, i) => column[i]!.y - cell.y <= FLOW_LINE_GAP * Math.max(cell.fontSize, column[i]!.fontSize)).length
  return close >= 2 && close / (column.length - 1) >= 0.5
}

/** An item is looked for further on in the glyph stream only if it is this long, and within this many glyphs. */
const RESYNC_MIN_LETTERS = 6
const RESYNC_WINDOW = 4000

/**
 * A gap this much wider (in type sizes) than the usual one between the glyphs of one drawing
 * operation is a word space. A producer that leaves its spaces out spaces its words with TJ
 * adjustments of about a third of the type size; kerning is under a sixth; letter-spacing adds the
 * same amount to every gap, which the usual one takes out.
 */
const WORD_ADJUST = 0.2

/** One glyph the page draws, in drawing order. */
export interface DrawnGlyph {
  /** What it stands for ("" or a space for a space glyph). */
  text: string
  /** The gap the producer left before it inside the same drawing operation, in type sizes. */
  before: number
  /** Which drawing operation drew it: a gap between two is a move of the text, not an adjustment. */
  op: number
}

export type TrackedItem = TextItem & { tracked?: boolean }

/**
 * Text spread out letter by letter: pieces that are almost all a letter or two ("U C J A"), or one
 * that is a lone consonant, which no word is ("d atos"). A vowel alone may be a word ("y", "a").
 */
function looksTracked(text: string): boolean {
  const tokens = text.trim().split(/\s+/)
  if (tokens.length < 2) return false
  const lone = tokens.some((token) => token.length === 1 && /\p{L}/u.test(token) && !/[aeiouyáéíóú]/iu.test(token))
  return lone || (tokens.length >= 3 && tokens.join('').length / tokens.length <= 2.2)
}

/**
 * Gives each text item the spaces the PDF itself draws. pdf.js adds a space wherever two glyphs are
 * far apart, so letter-spaced text comes back as "I ng e ni e r a de da t os" and no rule can tell
 * those spaces from the ones between words. The glyphs the page draws (`glyphs`) have no such
 * guesses, and each space between two letters of an item is decided from them:
 * - a space glyph between them is a space;
 * - inside one drawing operation, a gap wider than the usual one by `WORD_ADJUST` is a space and
 *   any other is not, whatever pdf.js said ("Dvo ř ák" was kerning; letter-spaced words are
 *   told apart by the wider gap);
 * - between operations (each glyph its own, in a letter-spaced line) it is a space only when a
 *   space glyph says so for a letter-spaced item, and as pdf.js said for any other, since a gap
 *   drawn as a margin (the " · " between items) has no glyph.
 * An item whose letters are not found in the glyphs is left alone (spec 040).
 */
export function repairSpaces(items: TextItem[], glyphs: DrawnGlyph[]): TrackedItem[] {
  const chars: Array<{ ch: string; before: number; op: number }> = []
  for (const glyph of glyphs) {
    ;[...glyph.text.normalize('NFKC')].forEach((ch, index) => chars.push({ ch, before: index === 0 ? glyph.before : 0, op: glyph.op }))
  }
  const letters: string[] = []
  const at: number[] = []
  chars.forEach((entry, index) => {
    if (!/\s/u.test(entry.ch)) {
      letters.push(entry.ch)
      at.push(index)
    }
  })
  const stream = letters.join('')
  let cursor = 0

  return items.map((original): TrackedItem => {
    if (!('str' in original)) return original
    const tracked = looksTracked(original.str)
    const item: TrackedItem = tracked ? { ...original, tracked } : original
    const own = [...item.str.normalize('NFKC')].filter((ch) => !/\s/u.test(ch))
    if (!own.length) return item
    const needle = own.join('')
    let start = stream.startsWith(needle, cursor) ? cursor : -1
    if (start < 0 && own.length >= RESYNC_MIN_LETTERS) {
      const found = stream.slice(cursor, cursor + RESYNC_WINDOW).indexOf(needle)
      if (found >= 0) start = cursor + found
    }
    if (start < 0) return item
    cursor = start + own.length

    // The spaces pdf.js put after each letter.
    const given: boolean[] = []
    let letter = -1
    for (const ch of item.str.normalize('NFKC')) {
      if (/\s/u.test(ch)) {
        if (letter >= 0) given[letter] = true
      } else letter++
    }
    const glyphAt = (index: number) => chars[at[start + index]!]!
    const real = (index: number) => at[start + index + 1]! - at[start + index]! > 1
    const together = (index: number) => !real(index) && glyphAt(index).op === glyphAt(index + 1).op
    const gaps = own.slice(1).map((_, index) => index).filter(together).map((index) => glyphAt(index + 1).before).sort((a, b) => a - b)
    const usual = gaps[Math.floor(gaps.length / 2)] ?? 0

    let drawn = ''
    own.forEach((ch, index) => {
      drawn += ch
      if (index === own.length - 1) return
      const space = real(index) || (together(index) ? glyphAt(index + 1).before - usual >= WORD_ADJUST : !tracked && !!given[index])
      if (space) drawn += ' '
    })
    return { ...item, str: drawn }
  })
}

/**
 * Joins a line's fragments left to right, with a space only where there is a gap between two.
 * A PDF draws a word in several pieces when part of it comes from another font file (a "Ł",
 * an "ř") or when it was laid out with break points (an e-mail address); those pieces touch.
 */
export function joinFragments(fragments: TextFragment[]): string {
  let text = ''
  let end = -Infinity
  let tracked = false
  for (const fragment of [...fragments].sort((a, b) => a.x - b.x)) {
    const gap = (tracked || fragment.tracked ? TRACKED_WORD_GAP : WORD_GAP) * fragment.fontSize
    if (text && fragment.x - end > gap) text += ' '
    text += fragment.text
    end = Math.max(end, fragment.end)
    tracked = !!fragment.tracked
  }
  return text
}

/**
 * Undoes CSS `letter-spacing` in the extracted text.
 *
 * A tracked-out heading reaches pdf.js as one fragment per glyph, and line
 * reconstruction joins them with spaces: "EXPERIENCIA" arrives as
 * "E X P E R I E N C I A" and no keyword heuristic recognises it. Runs of three
 * or more single-character tokens are glued back together; shorter runs are
 * left alone so real text like "Go y R" survives.
 */
export function collapseLetterSpacing(text: string): string {
  const tokens = text.split(' ')
  const out: string[] = []
  let run: string[] = []

  const flush = () => {
    if (run.length >= 3) out.push(run.join(''))
    else out.push(...run)
    run = []
  }

  for (const token of tokens) {
    if ([...token].length === 1 && /[\p{L}\p{N}]/u.test(token)) run.push(token)
    else {
      flush()
      out.push(token)
    }
  }
  flush()

  return out.join(' ').replace(/\s+/g, ' ').trim()
}

function isBold(fontName: string): boolean {
  return /bold|black|heavy|semibold|[-,]bd\b/i.test(fontName)
}
