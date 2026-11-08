import type { ExtractedDocument, ExtractedLine } from './extract'
import {
  BULLET_RE,
  DATE_RANGE_RE,
  EMAIL_RE,
  headingLanguage,
  isSectionHeading,
  MONTH_INDEX,
  normalizeHeading,
  PHONE_RE,
  PRESENT_WORDS,
  PROFILE_HOSTS,
  SECTION_KEYWORDS,
  sectionKindOfSquashed,
  URL_RE,
  type HeadingLanguage,
  type SectionKind,
} from './patterns'

export type Confidence = 'high' | 'medium' | 'low'

export interface DetectedField<T> {
  value: T
  confidence: Confidence
}

export interface TextBlock {
  id: string
  lines: string[]
  /** Heading the block sat under, when the heading itself was not recognized. */
  heading?: string
}

export interface DetectedSection {
  kind: SectionKind
  heading: string
  lines: ExtractedLine[]
}

export interface ImportDraft {
  fullName: DetectedField<string>
  headline: DetectedField<string>
  email: DetectedField<string>
  phone: DetectedField<string>
  location: DetectedField<string>
  links: Array<{ label: string; url: string }>
  sections: DetectedSection[]
  unclassified: TextBlock[]
  rawText: string
  warnings: Array<'multiColumn' | 'noSections' | 'noName'>
  /** The CV's language by its section headings, or null when none is known (spec 061). */
  language: HeadingLanguage | null
}

/**
 * Stage 2 of the import pipeline (spec §7.2). Pure and synchronous: it takes the
 * extraction output and produces a *proposal*, never a `CVData`. Nothing here
 * reaches the store — the review screen (stage 3) decides what is applied.
 */
export function analyze(doc: ExtractedDocument): ImportDraft {
  const lines = joinNameLines(doc.lines)
  // The name is found first: it is typically the largest, boldest, shortest line
  // on the page, which is exactly the shape of a section header. Excluding it up
  // front stops it from being read as one.
  const nameIndex = findNameIndex(lines)
  const headings = findHeadings(lines, nameIndex)
  const sections = sliceSections(lines, headings)
  const headerLines = lines.slice(0, headings[0]?.index ?? Math.min(lines.length, 12))

  const email = findFirst(lines, EMAIL_RE)
  const phone = findPhone(lines)
  const links = findLinks(lines)
  const name = describeName(lines, nameIndex, headerLines, doc.title)
  const headline = findHeadline(headerLines, lines[nameIndex])
  // The place is in the header or, when the contact details sit in a column of their own, beside them.
  const location = findLocation([...headerLines, ...nearContact(lines, email.value, phone.value)], email.value, phone.value)

  const warnings: ImportDraft['warnings'] = []
  if (doc.looksMultiColumn) warnings.push('multiColumn')
  if (sections.length === 0) warnings.push('noSections')
  if (!name.value) warnings.push('noName')

  return {
    fullName: name,
    headline,
    email,
    phone,
    location,
    links,
    sections,
    unclassified: buildUnclassified(lines, headings, headerLines, {
      email: email.value,
      phone: phone.value,
      name: name.value,
      headline: headline.value,
      location: location.value,
      links,
    }),
    rawText: doc.rawText,
    warnings,
    language: headingLanguage(sections.map((section) => section.heading)),
  }
}

/* ---- headings ---------------------------------------------------------- */

/**
 * The end of a word the line above broke at its hyphen: "Stack" under "Desarrolladora Full-", in its
 * type, where it starts (spec 081). A keyword there is part of a title, not a section's heading.
 */
function continuesHyphenated(lines: ExtractedLine[], index: number): boolean {
  const line = lines[index]!
  const above = lines[index - 1]
  return (
    !!above &&
    above.page === line.page &&
    /\p{L}-$/u.test(above.text.trim()) &&
    Math.abs(above.x - line.x) <= 2 &&
    Math.abs(above.fontSize - line.fontSize) <= 0.5 &&
    above.y - line.y > 0 &&
    above.y - line.y <= 1.6 * line.fontSize
  )
}

