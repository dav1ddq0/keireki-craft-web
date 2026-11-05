import type { CVData } from '@/types/cv'
import {
  createCustomSection,
  createEducation,
  createEmptyCV,
  createExperience,
  createLanguage,
  createLink,
  createSkillGroup,
} from '@/core/factory'
import { reconcileOrder } from '@/core/migrations'
import type { ExtractedLine } from './extract'
import type { DetectedSection, ImportDraft } from './heuristics'
import { isBullet, parseDateRange, stripBullet } from './heuristics'
import { DATE_RANGE_RE, type SectionKind } from './patterns'

/** Where the user sent each unclassified block on the review screen. */
export type BlockTarget = SectionKind | 'summary' | 'discard' | 'custom'

export interface ReviewDecisions {
  /** Field overrides typed by the user, applied on top of the detected values. */
  personal?: Partial<CVData['personal']>
  headline?: string
  /** blockId -> target section. Anything absent defaults to `discard`. */
  blocks?: Record<string, BlockTarget>
  language?: string
}

/**
 * Stage 3's output: the reviewed draft becomes a real `CVData`.
 *
 * Kept separate from `analyze` so the review screen can re-run it on every
 * change without re-parsing the PDF, and so it is trivially unit-testable.
 */
export function assembleCV(draft: ImportDraft, decisions: ReviewDecisions = {}): CVData {
  const cv = createEmptyCV()
  // The language of the PDF's headings, so the sections keep titles in it (spec 061).
  cv.meta.language = decisions.language ?? draft.language ?? 'es'
  cv.meta.title = draft.fullName.value || cv.meta.title

  cv.personal = {
    ...cv.personal,
    fullName: draft.fullName.value,
    headline: decisions.headline ?? draft.headline.value,
    email: draft.email.value,
    phone: draft.phone.value,
    location: draft.location.value,
    links: draft.links.map((link) => ({ ...createLink(), ...link })),
    ...decisions.personal,
  }

  for (const section of draft.sections) {
    switch (section.kind) {
      case 'summary':
        cv.summary = joinLines(section).trim()
        break
      case 'experience':
        cv.experience.push(...parseExperience(section))
        break
      case 'education':
        cv.education.push(...parseEducation(section))
        break
      case 'skills':
        cv.skills.push(...parseSkills(section))
        break
      case 'languages':
        cv.languages.push(...parseLanguages(section))
        break
    }
  }

  applyBlocks(cv, draft, decisions.blocks ?? {})
  cv.sectionOrder = reconcileOrder(cv.sectionOrder, cv)
  return cv
}

/* ---- section parsers --------------------------------------------------- */

/**
 * An entry starts wherever a date range appears: in practice that is the single
 * most reliable boundary marker across CV layouts. Lines before the first date
 * are treated as the first entry's title.
 */
function parseExperience(section: DetectedSection) {
  return splitByDate(section.lines).map((chunk) => {
    const entry = createExperience()
    applyRange(entry, chunk)

    if (chunk.subtitle) {
      // "Position" over "Company · dates · Place", or over a smaller line (spec 040).
      const [position, company] = splitTitleLine(chunk.title, false)
      const [who, ...place] = splitMeta(chunk.subtitle)
      entry.position = position
      entry.company = company || who || ''
      const where = company ? [who, ...place] : place
      if (where.length) entry.location = where.join(', ')
    } else {
      const [position, company] = splitTitleLine(chunk.title)
      entry.position = position
      entry.company = company
    }

    const { description, highlights } = splitBody(chunk)
    entry.description = description
    entry.highlights = highlights
    return entry
  })
}

function parseEducation(section: DetectedSection) {
  return splitByDate(section.lines).map((chunk) => {
    const entry = createEducation()
    applyRange(entry, chunk)
    if (chunk.subtitle) {
      const [degree, institution] = splitTitleLine(chunk.title, false)
      const [who, ...place] = splitMeta(chunk.subtitle)
      entry.degree = degree
      entry.institution = institution || who || ''
      const where = institution ? [who, ...place] : place
      if (where.length) entry.location = where.join(', ')
    } else {
      // "Grado en Informática" is one degree: only a symbol or a comma separates the institution.
      const [degree, institution] = splitTitleLine(chunk.title, false)
      entry.degree = degree
      entry.institution = institution
    }
    const { description, highlights } = splitBody(chunk)
    entry.description = [description, ...highlights].filter(Boolean).join(' ').trim() || undefined
    return entry
  })
}

function applyRange(entry: { startDate: string; endDate: string | null }, chunk: Chunk) {
  const range = chunk.dateText ? parseDateRange(chunk.dateText) : null
  if (range) {
    entry.startDate = range.start
    entry.endDate = range.end
  }
}

