import type { CVData, LanguageEntry, MaritalStatus, PersonalDetails, SkillGroup, StyleTokens } from '@/types/cv'
import { fontStackWithStandIns } from '@/core/fontStandIns'

/**
 * Helpers shared by every template. They are *pure functions* on purpose:
 * templates may import from here, but must never reach into a Pinia store
 * (spec §4 — a template takes exactly one prop and holds no state).
 */

// Every table below has one entry per CV language (`CV_LANGUAGES`); a test keeps them complete.

const MONTHS: Record<string, string[]> = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  it: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  de: ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'],
}

const PRESENT: Record<string, string> = { es: 'Actualidad', en: 'Present', fr: 'Aujourd’hui', it: 'Oggi', pt: 'Presente', de: 'heute' }

/** German writes the day of a date as an ordinal: "12. März 1992". */
const DAY_SUFFIX: Record<string, string> = { de: '.' }

/** Renders a partial ISO date ("2023-04" / "2023") in the CV's content language. */
export function formatPartialDate(value: string, language = 'es'): string {
  if (!value) return ''
  const [year, month] = value.split('-')
  if (!month) return year ?? value
  const months = MONTHS[language] ?? MONTHS.es
  const index = Number(month) - 1
  const name = months[index]
  return name ? `${name} ${year}` : value
}

/** "1992-03-12" → "12 mar 1992". Anything else (partial, typed by hand) is shown as written. */
export function formatBirthDate(value: string, language = 'es'): string {
  const text = value.trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) return text
  const [, year, month, day] = match
  const name = (MONTHS[language] ?? MONTHS.es)![Number(month) - 1]
  if (!name || Number(day) < 1 || Number(day) > 31) return text
  return `${Number(day)}${DAY_SUFFIX[language] ?? ''} ${name} ${year}`
}

const EXTRA_LABELS: Record<string, { birth: string; nationality: string; licence: string; status: string }> = {
  es: { birth: 'Nacimiento', nationality: 'Nacionalidad', licence: 'Carné de conducir', status: 'Estado civil' },
  en: { birth: 'Born', nationality: 'Nationality', licence: 'Driving licence', status: 'Marital status' },
  fr: { birth: 'Naissance', nationality: 'Nationalité', licence: 'Permis de conduire', status: 'Situation familiale' },
  it: { birth: 'Nascita', nationality: 'Nazionalità', licence: 'Patente di guida', status: 'Stato civile' },
  pt: { birth: 'Nascimento', nationality: 'Nacionalidade', licence: 'Carta de condução', status: 'Estado civil' },
  de: { birth: 'Geboren', nationality: 'Staatsangehörigkeit', licence: 'Führerschein', status: 'Familienstand' },
}

const MARITAL_LABELS: Record<string, Record<MaritalStatus, string>> = {
  es: { single: 'Soltero/a', married: 'Casado/a', partner: 'Pareja de hecho', divorced: 'Divorciado/a', widowed: 'Viudo/a' },
  en: { single: 'Single', married: 'Married', partner: 'Domestic partnership', divorced: 'Divorced', widowed: 'Widowed' },
  fr: { single: 'Célibataire', married: 'Marié(e)', partner: 'Pacsé(e)', divorced: 'Divorcé(e)', widowed: 'Veuf/Veuve' },
  it: { single: 'Celibe/Nubile', married: 'Coniugato/a', partner: 'Unione civile', divorced: 'Divorziato/a', widowed: 'Vedovo/a' },
  pt: { single: 'Solteiro/a', married: 'Casado/a', partner: 'União de facto', divorced: 'Divorciado/a', widowed: 'Viúvo/a' },
  de: { single: 'Ledig', married: 'Verheiratet', partner: 'Lebenspartnerschaft', divorced: 'Geschieden', widowed: 'Verwitwet' },
}

/** Label of a marital-status code in the CV's content language. */
export function maritalLabel(status: MaritalStatus, language = 'es'): string {
  return (MARITAL_LABELS[language] ?? MARITAL_LABELS.es)![status]
}