interface HeadingHit {
  index: number
  kind: SectionKind | null
  text: string
}

/**
 * A section header is rarely identifiable by one signal alone, so several are
 * combined. A known keyword is enough on its own. A heading of a section the app
 * does not know ("CHARLAS") is found by what it has in common with the ones it
 * does know: it is set in capitals like them, in their type size, and is larger
 * than the text or set apart from it. Without that, every acronym in a list of
 * skills would split the section it sits in (spec 040).
 */
function findHeadings(lines: ExtractedLine[], skipIndex: number): HeadingHit[] {
  if (!lines.length) return []
  const sizes = lines.map((l) => l.fontSize).filter(Boolean)
  const averageSize = sizes.reduce((a, b) => a + b, 0) / (sizes.length || 1)
  const usualGap = lineSpacing(lines)

  // Capitals of a word, not a level ("C1") or an acronym ("SQL") in a list.
  const isUpper = (text: string) => text === text.toUpperCase() && /(?:\p{Lu}[^\p{L}]*){4,}/u.test(text) && !/\d/.test(text)
  const isShort = (text: string) => text.trim().split(/\s+/).length <= 4

  const hits: HeadingHit[] = []
  lines.forEach((line, index) => {
    if (index === skipIndex) return
    const normalized = normalizeHeading(line.text)
    if (!normalized || normalized.length > 40) return

    const keyword = SECTION_KEYWORDS.find((entry) => entry.words.includes(normalized))
    if (keyword && !continuesHyphenated(lines, index)) {
      hits.push({ index, kind: keyword.kind, text: line.text.trim() })
      return
    }
    // Tracked-out capitals arrive in pieces; run together they may still name a section.
    const squashedKind = isUpper(line.text) ? sectionKindOfSquashed(line.text) : null
    if (squashedKind) hits.push({ index, kind: squashedKind, text: line.text.replace(/\s+/g, '') })
  })

  // What the known headings have in common.
  const known = hits.map((hit) => lines[hit.index]!)
  const knownSize = median(known.map((line) => line.fontSize))
  const knownUpper = known.filter((line) => isUpper(line.text.replace(/\s+/g, ' '))).length * 2 >= known.length
  const unknown: HeadingHit[] = []
  lines.forEach((line, index) => {
    if (index === skipIndex || hits.some((hit) => hit.index === index)) return
    if (!isShort(line.text) || !isUpper(line.text) || normalizeHeading(line.text).length > 40) return
    const previous = lines[index - 1]
    // A page break sets a line apart as much as any gap does.
    const gap = !previous ? 0 : previous.page === line.page ? previous.y - line.y : Infinity
    const apart = line.fontSize > averageSize * 1.08 || gap > usualGap * SPACED_GAP
    const alike = !known.length || (knownUpper && Math.abs(line.fontSize - knownSize) <= knownSize * HEADING_SIZE_MATCH)
    if (apart && alike) unknown.push({ index, kind: null, text: line.text.trim() })
  })

  // Headings set in ordinary case ("Charlas") have only their size, their weight, their place and
  // the gap above to go by: those of the known headings, within a hair, in the same column. That
  // tells them from the text only when the headings are visibly larger or the text is not mostly
  // bold. An entry's title is nearly as large and often as bold, so it is also left out when it
  // is followed by its dates, and when the gap above it is smaller than the headings' own.
  const bodySize = median(sizes)
  const knownBold = known.filter((line) => line.bold).length * 2 >= known.length
  const boldShare = lines.filter((line) => line.bold).length / lines.length
  const distinct = knownSize >= bodySize * HEADING_OVER_TEXT || (knownBold && boldShare < MOSTLY_BOLD)
  const gapAbove = (index: number) => {
    const previous = lines[index - 1]
    return !previous ? 0 : previous.page === lines[index]!.page ? previous.y - lines[index]!.y : Infinity
  }
  const knownGap = median(hits.map((hit) => gapAbove(hit.index)).filter((gap) => gap > 0 && Number.isFinite(gap)))
  if (known.length && !knownUpper && distinct) {
    lines.forEach((line, index) => {
      if (index === skipIndex || hits.some((hit) => hit.index === index) || unknown.some((hit) => hit.index === index)) return
      const text = line.text.trim()
      if (!text || isUpper(text) || text.split(/\s+/).length > 3 || /[\d.,:;!?@/]/.test(text)) return
      const gap = gapAbove(index)
      const sameSize = Math.abs(line.fontSize - knownSize) <= knownSize * TITLE_CASE_SIZE_MATCH
      const sameWeight = line.bold === knownBold
      const sameColumn = known.some((heading) => Math.abs(heading.x - line.x) <= HEADING_COLUMN)
      const setApart = gap > usualGap * SPACED_GAP && gap >= knownGap * HEADING_GAP_SHARE
      const nextLine = lines[index + 1]
      const hasDates = !!nextLine && DATE_RANGE_RE.test(nextLine.text)
      if (sameSize && sameWeight && sameColumn && setApart && !hasDates) unknown.push({ index, kind: null, text })
    })
  }

  return [...hits, ...unknown].sort((a, b) => a.index - b.index)
}