/**
 * The lines under an entry's title: plain ones are its description, and the ones set in from the
 * title are its highlights (spec 040). A bullet drawn as a shape leaves no character to recognise,
 * so the indent is the signal; a line that wraps (it starts in lower case, or follows a full line
 * with no full stop) continues the highlight above instead of starting a new one.
 */
function splitBody(chunk: Chunk): { description: string; highlights: string[] } {
  const description: string[] = []
  const highlights: string[] = []
  const indented = chunk.body.filter((line) => line.x >= chunk.titleX + INDENT)
  const widest = Math.max(0, ...indented.map((line) => line.end - line.x))
  let previous: ExtractedLine | null = null

  for (const line of chunk.body) {
    const text = line.text.trim()
    if (isBullet(text)) {
      highlights.push(stripBullet(text))
      previous = null
    } else if (line.x >= chunk.titleX + INDENT) {
      const full = !!previous && previous.end - previous.x >= widest * 0.85
      const continues = !!previous && (/^\p{Ll}/u.test(text) || (full && !/[.!?]$/.test(previous.text.trim())))
      if (continues) highlights[highlights.length - 1] += ` ${text}`
      else highlights.push(text)
      previous = line
    } else {
      description.push(text)
      previous = null
    }
  }
  return { description: description.join(' '), highlights }
}

/** "Cartograf · Remoto": the first part is who, the rest is where. */
function splitMeta(text: string): string[] {
  return text.split(/\s[·•|]\s|\s[–—]\s/).map((part) => part.trim()).filter(Boolean)
}

/** "Lenguajes: TypeScript, Go" becomes a group; a category line over its items too (spec 040). */
function parseSkills(section: DetectedSection) {
  const labelled = pairLabelColumn(section.lines)
  if (labelled) return labelled

  const groups = []
  const loose: string[] = []
  let current: ReturnType<typeof createSkillGroup> | null = null
  const lines = mergeWrapped(section.lines)

  lines.forEach((line, index) => {
    const text = stripBullet(line.text)
    const match = text.match(/^([^:]{2,40}):\s*(.+)$/)
    if (match) {
      const group = createSkillGroup()
      group.category = match[1].trim()
      group.items = splitItems(match[2]).map((name) => ({ name }))
      groups.push(group)
      current = null
      return
    }
    if (!text) return

    // A category is set a little smaller than the items under it, and has no list of its own.
    const next = lines[index + 1]
    if (next && next.fontSize > line.fontSize * CATEGORY_SIZE && !/[,;·•|]/.test(text) && text.split(/\s+/).length <= 4) {
      current = createSkillGroup()
      current.category = text
      groups.push(current)
      return
    }
    const names = splitItems(text).map((name) => ({ name }))
    if (current) current.items.push(...names)
    else loose.push(...names.map((item) => item.name))
  })

  if (loose.length) {
    const group = createSkillGroup()
    group.items = loose.map((name) => ({ name }))
    groups.unshift(group)
  }
  return groups.filter((group) => group.items.length || group.category)
}

/**
 * A list that wraps continues on a line that starts in lower case after one that does not end in a
 * separator ("CSS" over "moderno"): it is the same item.
 */
function mergeWrapped(lines: ExtractedLine[]): ExtractedLine[] {
  const merged: ExtractedLine[] = []
  for (const line of lines) {
    const previous = merged.at(-1)
    if (previous && /^\p{Ll}/u.test(line.text.trim()) && !/[,;·•|:]$/.test(previous.text.trim())) {
      merged[merged.length - 1] = { ...previous, text: `${previous.text.trim()} ${line.text.trim()}` }
    } else merged.push(line)
  }
  return merged
}

/**
 * Labels in a column of their own and their items in another, row by row ("Lenguajes" beside
 * "TypeScript · Go"): the two columns are the same length, and the n-th label goes with the n-th
 * row of items, whichever of the two sits a line higher (spec 040).
 */
function pairLabelColumn(lines: ExtractedLine[]) {
  const left = Math.min(...lines.map((line) => line.x))
  const labels = lines.filter((line) => line.x < left + LABEL_COLUMN)
  const values = lines.filter((line) => line.x >= left + LABEL_COLUMN)
  if (values.length < 2 || labels.length !== values.length) return null
  if (Math.max(...values.map((v) => v.x)) - Math.min(...values.map((v) => v.x)) > LABEL_COLUMN) return null
  if (labels.some((label) => /[,;·•|:]/.test(label.text) || label.text.trim().split(/\s+/).length > 3)) return null

  const byHeight = (a: ExtractedLine, b: ExtractedLine) => b.y - a.y
  const rows = [...labels].sort(byHeight).map((label, i) => [label, [...values].sort(byHeight)[i]!] as const)
  return rows.map(([label, value]) => {
    const group = createSkillGroup()
    group.category = label.text.trim()
    group.items = splitItems(stripBullet(value.text)).map((name) => ({ name }))
    return group
  })
}

