/** Regexes and keyword tables shared by the import heuristics. Kept separate so
 *  adding a language is a data change, not a logic change. */

export const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/
export const URL_RE = /\b(?:https?:\/\/)?(?:[\w-]+\.)+[a-z]{2,}(?:\/[\w#!:.?+=&%@\-/]*)?/gi
/** Deliberately loose: international CV phone formatting is wildly inconsistent. */
export const PHONE_RE = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d[\d\s.-]{7,14}\d/

export const PROFILE_HOSTS: Array<{ host: RegExp; label: string }> = [
  { host: /linkedin\.com/i, label: 'LinkedIn' },
  { host: /github\.com/i, label: 'GitHub' },
  { host: /gitlab\.com/i, label: 'GitLab' },
  { host: /stackoverflow\.com/i, label: 'Stack Overflow' },
  { host: /behance\.net/i, label: 'Behance' },
  { host: /dribbble\.com/i, label: 'Dribbble' },
]

const MONTHS_ES = 'ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic'
const MONTHS_EN = 'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec'
// Spec 060: French, Italian, Portuguese and German, as their own date formats abbreviate them.
const MONTHS_FR = 'janv|févr|fevr|mars|avr|mai|juin|juil|août|aout|sept|oct|nov|déc|dec'
const MONTHS_IT = 'gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic'
const MONTHS_PT = 'jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez'
const MONTHS_DE = 'jan|feb|mär|maer|mrz|apr|mai|jun|jul|aug|sep|okt|nov|dez'
export const PRESENT_WORDS =
  /actualidad|actualmente|presente|present|current|now|hoy|aujourd[’']hui|à ce jour|actuel(?:le)?|en cours|oggi|attuale|in corso|atual(?:mente)?|heute|derzeit|aktuell|laufend/i

const MONTH_TOKEN = `(?:${MONTHS_ES}|${MONTHS_EN}|${MONTHS_FR}|${MONTHS_IT}|${MONTHS_PT}|${MONTHS_DE})\\p{L}*\\.?`
// "03/2019", "03-2019" and the German "03.2019".
const DATE_TOKEN = `(?:${MONTH_TOKEN}\\s*,?\\s*)?(?:\\d{1,2}[/.-])?\\d{4}`

/** "2020 - 2023", "Mar 2021 – actualidad", "03/2019 a 06/2021", "Okt. 2020 bis heute", "2019 à 2021". */
export const DATE_RANGE_RE = new RegExp(
  `(${DATE_TOKEN})\\s*(?:[-–—]|a|à|al|até|to|hasta|until|bis)\\s*(${DATE_TOKEN}|${PRESENT_WORDS.source})`,
  'iu',
)

/** By the first four, else three, letters of the month, accents removed (`toPartialIso`). */
export const MONTH_INDEX: Record<string, number> = {
  ene: 1, jan: 1, gen: 1,
  feb: 2, fev: 2,
  mar: 3, mae: 3, mrz: 3,
  abr: 4, apr: 4, avr: 4,
  may: 5, mai: 5, mag: 5,
  jun: 6, juin: 6, giu: 6,
  jul: 7, juil: 7, lug: 7,
  ago: 8, aug: 8, aou: 8,
  sep: 9, set: 9, sept: 9,
  oct: 10, ott: 10, out: 10, okt: 10,
  nov: 11,
  dic: 12, dec: 12, dez: 12,
}

export type SectionKind = 'summary' | 'experience' | 'education' | 'skills' | 'languages'

/** Multi-language section headers (spec §7.2). Matched on a normalized, accent-free string. */
export const SECTION_KEYWORDS: Array<{ kind: SectionKind; words: string[] }> = [
  {
    kind: 'summary',
    words: [
      'resumen', 'perfil', 'sobre mi', 'acerca de mi', 'extracto', 'summary', 'profile', 'about me', 'objective',
      'profil', 'profil professionnel', 'resume', 'a propos', 'a propos de moi', 'objectif',
      'profilo', 'profilo professionale', 'chi sono', 'sommario', 'obiettivo',
      'perfil profissional', 'sobre mim', 'resumo', 'objetivo',
      'kurzprofil', 'berufliches profil', 'uber mich', 'zusammenfassung',
    ],
  },
  {
    kind: 'experience',
    words: [
      'experiencia', 'experiencia laboral', 'experiencia profesional', 'trayectoria',
      'empleo', 'historial laboral', 'experience', 'work experience',
      'professional experience', 'employment', 'career',
      'experiences', 'experience professionnelle', 'experiences professionnelles', 'parcours professionnel',
      'esperienza', 'esperienze', 'esperienza professionale', 'esperienze professionali', 'esperienza lavorativa',
      'experiencia profissional', 'percurso profissional',
      'berufserfahrung', 'erfahrung', 'berufliche erfahrung', 'werdegang', 'beruflicher werdegang', 'praxiserfahrung',
    ],
  },
  {
    kind: 'education',
    words: [
      'formacion', 'formacion academica', 'educacion', 'estudios', 'titulacion',
      'education', 'academic background', 'qualifications', 'academic',
      'formation', 'formations', 'etudes', 'diplomes', 'formation academique', 'parcours academique',
      'formazione', 'istruzione', 'studi', 'istruzione e formazione', 'titoli di studio',
      'formacao', 'formacao academica', 'educacao', 'habilitacoes', 'habilitacoes academicas',
      'ausbildung', 'bildung', 'bildungsweg', 'studium', 'schulbildung', 'akademischer werdegang',
    ],
  },
  {
    kind: 'skills',
    words: [
      'habilidades', 'competencias', 'aptitudes', 'conocimientos', 'tecnologias',
      'skills', 'technical skills', 'core competencies', 'expertise', 'technologies', 'stack',
      'competences', 'competences techniques', 'savoir faire',
      'competenze', 'competenze tecniche', 'conoscenze',
      'competencias tecnicas', 'conhecimentos', 'aptidoes',
      'kenntnisse', 'fahigkeiten', 'kompetenzen', 'fachkenntnisse', 'it kenntnisse', 'edv kenntnisse',
    ],
  },
  {
    kind: 'languages',
    words: [
      'idiomas', 'lenguas', 'languages', 'language skills',
      'langues', 'competences linguistiques',
      'lingue', 'lingue straniere', 'conoscenze linguistiche',
      'linguas',
      'sprachen', 'sprachkenntnisse', 'fremdsprachen',
    ],
  },
]

export const BULLET_RE = /^[•‣▪●·*\-–—]\s+/

/**
 * The keyword a heading names once its letters are run together. A tracked-out heading ("RE SUMEN",
 * "EXPE RI ENCIA") reaches the extraction in pieces that no word-gap rule can tell from word spaces.
 */
export function sectionKindOfSquashed(value: string): SectionKind | null {
  const squashed = normalizeHeading(value).replace(/ /g, '')
  return SECTION_KEYWORDS.find((entry) => entry.words.some((word) => word.replace(/ /g, '') === squashed))?.kind ?? null
}

/** Whether `value` names one of the known sections, however its letters are spaced (spec 040). */
export function isSectionHeading(value: string): boolean {
  const normalized = normalizeHeading(value)
  return SECTION_KEYWORDS.some((entry) => entry.words.includes(normalized)) || sectionKindOfSquashed(value) !== null
}

/** Lowercase, accent-free, punctuation-free — the form section headers are matched in. */
export function normalizeHeading(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