/** An unknown heading is set within this share of the type size of the known ones. */
const HEADING_SIZE_MATCH = 0.06

/** ...and, when it is not in capitals, within this much (an entry's title is about 3 % smaller). */
const TITLE_CASE_SIZE_MATCH = 0.02

/** ...or the text is bold for less than this share of its lines, and the headings are. */
const MOSTLY_BOLD = 0.4

/** The gap above a heading is at least this share of the usual gap above the known ones. */
const HEADING_GAP_SHARE = 0.9

/** Headings must be this much larger than the text for size alone to tell them from it. */
const HEADING_OVER_TEXT = 1.02

/** A heading is in the same column as another when they start this close (PDF units). */
const HEADING_COLUMN = 8

function median(values: number[]): number {
  const sorted = values.filter(Boolean).sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

/** A gap above a line this many times the usual spacing sets it apart, as a heading is (spec 040). */
const SPACED_GAP = 1.35

/**
 * The spacing of lines within a paragraph or list: the lower quartile of the positive distances
 * between consecutive lines of a page. The median would be the spacing between entries, as often as
 * not, and then no heading is "set apart" from them.
 */
function lineSpacing(lines: ExtractedLine[]): number {
  const gaps: number[] = []
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i - 1]!.y - lines[i]!.y
    if (lines[i - 1]!.page === lines[i]!.page && gap > 0) gaps.push(gap)
  }
  if (!gaps.length) return Infinity
  gaps.sort((a, b) => a - b)
  return gaps[Math.floor(gaps.length / 4)]!
}

function sliceSections(lines: ExtractedLine[], headings: HeadingHit[]): DetectedSection[] {
  const sections: DetectedSection[] = []
  headings.forEach((heading, i) => {
    if (!heading.kind) return
    const end = headings[i + 1]?.index ?? lines.length
    const body = lines.slice(heading.index + 1, end)
    if (body.length) sections.push({ kind: heading.kind, heading: heading.text, lines: body })
  })
  return sections
}

/** The lines within a few of the e-mail or phone line: a contact block lists the place beside them. */
function nearContact(lines: ExtractedLine[], email: string, phone: string): ExtractedLine[] {
  const at = lines.flatMap((line, index) => ((email && line.text.includes(email)) || (phone && line.text.includes(phone)) ? [index] : []))
  return lines.filter((_, index) => at.some((contact) => Math.abs(contact - index) <= CONTACT_REACH))
}

const CONTACT_REACH = 3

/* ---- direct fields ----------------------------------------------------- */

function findFirst(lines: ExtractedLine[], pattern: RegExp): DetectedField<string> {
  for (const line of lines) {
    const match = line.text.match(pattern)
    if (match) return { value: match[0].trim(), confidence: 'high' }
  }
  return { value: '', confidence: 'low' }
}

