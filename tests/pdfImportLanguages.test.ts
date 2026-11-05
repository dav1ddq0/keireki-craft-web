import { describe, expect, it } from 'vitest'
import type { ExtractedDocument, ExtractedLine } from '@/services/pdfImport/extract'
import { analyze, parseDateRange, toPartialIso } from '@/services/pdfImport/heuristics'
import { assembleCV } from '@/services/pdfImport/assemble'
import { headingLanguage } from '@/services/pdfImport/patterns'

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
  ca: [
    { text: 'LAIA PUIG', fontSize: 22, bold: true },
    { text: 'laia.puig@example.com' },
    heading('Perfil'),
    { text: 'Desenvolupadora full-stack des de fa sis anys.' },
    heading('Experiència professional'),
    { text: 'Desenvolupadora sènior — Cartograf març 2022 – actualitat' },
    { text: 'Desenvolupadora full-stack — Estudi Núvol set. 2019 – febr. 2022' },
    heading('Formació'),
    { text: 'Grau en Enginyeria — Universitat de Girona 2014 - 2018' },
    heading('Competències'),
    { text: 'Llenguatges: TypeScript, Python' },
    heading('Idiomes'),
    { text: 'Català · Llengua materna' },
    { text: 'Anglès · C1' },
  ],
  // Basque writes the year first (spec 070).
  eu: [
    { text: 'ANE ETXEBERRIA', fontSize: 22, bold: true },
    { text: 'ane.etxeberria@example.com' },
    heading('Profila'),
    { text: 'Full-stack garatzailea, sei urtez.' },
    heading('Lan esperientzia'),
    { text: 'Garatzaile seniorra — Cartograf 2022ko mar. – gaur egun' },
    { text: 'Full-stack garatzailea — Hodei Estudioa 2019ko iraila – 2022ko otsaila' },
    heading('Prestakuntza'),
    { text: 'Gradua — UPV/EHU 2014 - 2018' },
    heading('Gaitasunak'),
    { text: 'Lengoaiak: TypeScript, Python' },
    heading('Hizkuntzak'),
    { text: 'Euskara · Ama hizkuntza' },
    { text: 'Ingelesa · C1' },
  ],
}

describe('PDF import of a CV in French, Italian, Portuguese, German, Catalan or Basque (specs 060, 070)', () => {
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
    // Spec 070: Catalan and Valencian, then Basque, year first.
    ['gener 2020', '2020-01'], ['febr. 2020', '2020-02'], ['març 2020', '2020-03'], ['maig 2020', '2020-05'],
    ['juny 2020', '2020-06'], ['juliol 2020', '2020-07'], ['ag. 2020', '2020-08'], ['des. 2020', '2020-12'],
    ['2020ko urt.', '2020-01'], ['2020ko otsaila', '2020-02'], ['2021eko apirila', '2021-04'], ['2020ko eka.', '2020-06'],
    ['2020ko uzt.', '2020-07'], ['2020(e)ko abu.', '2020-08'], ['2020ko urria', '2020-10'], ['2021eko abendua', '2021-12'],
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
    ['set. 2019 a juny 2021', { start: '2019-09', end: '2021-06' }],
    ['gener 2021 – actualitat', { start: '2021-01', end: null }],
    ['2019ko urtarrila – 2021eko ekaina', { start: '2019-01', end: '2021-06' }],
    ['2021eko urr. – gaur egun', { start: '2021-10', end: null }],
  ])('reads the range %s', (text, expected) => {
    expect(parseDateRange(text)).toEqual(expected)
  })
})