/**
 * The lines of a CV's contact block, in order: email, phone, location, then whichever optional
 * extras were filled, each labelled in the content language. Empty fields contribute nothing.
 * Every template calls this instead of listing the fields itself, so a new field shows up in all.
 */
export function contactLines(data: CVData): string[] {
  const language = data.meta.language || 'es'
  const personal: PersonalDetails = data.personal
  const labels = EXTRA_LABELS[language] ?? EXTRA_LABELS.es!
  const born = [formatBirthDate(personal.birthDate, language), personal.birthPlace.trim()].filter(Boolean).join(', ')
  return [
    personal.email,
    personal.phone,
    personal.location,
    born && `${labels.birth}: ${born}`,
    personal.nationality.trim() && `${labels.nationality}: ${personal.nationality.trim()}`,
    personal.drivingLicense.trim() && `${labels.licence}: ${personal.drivingLicense.trim()}`,
    personal.maritalStatus && `${labels.status}: ${maritalLabel(personal.maritalStatus, language)}`,
  ].filter((line): line is string => Boolean(line))
}

export function formatDateRange(start: string, end: string | null, language = 'es'): string {
  const from = formatPartialDate(start, language)
  const to = end === null ? (PRESENT[language] ?? PRESENT.es) : formatPartialDate(end, language)
  if (!from && !to) return ''
  if (!from) return to
  if (!to) return from
  return `${from} – ${to}`
}

/**
 * `StyleTokens` reach templates only as CSS custom properties, so a template can
 * never hardcode a color or a font and still look right (spec §4).
 */
const WHITE = '#ffffff'
const INK = '#1a1a1a'