function findPhone(lines: ExtractedLine[]): DetectedField<string> {
  for (const line of lines) {
    // Skip lines that are really a date range — they match the phone shape too.
    if (DATE_RANGE_RE.test(line.text)) continue
    const match = line.text.match(PHONE_RE)
    if (!match) continue
    const digits = match[0].replace(/\D/g, '')
    if (digits.length < 8 || digits.length > 15) continue
    return { value: match[0].trim(), confidence: match[0].includes('+') ? 'high' : 'medium' }
  }
  return { value: '', confidence: 'low' }
}

function findLinks(lines: ExtractedLine[]): Array<{ label: string; url: string }> {
  const seen = new Set<string>()
  const links: Array<{ label: string; url: string }> = []

  for (const line of lines) {
    for (const match of line.text.matchAll(URL_RE)) {
      const url = match[0].replace(/[.,;)]$/, '')
      if (EMAIL_RE.test(url) || !url.includes('.')) continue
      const key = url.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const profile = PROFILE_HOSTS.find((p) => p.host.test(url))
      links.push({ label: profile?.label ?? 'Web', url })
    }
  }
  return links.slice(0, 6)
}

/** Candidate name lines: page 1, two to five words, no contact details. */
function nameCandidates(lines: ExtractedLine[]): number[] {
  return lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.page === 1)
    .filter(({ line }) => !EMAIL_RE.test(line.text) && !new RegExp(URL_RE.source, 'i').test(line.text))
    .filter(({ line }) => {
      const words = line.text.trim().split(/\s+/)
      return words.length >= 2 && words.length <= 5 && line.text.length <= 60
    })
    .map(({ index }) => index)
}

/** The second line of a name is at most this many type sizes below the first, baseline to baseline. */
const NAME_LINE_STEP = 1.6

/**
 * A name set large enough to wrap reaches the extraction as two lines ("Łucja Øster-" over "Ñúñez",
 * spec 081). The largest type on page 1 on two lines in a row, the second right under the first and
 * aligned with it, short enough for a name, is one name: joined here, before it is looked for. A line
 * that ends in a hyphen joins the next without a space.
 */
function joinNameLines(lines: ExtractedLine[]): ExtractedLine[] {
  const firstPage = lines.filter((line) => line.page === 1)
  if (!firstPage.length) return lines
  const largest = Math.max(...firstPage.map((line) => line.fontSize))
  const index = lines.findIndex((line) => line.page === 1 && line.fontSize === largest)
  const top = lines[index]
  const next = lines[index + 1]
  if (!top || !next || next.page !== 1 || Math.abs(next.fontSize - largest) > 0.5) return lines
  const step = top.y - next.y
  if (step <= 0 || step > NAME_LINE_STEP * largest) return lines
  const centre = (line: ExtractedLine) => (line.x + line.end) / 2
  if (Math.abs(next.x - top.x) > 2 && Math.abs(centre(next) - centre(top)) > 2) return lines
  const text = top.text.endsWith('-') ? `${top.text}${next.text}` : `${top.text} ${next.text}`
  if (text.split(/\s+/).length > 5 || text.length > 60 || EMAIL_RE.test(text)) return lines
  const joined = { ...top, text, x: Math.min(top.x, next.x), end: Math.max(top.end, next.end) }
  return [...lines.slice(0, index), joined, ...lines.slice(index + 2)]
}

/** The name is usually the largest text on page 1 (spec §7.2). */
function findNameIndex(lines: ExtractedLine[]): number {
  const candidates = nameCandidates(lines)
  if (!candidates.length) return -1
  return candidates.reduce((best, index) =>
    lines[index].fontSize > lines[best].fontSize ? index : best,
  )
}