describe('the language of an imported CV (spec 061)', () => {
  it.each(Object.entries(CVS))('%s: the CV takes the language of its headings', (lang, lines) => {
    expect(assembleCV(analyze(doc(lines))).meta.language).toBe(lang)
  })

  it('reads Spanish and English headings as such, and keeps a choice made on review', () => {
    const english = doc([{ text: 'ADA LOVELACE', fontSize: 22, bold: true }, heading('Experience'), { text: 'Analyst — Babbage 2019 - 2021' }, heading('Education'), { text: 'BSc — London 2015 - 2019' }])
    expect(assembleCV(analyze(english)).meta.language).toBe('en')
    expect(assembleCV(analyze(english), { language: 'de' }).meta.language).toBe('de')
    const spanish = doc([{ text: 'ADA LOVELACE', fontSize: 22, bold: true }, heading('Experiencia'), { text: 'Analista — Babbage 2019 - 2021' }, heading('Formación'), { text: 'Grado — Londres 2015 - 2019' }])
    expect(assembleCV(analyze(spanish)).meta.language).toBe('es')
  })

  it('falls back to Spanish when no heading is known', () => {
    const draft = analyze(doc([{ text: 'ADA LOVELACE', fontSize: 22, bold: true }, { text: 'algo suelto' }]))
    expect(draft.language).toBeNull()
    expect(assembleCV(draft).meta.language).toBe('es')
  })

  it('counts the headings of each language; a tie goes to the language listed first', () => {
    expect(headingLanguage(['Perfil', 'Experiência', 'Formação', 'Competências', 'Idiomas'])).toBe('pt')
    expect(headingLanguage(['Perfil', 'Experiencia', 'Formación', 'Competencias', 'Idiomas'])).toBe('es')
    expect(headingLanguage(['Profil', 'Berufserfahrung', 'Ausbildung'])).toBe('de')
    expect(headingLanguage(['Profil', 'Expérience', 'Formation'])).toBe('fr')
    expect(headingLanguage(['Perfil', 'Experiência', 'Idiomas'])).toBe('es')
    expect(headingLanguage(['E X P E R I E N C E', 'EDUCATION'])).toBe('en')
    // Catalan and Valencian share their headings; "Perfil" and "Experiència" alone tie with Spanish.
    expect(headingLanguage(['Perfil', 'Experiència', 'Formació', 'Competències', 'Idiomes'])).toBe('ca')
    expect(headingLanguage(['Profila', 'Esperientzia', 'Prestakuntza'])).toBe('eu')
    expect(headingLanguage([])).toBeNull()
  })
})

describe('words the new languages must not take (spec 060, task 2)', () => {
  const experience = (line: string) =>
    assembleCV(analyze(doc([{ text: 'JOHN DOE', fontSize: 22, bold: true }, heading('Experience'), { text: line }]))).experience[0]!

  it.each([
    ['Engineer — Outsystems 2019 - 2021', 'Outsystems'],
    ['Developer — Maison 2018 - 2020', 'Maison'],
    ['Developer — Dezign 2018 - 2020', 'Dezign'],
    ['Analyst — Generali 2019 - 2021', 'Generali'],
    ['Analyst — Magneti Marelli 2019 - 2021', 'Magneti Marelli'],
    ['Engineer — Siemens AG 2019 - 2021', 'Siemens AG'],
    ['Engineer — Payments API 2019 - 2021', 'Payments API'],
  ])('a company that starts like a month is not a month: %s', (line, company) => {
    expect(experience(line)).toMatchObject({ company, startDate: line.includes('2019') ? '2019' : '2018' })
  })

  it('still reads months written out or abbreviated, with or without a point', () => {
    expect(parseDateRange('septiembre 2019 – marzo 2022')).toEqual({ start: '2019-09', end: '2022-03' })
    expect(parseDateRange('Sept. 2019 – März 2022')).toEqual({ start: '2019-09', end: '2022-03' })
    expect(parseDateRange('giugno 2019 - dicembre 2020')).toEqual({ start: '2019-06', end: '2020-12' })
    expect(parseDateRange('março 2019 até dezembro 2020')).toEqual({ start: '2019-03', end: '2020-12' })
  })

  it('does not read the "Resume" title of an English CV as its summary', () => {
    const draft = analyze(doc([{ text: 'JOHN DOE', fontSize: 22, bold: true }, { text: 'Resume', fontSize: 13 }, { text: 'Software engineer' }, { text: 'john@example.com' }, heading('Experience'), { text: 'Developer — Acme 2019 - 2021' }]))
    expect(draft.sections.map((s) => s.kind)).toEqual(['experience'])
    expect(draft.language).toBe('en')
  })
})