/** Text this far (PDF units) right of the leftmost line is in a column of its own, not set in. */
const LABEL_COLUMN = 40

/**
 * "Inglés — C1", "Español (nativo)", "French: B2", "Español · Nativo", a level on its own line
 * after or before its language, and a whole row ("Español (Nativo) · Inglés (C1)").
 */
function parseLanguages(section: DetectedSection) {
  const entries: ReturnType<typeof createLanguage>[] = []
  let pendingLevel = ''

  for (const line of section.lines) {
    const text = stripBullet(line.text)
    if (!text) continue
    const parts = text.split(/\s[·•|]\s/).map((part) => part.trim()).filter(Boolean)
    const named = parts.length === 2 && LANGUAGE_LEVEL_RE.test(parts[1]!) ? [text] : parts

    for (const part of named) {
      if (LANGUAGE_LEVEL_RE.test(part)) {
        const last = entries.at(-1)
        if (last && !last.level) last.level = part
        else pendingLevel = part
        continue
      }
      const entry = createLanguage()
      const match = part.match(/^(.+?)\s*(?:[:–—·-]|\()\s*([^)]+)\)?$/)
      if (match) {
        entry.name = match[1]!.trim()
        entry.level = match[2]!.trim()
      } else {
        entry.name = part
        entry.level = pendingLevel
        pendingLevel = ''
      }
      entries.push(entry)
    }
  }
  return entries
}

/* ---- reviewed blocks --------------------------------------------------- */

function applyBlocks(cv: CVData, draft: ImportDraft, targets: Record<string, BlockTarget>) {
  for (const block of draft.unclassified) {
    const target = targets[block.id] ?? 'discard'
    if (target === 'discard') continue

    const asSection: DetectedSection = {
      kind: target === 'custom' ? 'summary' : target,
      heading: block.heading ?? '',
      lines: block.lines.map(toLine),
    }

    switch (target) {
      case 'summary':
        cv.summary = [cv.summary, block.lines.join(' ')].filter(Boolean).join(' ').trim()
        break
      case 'experience':
        cv.experience.push(...parseExperience(asSection))
        break
      case 'education':
        cv.education.push(...parseEducation(asSection))
        break
      case 'skills':
        cv.skills.push(...parseSkills(asSection))
        break
      case 'languages':
        cv.languages.push(...parseLanguages(asSection))
        break
      case 'custom': {
        const section = createCustomSection(block.heading || 'Otros')
        section.entries = block.lines.map((text) => ({
          id: `${block.id}_${section.entries.length}_${text.length}`,
          title: stripBullet(text),
        }))
        cv.customSections.push(section)
        break
      }
    }
  }
}

/* ---- shared helpers ---------------------------------------------------- */

interface Chunk {
  title: string
  /** Where the title starts across the page: what sets its highlights in. */
  titleX: number
  titleSize: number
  /** The line under a title that carries the dates: "Company · dates · Place". */
  subtitle?: string
  dateText: string
  body: ExtractedLine[]
}

/** A line set in this far (PDF units) from its entry's title is one of its highlights. */
const INDENT = 6

/** A category line is smaller than the next line by this factor at least. */
const CATEGORY_SIZE = 1.015

/**
 * A level of language, on its own: "Nativo", "C1", "Intermediate", "B2 – C1", "Muttersprache" (spec 060),
 * "Llengua materna", "Ama hizkuntza" (spec 070).
 */
const LANGUAGE_LEVEL_RE =
  /^(?:nativ[oa]|native|bilingüe|bilingual|fluid[oa]|fluent|avanzad[oa]|advanced|intermedi[oa]|intermediate|básic[oa]|basic|elementary|proficient|lengua materna|mother tongue|langue maternelle|natif|bilingue|courant|avancé|intermédiaire|débutant|notions|madrelingua|fluente|avanzato|elementare|língua materna|avançado|intermédio|muttersprache|muttersprachlich|zweisprachig|fließend|verhandlungssicher|gute kenntnisse|grundkenntnisse|llengua materna|nadiu|natiu|avançat|intermedi|bàsic|fluid|ama[ -]hizkuntza|natiboa|elebiduna|aurreratua|ertaina|oinarrizkoa|[abc][12](?:\s*[-–]\s*[abc][12])?)$/iu

