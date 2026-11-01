import type { CustomSection } from '@/types/cv'
import { createCustomEntry, createCustomSection } from './factory'

export const SECTION_PRESET_IDS = [
  'courses',
  'certificates',
  'internships',
  'projects',
  'hobbies',
  'references',
  'privacy',
] as const

export type SectionPresetId = (typeof SECTION_PRESET_IDS)[number]

interface SectionPreset {
  /** Section title as it appears in the CV, per content language. */
  titles: Record<string, string>
  /** Optional first entry, for sections that make no sense empty. */
  seed?: Record<string, string>
}

/** One entry per CV language (`CV_LANGUAGES`); a test keeps them complete. */
const PRESETS: Record<SectionPresetId, SectionPreset> = {
  courses: { titles: { es: 'Cursos', en: 'Courses', fr: 'Cours', it: 'Corsi', pt: 'Cursos', de: 'Kurse' } },
  certificates: { titles: { es: 'Certificados', en: 'Certificates', fr: 'Certifications', it: 'Certificazioni', pt: 'Certificações', de: 'Zertifikate' } },
  internships: { titles: { es: 'Prácticas', en: 'Internships', fr: 'Stages', it: 'Tirocini', pt: 'Estágios', de: 'Praktika' } },
  projects: { titles: { es: 'Proyectos', en: 'Projects', fr: 'Projets', it: 'Progetti', pt: 'Projetos', de: 'Projekte' } },
  hobbies: { titles: { es: 'Intereses', en: 'Interests', fr: 'Centres d’intérêt', it: 'Interessi', pt: 'Interesses', de: 'Interessen' } },
  references: {
    titles: { es: 'Referencias', en: 'References', fr: 'Références', it: 'Referenze', pt: 'Referências', de: 'Referenzen' },
    seed: {
      es: 'Disponibles bajo petición',
      en: 'Available on request',
      fr: 'Disponibles sur demande',
      it: 'Disponibili su richiesta',
      pt: 'Disponíveis mediante pedido',
      de: 'Auf Anfrage erhältlich',
    },
  },
  privacy: {
    titles: { es: 'Protección de datos', en: 'Data protection', fr: 'Protection des données', it: 'Trattamento dei dati personali', pt: 'Proteção de dados', de: 'Datenschutz' },
    seed: {
      es: 'Doy mi consentimiento para el tratamiento de mis datos personales con fines de selección de personal.',
      en: 'I consent to the processing of my personal data for recruitment purposes.',
      fr: 'J’accepte le traitement de mes données personnelles à des fins de recrutement.',
      it: 'Autorizzo il trattamento dei miei dati personali ai sensi del Regolamento (UE) 2016/679 ai fini della selezione del personale.',
      pt: 'Autorizo o tratamento dos meus dados pessoais para efeitos de recrutamento.',
      de: 'Ich willige in die Verarbeitung meiner personenbezogenen Daten zum Zweck der Personalauswahl ein.',
    },
  },
}

/** Every per-language table of this module, for the test that keeps them complete (spec 056). */
export const PRESET_TABLES: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.fromEntries(
  Object.entries(PRESETS).flatMap(([id, preset]) => [
    [`${id}.titles`, preset.titles],
    ...(preset.seed ? [[`${id}.seed`, preset.seed]] : []),
  ]),
)

const FALLBACK = 'es'

/** Title a preset gets for a CV content language (falls back to Spanish). */
export function presetTitle(id: SectionPresetId, language: string): string {
  const { titles } = PRESETS[id]
  return titles[language] ?? titles[FALLBACK]!
}

export function createSectionFromPreset(id: SectionPresetId, language: string): CustomSection {
  const section = createCustomSection(presetTitle(id, language))
  const seed = PRESETS[id].seed
  if (seed) section.entries.push({ ...createCustomEntry(), title: seed[language] ?? seed[FALLBACK]! })
  return section
}