/**
 * The name as the PDF's title spells it, when the title is the same letters: "Łucja Øster-Ñúñez – CV".
 * A name set with letter-spacing reaches the extraction as "Ł UCJA Ø STER", with no telling where a
 * word ends; the title keeps its spaces and case (spec 040).
 */
function nameFromTitle(title: string | undefined, detected: string): string | null {
  if (!title) return null
  const clean = title.replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/g, ' ').trim()
  const letters = (value: string) => value.normalize('NFC').toLocaleUpperCase().replace(/[^\p{L}]/gu, '')
  // The whole title, or one of the parts a dash or bar sets apart ("CV – Ada Lovelace – 2024").
  const parts = [clean, ...clean.split(/\s+[–—|·-]\s+/)]
  const part = parts.find((candidate) => candidate && letters(candidate) === letters(detected))
  if (part) return part
  const stripped = clean.replace(/\s*[–—|·-]\s*(?:cv|curriculum(?: vitae)?|resume|résumé|currículum)\s*$/iu, '').trim()
  return stripped && letters(stripped) === letters(detected) ? stripped : null
}

function describeName(
  lines: ExtractedLine[],
  index: number,
  headerLines: ExtractedLine[],
  title?: string,
): DetectedField<string> {
  if (index < 0) return { value: '', confidence: 'low' }
  const chosen = lines[index]
  const spelled = nameFromTitle(title, chosen.text)
  if (spelled) return { value: spelled, confidence: 'high' }
  const others = nameCandidates(lines).filter((i) => i !== index)
  const runnerUp = others.length ? Math.max(...others.map((i) => lines[i].fontSize)) : 0

  // A name set clearly larger than everything else is a confident match; a tie
  // means the layout gives us nothing to go on.
  const clear = chosen.fontSize > runnerUp * 1.15
  const early = index === 0 || headerLines.includes(chosen)
  return {
    value: titleCaseIfShouting(chosen.text.trim()),
    confidence: clear && early ? 'high' : clear || early ? 'medium' : 'low',
  }
}

/** The line under the name, in its own column: contact details beside it (above it, in reading order) are skipped. */
const HEADLINE_ALIGN = 14

function findHeadline(headerLines: ExtractedLine[], nameLine: ExtractedLine | undefined): DetectedField<string> {
  const index = nameLine ? headerLines.indexOf(nameLine) : -1
  const centre = (line: ExtractedLine) => (line.x + line.end) / 2
  const below = nameLine
    ? headerLines
        .filter((line) => line !== nameLine && line.page === nameLine.page && line.y < nameLine.y)
        .filter((line) => Math.abs(line.x - nameLine.x) <= HEADLINE_ALIGN || Math.abs(centre(line) - centre(nameLine)) <= HEADLINE_ALIGN)
        .sort((a, b) => b.y - a.y)[0]
    : undefined
  const next = below ?? headerLines[index + 1]
  if (!next || index < 0) return { value: '', confidence: 'low' }
  const text = withWrappedLine(next, headerLines)
  if (!text || EMAIL_RE.test(text) || PHONE_RE.test(text) || text.length > 80) {
    return { value: '', confidence: 'low' }
  }
  return { value: text, confidence: 'medium' }
}

/**
 * A headline that wraps in a narrow side column (spec 083) goes on in the line right under it, in its
 * type and where it starts; a line with contact details, a place or a heading is not that.
 */
function withWrappedLine(line: ExtractedLine, headerLines: ExtractedLine[]): string {
  const text = line.text.trim()
  const after = headerLines
    .filter((other) => other.page === line.page && other.y < line.y)
    .sort((a, b) => b.y - a.y)[0]
  if (!after || line.y - after.y > NAME_LINE_STEP * line.fontSize) return text
  if (Math.abs(after.fontSize - line.fontSize) > 0.5 || Math.abs(after.x - line.x) > 2) return text
  const rest = after.text.trim()
  if (EMAIL_RE.test(rest) || PHONE_RE.test(rest) || new RegExp(URL_RE.source, 'i').test(rest) || LOCATION_RE.test(rest) || isSectionHeading(rest)) return text
  return `${text} ${rest}`
}

