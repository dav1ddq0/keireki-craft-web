import { describe, expect, it } from 'vitest'
import type { ExtractedDocument, ExtractedLine } from '@/services/pdfImport/extract'
import { analyze, parseDateRange, toPartialIso } from '@/services/pdfImport/heuristics'
import { assembleCV } from '@/services/pdfImport/assemble'

/** An extraction built by hand, one line under the other, like the one in pdfImport.test.ts. */
function doc(lines: Array<Partial<ExtractedLine> & { text: string }>): ExtractedDocument {
  const full: ExtractedLine[] = lines.map((line, index) => ({
    page: 1,
    y: 800 - index * 14,
    x: 50,
    end: 50 + line.text.length * 5,
    fontSize: 10,
    fontName: 'Helvetica',
    bold: false,
    ...line,
  }))
  return { lines: full, rawText: full.map((l) => l.text).join('\n'), pageCount: 1, hasTextLayer: true, looksMultiColumn: false }
}

const heading = (text: string) => ({ text, fontSize: 13, bold: true })

/** The same short CV in each language, its headings, dates and levels as the templates write them. */
const CVS = {
  fr: [
    { text: 'CLAIRE DUBOIS', fontSize: 22, bold: true },
    { text: 'claire.dubois@example.com' },
    heading('Profil'),
    { text: 'Développeuse full-stack depuis six ans.' },
    heading('Expérience professionnelle'),
    { text: 'Développeuse senior — Cartographe mars 2022 – aujourd’hui' },
    { text: 'Développeuse full-stack — Studio Nuage sept. 2019 – févr. 2022' },
    heading('Formation'),
    { text: 'Diplôme d’ingénieur — INSA Lyon 2014 - 2018' },
    heading('Compétences'),
    { text: 'Langages : TypeScript, Python' },
    heading('Langues'),
    { text: 'Français · Langue maternelle' },
    { text: 'Anglais · C1' },
  ],
  it: [
    { text: 'GIULIA FERRI', fontSize: 22, bold: true },
    { text: 'giulia.ferri@example.com' },
    heading('Profilo'),
    { text: 'Sviluppatrice full-stack da sei anni.' },
    heading('Esperienza professionale'),
    { text: 'Sviluppatrice senior — Cartografo mar 2022 – oggi' },
    { text: 'Sviluppatrice full-stack — Studio Nuvola set 2019 – feb 2022' },
    heading('Formazione'),
    { text: 'Laurea in Ingegneria — Università di Bologna 2014 - 2018' },
    heading('Competenze'),
    { text: 'Linguaggi: TypeScript, Python' },
    heading('Lingue'),
    { text: 'Italiano · Madrelingua' },
    { text: 'Inglese · C1' },
  ],
  pt: [
    { text: 'INÊS CARVALHO', fontSize: 22, bold: true },
    { text: 'ines.carvalho@example.com' },
    heading('Perfil'),
    { text: 'Programadora full-stack há seis anos.' },
    heading('Experiência profissional'),
    { text: 'Programadora sénior — Cartógrafo mar 2022 – atual' },
    { text: 'Programadora full-stack — Estúdio Nuvem set 2019 – fev 2022' },
    heading('Formação académica'),
    { text: 'Licenciatura — Universidade do Porto 2014 - 2018' },
    heading('Competências'),
    { text: 'Linguagens: TypeScript, Python' },
    heading('Idiomas'),
    { text: 'Português · Língua materna' },
    { text: 'Inglês · C1' },
  ],
  de: [
    { text: 'LENA SCHNEIDER', fontSize: 22, bold: true },
    { text: 'lena.schneider@example.com' },
    heading('Über mich'),
    { text: 'Full-Stack-Entwicklerin seit sechs Jahren.' },
    heading('Berufserfahrung'),
    { text: 'Senior-Entwicklerin — Kartograf 03.2022 bis heute' },
    { text: 'Full-Stack-Entwicklerin — Studio Wolke Sept. 2019 – Feb. 2022' },
    heading('Ausbildung'),
    { text: 'B.Sc. Informatik — TU München 2014 - 2018' },
    heading('IT-Kenntnisse'),
    { text: 'Programmiersprachen: TypeScript, Python' },
    heading('Sprachkenntnisse'),
    { text: 'Deutsch · Muttersprache' },
    { text: 'Englisch · verhandlungssicher' },
  ],
}

describe('PDF import of a CV in French, Italian, Portuguese or German (spec 060)', () => {
  it.each(Object.entries(CVS))('%s: finds every section, the dates and the levels', (_lang, lines) => {
    const draft = analyze(doc(lines))
    expect(draft.sections.map((s) => s.kind)).toEqual(['summary', 'experience', 'education', 'skills', 'languages'])
    const cv = assembleCV(draft)
    expect(cv.experience.map((e) => [e.startDate, e.endDate])).toEqual([
      ['2022-03', null],
      ['2019-09', '2022-02'],
    ])
    expect(cv.education[0]).toMatchObject({ startDate: '2014', endDate: '2018' })
    expect(cv.languages).toHaveLength(2)
    expect(cv.languages[0]!.level).not.toBe('')
  })
})

describe('dates in the new languages (spec 060)', () => {
  it.each([
    ['janv. 2020', '2020-01'], ['févr. 2020', '2020-02'], ['mars 2020', '2020-03'], ['avr. 2020', '2020-04'],
    ['mai 2020', '2020-05'], ['juin 2020', '2020-06'], ['juil. 2020', '2020-07'], ['août 2020', '2020-08'],
    ['déc. 2020', '2020-12'], ['gen 2020', '2020-01'], ['mag 2020', '2020-05'], ['giu 2020', '2020-06'],
    ['lug 2020', '2020-07'], ['ott 2020', '2020-10'], ['fev 2020', '2020-02'], ['out 2020', '2020-10'],
    ['dez 2020', '2020-12'], ['März 2020', '2020-03'], ['Mrz. 2020', '2020-03'], ['Okt. 2020', '2020-10'],
    ['03.2020', '2020-03'],
  ])('reads %s', (token, expected) => {
    expect(toPartialIso(token)).toBe(expected)
  })

  it.each([
    ['2019 à 2021', { start: '2019', end: '2021' }],
    ['mars 2021 – à ce jour', { start: '2021-03', end: null }],
    ['set 2019 – oggi', { start: '2019-09', end: null }],
    ['fev 2019 até atualmente', { start: '2019-02', end: null }],
    ['Okt. 2020 bis heute', { start: '2020-10', end: null }],
    ['10.2020 – derzeit', { start: '2020-10', end: null }],
  ])('reads the range %s', (text, expected) => {
    expect(parseDateRange(text)).toEqual(expected)
  })
})