function luminance(hex: string): number | null {
  const match = hex.trim().match(/^#([0-9a-f]{6})$/i)
  if (!match) return null
  const value = parseInt(match[1]!, 16)
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

/** WCAG contrast ratio between two `#rrggbb` colours, or `null` when either is not one. */
export function contrastRatio(a: string, b: string): number | null {
  const la = luminance(a)
  const lb = luminance(b)
  if (la === null || lb === null) return null
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Text colour to print on an accent-filled area: white or near-black, whichever reads better. */
export function onAccent(accent: string): string {
  const white = contrastRatio(accent, WHITE)
  const ink = contrastRatio(accent, INK)
  if (white === null || ink === null) return WHITE
  return ink > white ? INK : WHITE
}

const MIN_TEXT_CONTRAST = 4.5

/**
 * The accent to use for *text* on a light surface: unchanged when it already reaches
 * 4.5:1 against white, otherwise the same hue mixed with black until it does.
 * Fills, borders and shapes should keep using the accent itself.
 */
export function accentText(accent: string): string {
  const match = accent.trim().match(/^#([0-9a-f]{6})$/i)
  if (!match) return accent
  const base = parseInt(match[1]!, 16)
  const rgb = [(base >> 16) & 255, (base >> 8) & 255, base & 255]
  for (let step = 0; step <= 20; step += 1) {
    const keep = 1 - step * 0.05
    const hex =
      '#' +
      rgb
        .map((c) => Math.round(c * keep).toString(16).padStart(2, '0'))
        .join('')
    if ((contrastRatio(hex, WHITE) ?? 0) >= MIN_TEXT_CONTRAST) return hex
  }
  return '#000000'
}

export function styleVars(style: StyleTokens): Record<string, string> {
  return {
    '--cv-accent': style.accentColor,
    '--cv-on-accent': onAccent(style.accentColor),
    '--cv-accent-text': accentText(style.accentColor),
    '--cv-font': fontStackWithStandIns(style.fontFamily),
    '--cv-font-scale': String(style.fontScale),
    '--cv-spacing-scale': String(style.spacingScale),
    '--cv-page-margin': style.pageMargin,
  }
}

export interface ResolvedSection {
  id: string
  kind: 'summary' | 'experience' | 'education' | 'skills' | 'languages' | 'custom'
  title: string
  custom?: CVData['customSections'][number]
  /** Starts on a new page when paginated; templates honour it on main-column sections only. */
  breakBefore?: true
}

const BUILTIN_TITLES: Record<string, Record<string, string>> = {
  summary: { es: 'Resumen', en: 'Summary', fr: 'Profil', it: 'Profilo', pt: 'Perfil', de: 'Profil' },
  experience: { es: 'Experiencia', en: 'Experience', fr: 'Expérience', it: 'Esperienza', pt: 'Experiência', de: 'Berufserfahrung' },
  education: { es: 'Formación', en: 'Education', fr: 'Formation', it: 'Formazione', pt: 'Formação', de: 'Ausbildung' },
  skills: { es: 'Competencias', en: 'Skills', fr: 'Compétences', it: 'Competenze', pt: 'Competências', de: 'Kenntnisse' },
  languages: { es: 'Idiomas', en: 'Languages', fr: 'Langues', it: 'Lingue', pt: 'Idiomas', de: 'Sprachen' },
}

const CONTACT_TITLES: Record<string, string> = { es: 'Contacto', en: 'Contact', fr: 'Contact', it: 'Contatti', pt: 'Contacto', de: 'Kontakt' }

/** The heading of a template's contact block, in the CV's content language. */
export function contactHeading(language = 'es'): string {
  return CONTACT_TITLES[language] ?? CONTACT_TITLES.es!
}

/**
 * Turns `sectionOrder` into a render list, skipping sections with no content so
 * an untouched wizard step never leaves an empty heading on the page.
 */
export function resolveSections(data: CVData): ResolvedSection[] {
  const language = data.meta.language || 'es'
  const title = (id: string) => BUILTIN_TITLES[id]?.[language] ?? BUILTIN_TITLES[id]?.es ?? id

  return data.sectionOrder
    .map<ResolvedSection | null>((id) => {
      switch (id) {
        case 'summary':
          return data.summary.trim() ? { id, kind: 'summary', title: title(id) } : null
        case 'experience':
          return data.experience.length ? { id, kind: 'experience', title: title(id) } : null
        case 'education':
          return data.education.length ? { id, kind: 'education', title: title(id) } : null
        case 'skills':
          return data.skills.length ? { id, kind: 'skills', title: title(id) } : null
        case 'languages':
          return data.languages.length ? { id, kind: 'languages', title: title(id) } : null
        default: {
          const custom = data.customSections.find((s) => s.id === id)
          return custom?.entries.length
            ? { id, kind: 'custom', title: custom.title, custom }
            : null
        }
      }
    })
    .filter((s): s is ResolvedSection => s !== null)
    .map((s) => (data.pageBreaks.includes(s.id) ? { ...s, breakBefore: true } : s))
}

/**
 * An e-mail or URL cut into pieces that may end a line (spec 033): after "@", and before ".", "/",
 * "?", "#", "&" or "=" (but not inside "://"). Templates join them with <wbr>, so a narrow column
 * breaks "ana.ortega@ / example.com" rather than "ana.ortega@example.co / m". Text with none of
 * these characters comes back whole.
 */
export function breakParts(text: string): string[] {
  const parts: string[] = []
  let start = 0
  for (let i = 1; i < text.length; i++) {
    const ch = text[i]!
    const prev = text[i - 1]!
    const before = '.?#&='.includes(ch) || (ch === '/' && prev !== '/' && prev !== ':')
    if (before || prev === '@') {
      parts.push(text.slice(start, i))
      start = i
    }
  }
  parts.push(text.slice(start))
  return parts
}

/** Strips the protocol so links read as "github.com/nadia" rather than the full URL. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

export function absoluteUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

/**
 * Language levels are free text in the model (`LanguageEntry.level`), so the
 * dots shown by a template are *derived* from it. Matching is deliberately
 * conservative: an unknown string yields `null` and the template prints the text
 * alone rather than guess a level. The words of every CV language are always recognised,
 * because what the user typed depends on neither the editor's UI language nor the CV's.
 * Keys are lower case and without accents (see `normalizeLevel`); "ß" has no accent to drop.
 */
const LEVEL_SCORES: Record<string, number> = {
  nativo: 5, native: 5, materna: 5, 'lengua materna': 5, 'mother tongue': 5,
  bilingue: 5, bilingual: 5,
  avanzado: 4, advanced: 4, fluido: 4, fluent: 4, 'intermedio alto': 4, 'upper intermediate': 4,
  intermedio: 3, intermediate: 3, competente: 3, competent: 3, conversacional: 3, conversational: 3,
  basico: 2, basic: 2, elemental: 1, elementary: 1, principiante: 1, beginner: 1, nociones: 1,
  // French
  'langue maternelle': 5, natif: 5, courant: 4, avance: 4, intermediaire: 3, debutant: 1, elementaire: 1, notions: 1,
  // Italian
  madrelingua: 5, fluente: 4, avanzato: 4, base: 2, elementare: 1,
  // Portuguese
  'lingua materna': 5, avancado: 4, intermediario: 3, elementar: 1, iniciante: 1,
  // German
  muttersprache: 5, muttersprachlich: 5, zweisprachig: 5, 'fließend': 4, fliessend: 4, verhandlungssicher: 4,
  'gute kenntnisse': 3, mittelstufe: 3, grundkenntnisse: 2, anfanger: 1,
}

const CEFR_SCORES: Record<string, number> = { a1: 1, a2: 2, b1: 3, b2: 4, c1: 5, c2: 5 }

function normalizeLevel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** 1–5, or `null` when the text is not a level this helper recognises. */
export function languageLevelScore(level: string): number | null {
  const text = normalizeLevel(level)
  if (!text) return null
  if (text in LEVEL_SCORES) return LEVEL_SCORES[text] ?? null
  const cefr = text.match(/\b([abc][12])\b/)?.[1]
  return cefr ? (CEFR_SCORES[cefr] ?? null) : null
}

const LEVEL_LABELS: Record<string, (score: number) => string> = {
  es: (score) => `Nivel ${score} de 5`,
  en: (score) => `Level ${score} of 5`,
  fr: (score) => `Niveau ${score} sur 5`,
  it: (score) => `Livello ${score} su 5`,
  pt: (score) => `Nível ${score} de 5`,
  de: (score) => `Stufe ${score} von 5`,
}

/** Every per-language table of this module, for the test that keeps them complete (spec 056). */
export const LANGUAGE_TABLES: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  MONTHS,
  PRESENT,
  EXTRA_LABELS,
  MARITAL_LABELS,
  CONTACT_TITLES,
  LEVEL_LABELS,
  ...Object.fromEntries(Object.entries(BUILTIN_TITLES).map(([id, titles]) => [`BUILTIN_TITLES.${id}`, titles])),
}

/** Text read by assistive technology; follows the CV content language, not the UI's. */
export function levelAccessibleLabel(score: number, language = 'es'): string {
  return (LEVEL_LABELS[language] ?? LEVEL_LABELS.es!)(score)
}

/** The skill names of a group, in order, without their levels. */
export function skillNames(group: SkillGroup): string[] {
  return group.items.map((item) => item.name)
}

/** True when at least one skill in the group carries a level (the group then renders as rows). */
export function groupHasLevels(group: SkillGroup): boolean {
  return group.items.some((item) => item.level !== undefined)
}

export interface ResolvedLanguage extends LanguageEntry {
  /** 1–5, or `null` when the typed level is not recognised (the text is printed instead). */
  score: number | null
  /** Accessible label in the CV content language; empty when there is no score. */
  label: string
}

/** The CV's languages with the level mark data every level-drawing template needs. */
export function resolveLanguages(data: CVData): ResolvedLanguage[] {
  const language = data.meta.language || 'es'
  return data.languages.map((lang) => {
    const score = languageLevelScore(lang.level)
    return { ...lang, score, label: score === null ? '' : levelAccessibleLabel(score, language) }
  })
}