const LOCATION_RE = /^[\p{L}\s.'-]+(?:,\s*[\p{L}\s.'-]+)+$/u

function findLocation(headerLines: ExtractedLine[], email: string, phone: string): DetectedField<string> {
  for (const line of headerLines) {
    const text = line.text.trim()
    if (!text || text === email || text === phone) continue
    if (text.length > 48 || text.split(/\s+/).length > 6) continue
    if (LOCATION_RE.test(text)) return { value: text, confidence: 'medium' }
  }
  return { value: '', confidence: 'low' }
}

/* ---- unclassified ------------------------------------------------------ */

function buildUnclassified(
  lines: ExtractedLine[],
  headings: HeadingHit[],
  headerLines: ExtractedLine[],
  used: {
    email: string
    phone: string
    name: string
    headline: string
    location: string
    links: Array<{ url: string }>
  },
): TextBlock[] {
  const blocks: TextBlock[] = []

  // Header lines that did not become a recognized field.
  const leftovers = headerLines
    .map((l) => l.text.trim())
    .filter((text) => {
      if (!text) return false
      if ([used.email, used.phone, used.headline, used.location].includes(text)) return false
      if (titleCaseIfShouting(text) === used.name) return false
      if (used.links.some((link) => text.includes(link.url))) return false
      return !EMAIL_RE.test(text) && !PHONE_RE.test(text)
    })
  if (leftovers.length) blocks.push({ id: 'block_header', lines: leftovers })

  // Content under headings we could not map to a known section.
  headings.forEach((heading, i) => {
    if (heading.kind) return
    const end = headings[i + 1]?.index ?? lines.length
    const body = lines.slice(heading.index + 1, end).map((l) => l.text.trim()).filter(Boolean)
    if (body.length) blocks.push({ id: `block_${heading.index}`, lines: body, heading: heading.text })
  })

  return blocks
}

/* ---- parsing helpers used by the draft -> CVData step ------------------ */

export interface ParsedRange {
  start: string
  end: string | null
}

/** Turns "Mar 2021 – actualidad" into partial ISO dates the model stores. */
export function parseDateRange(text: string): ParsedRange | null {
  const match = text.match(DATE_RANGE_RE)
  if (!match) return null
  const start = toPartialIso(match[1])
  if (!start) return null
  const endRaw = match[2]
  const end = PRESENT_WORDS.test(endRaw) ? null : toPartialIso(endRaw)
  return { start, end: end ?? null }
}

export function toPartialIso(token: string): string {
  const year = token.match(/\d{4}/)?.[0]
  if (!year) return ''
  // Accents off: "févr." → "fevr", "März" → "marz", "août" → "aout". The Basque year's "-ko"/"-eko"
  // is not the month: "2019ko urt." → "urt" (spec 070); two letters are enough for the Catalan "ag.".
  const monthWord = token
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/(\d{4})(?:\(e\))?e?ko(?!\p{L})/u, '$1')
    .match(/\p{L}{2,}/u)?.[0]
    ?.slice(0, 4)
  const numericMonth = token.match(/\b(\d{1,2})[/.-]\d{4}/)?.[1]

  const month =
    numericMonth ??
    (monthWord
      ? String(MONTH_INDEX[monthWord] ?? MONTH_INDEX[monthWord.slice(0, 3)] ?? '')
      : '')

  return month ? `${year}-${String(month).padStart(2, '0')}` : year
}

export function isBullet(text: string): boolean {
  return BULLET_RE.test(text)
}

export function stripBullet(text: string): string {
  return text.replace(BULLET_RE, '').trim()
}

/** "NADIA MARTÍN" reads badly in a CV header; "Nadia Martín" does. */
export function titleCaseIfShouting(value: string): string {
  if (value !== value.toUpperCase()) return value
  return value
    .toLowerCase()
    .split(/(\s+)/)
    .map((part) => (part.trim() ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join('')
}
