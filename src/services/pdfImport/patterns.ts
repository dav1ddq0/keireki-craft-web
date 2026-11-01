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

/** The months written out, in the six languages. */
const MONTH_NAMES = [
  'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre',
  'january|february|march|april|june|july|august|september|october|november|december',
  'janvier|février|fevrier|avril|juillet|septembre|octobre|novembre|décembre|decembre',
  'gennaio|febbraio|aprile|maggio|giugno|luglio|settembre|ottobre|dicembre',
  'janeiro|fevereiro|março|marco|maio|junho|julho|setembro|outubro|dezembro',
  'januar|februar|märz|maerz|juni|juli|oktober|dezember',
].join('|')

/**
 * A month is a word of its own, abbreviated or written out: "févr.", "März", "septiembre". Not the
 * start of a longer word, or a company followed by a year ("Outsystems 2019", "Maison 2018",
 * "Generali 2019") was read as a month and cut from the entry (spec 060, task 2).
 */
const MONTH_TOKEN = `(?<!\\p{L})(?:${MONTHS_ES}|${MONTHS_EN}|${MONTHS_FR}|${MONTHS_IT}|${MONTHS_PT}|${MONTHS_DE}|${MONTH_NAMES})\\.?(?!\\p{L})`
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

/** The languages whose headings are known; also the CV languages an import can be set to (spec 061). */
export type HeadingLanguage = 'es' | 'en' | 'fr' | 'it' | 'pt' | 'de'

/**
 * Section headers per language (spec §7.2, spec 060), matched on a normalized, accent-free string.
 * A word may be in more than one language ("perfil", "idiomas", "profil"); spec 061 tells the
 * language of a CV by which of these tables its headings are in.
 */
const SECTION_WORDS: Record<HeadingLanguage, Record<SectionKind, string[]>> = {
  es: {
    summary: ['resumen', 'perfil', 'sobre mi', 'acerca de mi', 'extracto'],
    experience: ['experiencia', 'experiencia laboral', 'experiencia profesional', 'trayectoria', 'empleo', 'historial laboral'],
    education: ['formacion', 'formacion academica', 'educacion', 'estudios', 'titulacion'],
    skills: ['habilidades', 'competencias', 'aptitudes', 'conocimientos', 'tecnologias'],
    languages: ['idiomas', 'lenguas'],
  },
  en: {
    summary: ['summary', 'profile', 'about me', 'objective'],
    experience: ['experience', 'work experience', 'professional experience', 'employment', 'career'],
    education: ['education', 'academic background', 'qualifications', 'academic'],
    skills: ['skills', 'technical skills', 'core competencies', 'expertise', 'technologies', 'stack'],
    languages: ['languages', 'language skills'],
  },
  fr: {
    // Not "résumé": accent-free it is the "Resume" an English CV is titled with (spec 060, task 2).
    summary: ['profil', 'profil professionnel', 'a propos', 'a propos de moi', 'objectif'],
    experience: ['experience', 'experiences', 'experience professionnelle', 'experiences professionnelles', 'parcours professionnel'],
    education: ['formation', 'formations', 'etudes', 'diplomes', 'formation academique', 'parcours academique'],
    skills: ['competences', 'competences techniques', 'savoir faire'],
    languages: ['langues', 'competences linguistiques'],
  },
  it: {
    summary: ['profilo', 'profilo professionale', 'chi sono', 'sommario', 'obiettivo'],
    experience: ['esperienza', 'esperienze', 'esperienza professionale', 'esperienze professionali', 'esperienza lavorativa'],
    education: ['formazione', 'istruzione', 'studi', 'istruzione e formazione', 'titoli di studio'],
    skills: ['competenze', 'competenze tecniche', 'conoscenze'],
    languages: ['lingue', 'lingue straniere', 'conoscenze linguistiche'],
  },
  pt: {
    summary: ['perfil', 'perfil profissional', 'sobre mim', 'resumo', 'objetivo'],
    experience: ['experiencia', 'experiencia profissional', 'percurso profissional'],
    education: ['formacao', 'formacao academica', 'educacao', 'habilitacoes', 'habilitacoes academicas'],
    skills: ['competencias', 'competencias tecnicas', 'conhecimentos', 'aptidoes'],
    languages: ['idiomas', 'linguas'],
  },
  de: {
    summary: ['profil', 'kurzprofil', 'berufliches profil', 'uber mich', 'zusammenfassung'],
    experience: ['berufserfahrung', 'erfahrung', 'berufliche erfahrung', 'werdegang', 'beruflicher werdegang', 'praxiserfahrung'],
    education: ['ausbildung', 'bildung', 'bildungsweg', 'studium', 'schulbildung', 'akademischer werdegang'],
    skills: ['kenntnisse', 'fahigkeiten', 'kompetenzen', 'fachkenntnisse', 'it kenntnisse', 'edv kenntnisse'],
    languages: ['sprachen', 'sprachkenntnisse', 'fremdsprachen'],
  },
}

const HEADING_LANGUAGES = Object.keys(SECTION_WORDS) as HeadingLanguage[]
const SECTION_KINDS: SectionKind[] = ['summary', 'experience', 'education', 'skills', 'languages']

/** Every language's headers by section, the table the heuristics match against. */
export const SECTION_KEYWORDS: Array<{ kind: SectionKind; words: string[] }> = SECTION_KINDS.map((kind) => ({
  kind,
  words: [...new Set(HEADING_LANGUAGES.flatMap((language) => SECTION_WORDS[language][kind]))],
}))

/**
 * The language of a CV by its section headings (spec 061): the one whose table holds the most of
 * them. A tie goes to the language listed first: Spanish over Portuguese for a CV headed only
 * "Perfil · Experiência · Idiomas", which reads the same in both. No known heading gives null.
 */
export function headingLanguage(headings: string[]): HeadingLanguage | null {
  const keys = headings.map((heading) => normalizeHeading(heading).replace(/ /g, '')).filter(Boolean)
  let best: HeadingLanguage | null = null
  let bestScore = 0
  for (const language of HEADING_LANGUAGES) {
    const words = new Set(SECTION_KINDS.flatMap((kind) => SECTION_WORDS[language][kind]).map((word) => word.replace(/ /g, '')))
    const score = keys.filter((key) => words.has(key)).length
    if (score > bestScore) {
      best = language
      bestScore = score
    }
  }
  return best
}

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