/**
 * Splits a section into entries at each line carrying a date range: in practice
 * that is the most reliable boundary marker across CV layouts. Text left on the
 * date line becomes the entry title; a date on its own line attaches to the
 * entry above it; a title on its own line right above a date line that still
 * carries text ("Company · dates · Place") is that entry's title (spec 040).
 */
function splitByDate(allLines: ExtractedLine[]): Chunk[] {
  const chunks: Chunk[] = []
  let current: Chunk | null = null

  for (const line of onePerRow(allLines)) {
    const text = line.text.trim()
    if (!text) continue

    if (!hasDateRange(text)) {
      if (!current) {
        current = { title: text, titleX: line.x, titleSize: line.fontSize, dateText: '', body: [] }
        chunks.push(current)
      } else if (!current.title) {
        current.title = text
        current.titleX = line.x
        current.titleSize = line.fontSize
      } else {
        current.body.push(line)
      }
      continue
    }

    const remainder = stripDatePortion(text)
    // A bare date right under a title belongs to that entry, not a new one.
    if (current && !current.dateText && !remainder) {
      current.dateText = text
      continue
    }
    if (current && !current.dateText && current.title && !current.body.length && remainder && Math.abs(line.x - current.titleX) < INDENT) {
      current.dateText = text
      current.subtitle = remainder
      continue
    }
    current = { title: remainder, titleX: line.x, titleSize: line.fontSize, dateText: text, body: [] }
    chunks.push(current)
  }

  for (const chunk of chunks) takeSubtitle(chunk)
  return chunks.filter((chunk) => chunk.title || chunk.body.length)
}

/**
 * A date set in its own cell on the title's row (right-aligned) belongs to that title: they are
 * read as the one line the other layouts have.
 */
function onePerRow(lines: ExtractedLine[]): ExtractedLine[] {
  const rows: ExtractedLine[] = []
  for (const line of lines) {
    const previous = rows.at(-1)
    const text = line.text.trim()
    const bareDate = hasDateRange(text) && !stripDatePortion(text)
    if (previous && bareDate && previous.page === line.page && Math.abs(previous.y - line.y) <= ROW_TOLERANCE && !hasDateRange(previous.text)) {
      rows[rows.length - 1] = { ...previous, text: `${previous.text.trim()} ${text}`, end: line.end }
    } else rows.push(line)
  }
  return rows
}

/** The same rows as `pdf.js` grouping: baselines this close are one line. */
const ROW_TOLERANCE = 2.5

/**
 * The first line under a title, when it is set smaller than the title and the text after it and
 * is not a sentence, is the entry's subtitle: "Company · Place", or the institution of a degree.
 */
function takeSubtitle(chunk: Chunk) {
  const [first, second] = chunk.body
  if (chunk.subtitle || !first || !chunk.titleSize) return
  const text = first.text.trim()
  const smaller = first.fontSize < chunk.titleSize * 0.95 && (!second || first.fontSize < second.fontSize * 0.97)
  if (smaller && first.x < chunk.titleX + INDENT && text.length <= 80 && !/[.!?:]$/.test(text) && !isBullet(text)) {
    chunk.subtitle = text
    chunk.body.shift()
  }
}

function hasDateRange(text: string): boolean {
  return parseDateRange(text) !== null
}

/** The line with its date range removed — usually the position or degree. */
function stripDatePortion(text: string): string {
  const match = text.match(DATE_RANGE_RE)
  if (!match) return text.trim()
  return text
    .replace(match[0], ' ')
    .replace(/\s+/g, ' ')
    .replace(/(\s[|·–—-])+(?=\s)/g, (run) => run.slice(0, 2))
    .replace(/^[\s|·–—-]+|[\s|·–—(-]+$/g, '')
    .trim()
}

/** "Backend Engineer — Acme" / "Backend Engineer at Acme" / "Backend Engineer, Acme". */
function splitTitleLine(text: string, withWords = true): [string, string] {
  const separators = withWords ? /\s(?:[–—|·]|-{1,2}|en|at)\s/i : /\s(?:[–—|·]|-{1,2})\s/
  const parts = text.split(separators)
  if (parts.length >= 2) return [parts[0].trim(), parts.slice(1).join(' ').trim()]
  const comma = text.split(/,\s*/)
  if (comma.length === 2) return [comma[0].trim(), comma[1].trim()]
  return [text.trim(), '']
}

function splitItems(text: string): string[] {
  return text
    .split(/[,;·•|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinLines(section: DetectedSection): string {
  return section.lines.map((l) => l.text.trim()).filter(Boolean).join(' ')
}

/** Blocks carry plain strings; the parsers want `ExtractedLine`s. */
function toLine(text: string): ExtractedLine {
  return { page: 1, y: 0, x: 0, end: 0, text, fontSize: 0, fontName: '', bold: false }
}
