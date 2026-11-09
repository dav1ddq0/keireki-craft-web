import { describe, expect, it } from 'vitest'
import type { ExtractedDocument, ExtractedLine } from '@/services/pdfImport/extract'
import { collapseLetterSpacing, joinFragments } from '@/services/pdfImport/layout'
import { analyze, parseDateRange, titleCaseIfShouting, toPartialIso } from '@/services/pdfImport/heuristics'
import { assembleCV } from '@/services/pdfImport/assemble'

/** Builds an extraction result by hand so the heuristics are testable without a PDF. */
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
  return {
    lines: full,
    rawText: full.map((l) => l.text).join('\n'),
    pageCount: 1,
    hasTextLayer: true,
    looksMultiColumn: false,
  }
}

const SPANISH_CV = doc([
  { text: 'NADIA MARTÍN REYES', fontSize: 22, bold: true },
  { text: 'Desarrolladora Full-Stack', fontSize: 12 },
  { text: 'nadia.martin@example.com · +34 600 123 456' },
  { text: 'Valencia, España' },
  { text: 'linkedin.com/in/nadiamartin' },
  { text: 'EXPERIENCIA', fontSize: 13, bold: true },
  { text: 'Desarrolladora Senior — Cartograf 2022 - actualidad' },
  { text: '• Reduje el tiempo de carga de 4,2 s a 1,1 s.' },
  { text: 'Desarrolladora Full-Stack — Estudio Nube sep 2019 - feb 2022' },
  { text: '• Construí el sistema de diseño compartido.' },
  { text: 'FORMACIÓN', fontSize: 13, bold: true },
  { text: 'Grado en Informática — UPV 2014 - 2018' },
  { text: 'HABILIDADES', fontSize: 13, bold: true },
  { text: 'Lenguajes: TypeScript, Python, Go' },
  { text: 'IDIOMAS', fontSize: 13, bold: true },
  { text: 'Inglés — C1' },
])

describe('parseDateRange', () => {
  it.each([
    ['2020 - 2023', { start: '2020', end: '2023' }],
    ['Mar 2021 – present', { start: '2021-03', end: null }],
    ['sep 2019 - feb 2022', { start: '2019-09', end: '2022-02' }],
    ['03/2019 a 06/2021', { start: '2019-03', end: '2021-06' }],
    ['2022 - actualidad', { start: '2022', end: null }],
  ])('parses %s', (input, expected) => {
    expect(parseDateRange(input)).toEqual(expected)
  })

  it('returns null when there is no range', () => {
    expect(parseDateRange('Desarrolladora Senior')).toBeNull()
  })
})

describe('toPartialIso', () => {
  it('keeps a bare year as a year', () => {
    expect(toPartialIso('2018')).toBe('2018')
  })

  it('maps month names in both languages', () => {
    expect(toPartialIso('ene 2020')).toBe('2020-01')
    expect(toPartialIso('Jan 2020')).toBe('2020-01')
  })
})

describe('analyze', () => {
  const draft = analyze(SPANISH_CV)

  it('picks the largest first-page text as the name', () => {
    expect(draft.fullName.value).toBe('Nadia Martín Reyes')
    expect(draft.fullName.confidence).toBe('high')
  })

  it('extracts direct fields by regex', () => {
    expect(draft.email.value).toBe('nadia.martin@example.com')
    expect(draft.phone.value).toContain('600')
    expect(draft.links).toContainEqual({ label: 'LinkedIn', url: 'linkedin.com/in/nadiamartin' })
  })

  it('finds every known section header', () => {
    expect(draft.sections.map((s) => s.kind)).toEqual([
      'experience',
      'education',
      'skills',
      'languages',
    ])
  })

  it('flags an extraction with no detectable name', () => {
    const anonymous = analyze(doc([{ text: 'algo suelto' }, { text: 'otra linea' }]))
    expect(anonymous.warnings).toContain('noSections')
  })
})

describe('assembleCV', () => {
  const cv = assembleCV(analyze(SPANISH_CV))

  it('splits experience into entries at each date range', () => {
    expect(cv.experience).toHaveLength(2)
    expect(cv.experience[0]).toMatchObject({
      position: 'Desarrolladora Senior',
      company: 'Cartograf',
      startDate: '2022',
      endDate: null,
    })
    expect(cv.experience[1].endDate).toBe('2022-02')
  })

  it('turns bulleted lines into highlights', () => {
    expect(cv.experience[0].highlights).toEqual(['Reduje el tiempo de carga de 4,2 s a 1,1 s.'])
  })

  it('reads "Category: a, b" as a skill group', () => {
    expect(cv.skills[0]).toMatchObject({
      category: 'Lenguajes',
      items: [{ name: 'TypeScript' }, { name: 'Python' }, { name: 'Go' }],
    })
  })

  it('splits a language from its level', () => {
    expect(cv.languages[0]).toMatchObject({ name: 'Inglés', level: 'C1' })
  })

  it('produces a sectionOrder covering every section it created', () => {
    expect(cv.sectionOrder).toEqual(
      expect.arrayContaining(['experience', 'education', 'skills', 'languages']),
    )
  })

  it('discards unclassified blocks unless the reviewer assigns them', () => {
    const withBlock = analyze(
      doc([
        { text: 'Ada Lovelace', fontSize: 20, bold: true },
        { text: 'PREMIOS', fontSize: 13, bold: true },
        { text: 'Medalla de plata 2019' },
      ]),
    )
    expect(withBlock.unclassified.length).toBeGreaterThan(0)

    const blockId = withBlock.unclassified.at(-1)!.id
    expect(assembleCV(withBlock).customSections).toHaveLength(0)
    expect(assembleCV(withBlock, { blocks: { [blockId]: 'custom' } }).customSections).toHaveLength(1)
  })
})

describe('titleCaseIfShouting', () => {
  it('only rewrites all-caps text', () => {
    expect(titleCaseIfShouting('NADIA MARTÍN')).toBe('Nadia Martín')
    expect(titleCaseIfShouting('Nadia Martín')).toBe('Nadia Martín')
  })
})

describe('collapseLetterSpacing', () => {
  it('glues back a heading spread out by CSS letter-spacing', () => {
    expect(collapseLetterSpacing('E X P E R I E N C I A')).toBe('EXPERIENCIA')
    expect(collapseLetterSpacing('R E S U M E N')).toBe('RESUMEN')
  })

  it('leaves ordinary text untouched', () => {
    expect(collapseLetterSpacing('Desarrolladora Senior')).toBe('Desarrolladora Senior')
    expect(collapseLetterSpacing('TypeScript, Python, Go')).toBe('TypeScript, Python, Go')
  })

  it('does not glue short runs that are really separate words', () => {
    expect(collapseLetterSpacing('Go y R')).toBe('Go y R')
  })

  it('makes a tracked-out section header detectable again', () => {
    const spaced = doc([
      { text: 'Ada Lovelace', fontSize: 20, bold: true },
      { text: collapseLetterSpacing('E X P E R I E N C I A'), fontSize: 13, bold: true },
      { text: 'Analista — Babbage 2020 - 2023' },
    ])
    expect(analyze(spaced).sections.map((s) => s.kind)).toEqual(['experience'])
  })
})

describe('joinFragments (spec 037)', () => {
  /** Fragments laid out left to right at 10 pt: [text, gap before it in em]. */
  const line = (...parts: [string, number][]) => {
    let x = 40
    return parts.map(([text, gap]) => {
      x += gap * 10
      const fragment = { x, end: x + text.length * 5, text, fontSize: 10 }
      x = fragment.end
      return fragment
    })
  }

  it('joins pieces of one word that touch', () => {
    expect(joinFragments(line(['Ł', 0], ['ucja', 0.02]))).toBe('Łucja')
    expect(joinFragments(line(['Dvo', 0], ['ř', -0.03], ['ák,', 0.02]))).toBe('Dvořák,')
    expect(joinFragments(line(['lucja', 0], ['.oster@', 0], ['example', 0], ['.com', 0]))).toBe('lucja.oster@example.com')
  })

  it('puts a space where there is a word gap', () => {
    expect(joinFragments(line(['Estudio', 0], ['Nube', 0.17]))).toBe('Estudio Nube')
    expect(joinFragments(line(['Valencia', 0], ['Estudio Nube', 10]))).toBe('Valencia Estudio Nube')
  })

  it('reads the fragments left to right whatever order the PDF draws them in', () => {
    const [first, second] = line(['Ł', 0], ['ucja', 0])
    expect(joinFragments([second!, first!])).toBe('Łucja')
  })
})

describe('tracked-out headings (spec 040)', () => {
  it('reads capitals split into pieces as the section they spell', () => {
    const draft = analyze(
      doc([
        { text: 'Ada Lovelace', fontSize: 20, bold: true },
        { text: 'RE SUMEN', fontSize: 9 },
        { text: 'Analista de sistemas.' },
        { text: 'EXPE RI ENCIA', fontSize: 9 },
        { text: 'Analista — Babbage mar 2020 - 2023' },
        { text: 'FO RM ACIÓN', fontSize: 9 },
        { text: 'Matemáticas — Londres 2010 - 2014' },
        { text: 'C H AR L AS', fontSize: 9 },
        { text: 'Una charla.' },
      ]),
    )
    expect(draft.sections.map((s) => s.kind)).toEqual(['summary', 'experience', 'education'])
    expect(draft.sections[0]!.heading).toBe('RESUMEN')
  })

  it('does not turn ordinary lowercase text into a heading', () => {
    const draft = analyze(doc([{ text: 'Ada Lovelace', fontSize: 20 }, { text: 'Re sumen de cuentas' }, { text: 'texto' }]))
    expect(draft.sections).toEqual([])
  })
})

describe('headings of unknown sections (spec 040)', () => {
  it('splits at a capitals line set apart by a wider gap, so its lines are not read as languages', () => {
    const at = (y: number, text: string, extra: Partial<ExtractedLine> = {}) => ({ text, y, ...extra })
    const draft = analyze(
      doc([
        at(800, 'Ada Lovelace', { fontSize: 20 }),
        at(760, 'IDIOMAS'),
        at(746, 'Inglés (C1)'),
        at(732, 'Francés (B1)'),
        at(700, 'CHARLAS'),
        at(686, 'Una charla sobre máquinas'),
        at(672, 'Otra charla'),
      ]),
    )
    expect(draft.sections.find((s) => s.kind === 'languages')!.lines.map((l) => l.text)).toEqual(['Inglés (C1)', 'Francés (B1)'])
    expect(draft.unclassified.find((b) => b.heading === 'CHARLAS')!.lines).toEqual(['Una charla sobre máquinas', 'Otra charla'])
  })

  it('does not take an acronym inside a list for a heading', () => {
    const at = (y: number, text: string) => ({ text, y })
    const draft = analyze(doc([at(800, 'Ada Lovelace'), at(760, 'COMPETENCIAS'), at(746, 'TypeScript'), at(732, 'SQL'), at(718, 'Go')]))
    expect(draft.sections[0]!.lines.map((l) => l.text)).toEqual(['TypeScript', 'SQL', 'Go'])
  })
})

describe('entries, skills and languages as the templates lay them out (spec 040)', () => {
  const at = (text: string, x: number, y: number, fontSize = 10, extra: Partial<ExtractedLine> = {}) => ({ text, x, y, fontSize, end: x + 200, ...extra })
  const assemble = (lines: Array<Partial<ExtractedLine> & { text: string }>) => assembleCV(analyze(doc(lines)))

  it('reads a title over "Company · dates · Place" as one entry, and sets-in lines as its highlights', () => {
    const cv = assemble([
      at('Ada Lovelace', 40, 800, 22),
      at('EXPERIENCIA', 40, 760, 9),
      at('Analista', 40, 740, 10.2),
      at('Babbage Co · mar 2020 – Actualidad · Londres', 40, 726, 8.6),
      at('Escribió el primer programa.', 40, 708),
      at('Redujo el tiempo de cálculo un 40 %', 52, 690, 10, { end: 330 }),
      at('en la máquina analítica.', 52, 676, 10, { end: 200 }),
      at('Formó a tres personas.', 52, 662, 10, { end: 220 }),
    ])
    expect(cv.experience).toHaveLength(1)
    expect(cv.experience[0]).toMatchObject({ position: 'Analista', company: 'Babbage Co', location: 'Londres', startDate: '2020-03', endDate: null, description: 'Escribió el primer programa.' })
    expect(cv.experience[0]!.highlights).toEqual(['Redujo el tiempo de cálculo un 40 % en la máquina analítica.', 'Formó a tres personas.'])
  })

  it('does not split "Grado en Informática" at the "en" of a degree', () => {
    const cv = assemble([
      at('Ada Lovelace', 40, 800, 22),
      at('FORMACIÓN', 40, 760, 9),
      at('Grado en Matemáticas · Universidad de Londres 2010 - 2014', 40, 740),
    ])
    expect(cv.education[0]).toMatchObject({ degree: 'Grado en Matemáticas', institution: 'Universidad de Londres' })
  })

  it('reads a category line, set a little smaller than its items, as a skill group', () => {
    const cv = assemble([
      at('Ada Lovelace', 40, 800, 22),
      at('COMPETENCIAS', 40, 760, 9),
      at('Lenguajes', 40, 740, 8.8),
      at('TypeScript', 40, 726, 9.2),
      at('Python', 40, 712, 9.2),
      at('Frontend', 40, 698, 8.8),
      at('Vue 3, React', 40, 684, 9.2),
    ])
    expect(cv.skills.map((g) => [g.category, g.items.map((i) => i.name)])).toEqual([
      ['Lenguajes', ['TypeScript', 'Python']],
      ['Frontend', ['Vue 3', 'React']],
    ])
  })

  it('keeps a plain list of skills as one group without a category', () => {
    const cv = assemble([at('Ada Lovelace', 40, 800, 22), at('COMPETENCIAS', 40, 760, 9), at('TypeScript', 40, 740), at('Python', 40, 726)])
    expect(cv.skills.map((g) => [g.category, g.items.map((i) => i.name)])).toEqual([['', ['TypeScript', 'Python']]])
  })

  it('reads languages with their level in the same line, on the next line, or in a whole row', () => {
    const lines = (...texts: string[]) => [at('Ada Lovelace', 40, 800, 22), at('IDIOMAS', 40, 760, 9), ...texts.map((text, i) => at(text, 40, 740 - i * 14))]
    const pairs = (cv: ReturnType<typeof assembleCV>) => cv.languages.map((l) => [l.name, l.level])
    expect(pairs(assemble(lines('Español · Nativo', 'Inglés — C1')))).toEqual([['Español', 'Nativo'], ['Inglés', 'C1']])
    expect(pairs(assemble(lines('Español', 'Nativo', 'Inglés', 'C1')))).toEqual([['Español', 'Nativo'], ['Inglés', 'C1']])
    expect(pairs(assemble(lines('Español (Nativo) · Inglés (C1) · Francés (B1)')))).toEqual([['Español', 'Nativo'], ['Inglés', 'C1'], ['Francés', 'B1']])
  })
})

describe('a heading that opens a page (spec 040)', () => {
  it('is set apart by the page break: its lines are not read as part of the section before it', () => {
    const lines = [
      { text: 'Ada Lovelace', fontSize: 20, y: 800 },
      { text: 'IDIOMAS', y: 760 },
      { text: 'Inglés (C1)', y: 746 },
      { text: 'CHARLAS', page: 2, y: 800 },
      { text: 'Una charla sobre máquinas', page: 2, y: 786 },
    ]
    const draft = analyze(doc(lines))
    expect(draft.sections.find((s) => s.kind === 'languages')!.lines.map((l) => l.text)).toEqual(['Inglés (C1)'])
    expect(draft.unclassified.find((b) => b.heading === 'CHARLAS')!.lines).toEqual(['Una charla sobre máquinas'])
  })
})

describe('the place beside the contact details (spec 040)', () => {
  it('is found next to the e-mail when the header lines are somewhere else', () => {
    const at = (text: string, y: number, fontSize = 10) => ({ text, y, fontSize })
    const draft = analyze(
      doc([
        at('Ada Lovelace', 800, 22),
        at('RESUMEN', 760, 9),
        at('Analista de sistemas.', 746),
        at('CONTACTO', 700, 9),
        at('ada@example.com', 686),
        at('+34 600 123 456', 672),
        at('Londres, Reino Unido', 658),
      ]),
    )
    expect(draft.location.value).toBe('Londres, Reino Unido')
  })
})

describe('layouts that put an entry together from several cells (spec 040)', () => {
  const at = (text: string, x: number, y: number, fontSize = 10, extra: Partial<ExtractedLine> = {}) => ({ text, x, y, fontSize, end: x + 200, ...extra })
  const assemble = (lines: Array<Partial<ExtractedLine> & { text: string }>) => assembleCV(analyze(doc(lines)))

  it('joins a date set in its own cell on the title row, and takes the smaller line below as company and place', () => {
    const cv = assemble([
      at('Ada Lovelace', 40, 800, 22),
      at('EXPERIENCIA', 40, 760, 9),
      at('Analista', 40, 740, 10.2),
      at('mar 2022 – Actualidad', 400, 740, 8.2),
      at('Babbage Co · Londres', 40, 726, 8.8),
      at('Escribió el primer programa.', 40, 708),
      at('Programador', 40, 680, 10.2),
      at('sep 2019 – feb 2022', 400, 680, 8.2),
      at('Otra Co', 40, 666, 8.8),
      at('Tradujo notas sobre la máquina.', 40, 648),
    ])
    expect(cv.experience.map((e) => [e.position, e.company, e.location, e.startDate])).toEqual([
      ['Analista', 'Babbage Co', 'Londres', '2022-03'],
      ['Programador', 'Otra Co', '', '2019-09'],
    ])
  })

  it('puts a degree\'s institution from the smaller line under it', () => {
    const cv = assemble([
      at('Ada Lovelace', 40, 800, 22),
      at('FORMACIÓN', 40, 760, 9),
      at('Grado en Matemáticas', 40, 740, 10.2),
      at('2010 - 2014', 400, 740, 8.2),
      at('Universidad de Londres', 40, 726, 8.8),
    ])
    expect(cv.education[0]).toMatchObject({ degree: 'Grado en Matemáticas', institution: 'Universidad de Londres', startDate: '2010' })
  })

  it('pairs labels in one column with their rows of items in another, whichever sits a line higher', () => {
    const labelFirst = assemble([
      at('Ada Lovelace', 40, 800, 22),
      at('COMPETENCIAS', 40, 760, 9),
      at('Lenguajes', 40, 740, 8.3),
      at('TypeScript · Go', 170, 740, 9.6),
      at('Frontend', 40, 722, 8.3),
      at('Vue 3 · React', 170, 722, 9.6),
    ])
    const valueFirst = assemble([
      at('Ada Lovelace', 40, 800, 22),
      at('COMPETENCIAS', 40, 760, 9),
      at('TypeScript · Go', 170, 750, 10.5),
      at('Lenguajes', 40, 740, 10.5),
      at('Vue 3 · React', 170, 732, 10.5),
      at('Frontend', 40, 722, 10.5),
    ])
    for (const cv of [labelFirst, valueFirst]) {
      expect(cv.skills.map((g) => [g.category, g.items.map((i) => i.name)])).toEqual([['Lenguajes', ['TypeScript', 'Go']], ['Frontend', ['Vue 3', 'React']]])
    }
  })

  it('joins a skill list that wraps onto a lower-case line into one item', () => {
    const cv = assemble([at('Ada Lovelace', 40, 800, 22), at('COMPETENCIAS', 40, 760, 9), at('Vue 3, React, Vite, CSS', 40, 740), at('moderno', 40, 726), at('FastAPI, Redis,', 40, 712), at('Docker', 40, 698)])
    expect(cv.skills[0]!.items.map((i) => i.name)).toEqual(['Vue 3', 'React', 'Vite', 'CSS moderno', 'FastAPI', 'Redis', 'Docker'])
  })
})

describe('links beside the e-mail (spec 084)', () => {
  const links = (...texts: string[]) => analyze(doc([{ text: 'Ada Lovelace', fontSize: 22 }, ...texts.map((text) => ({ text })), { text: 'EXPERIENCIA', fontSize: 13 }])).links

  it('does not take the halves of an e-mail for two links', () => {
    expect(links('lucja.oster@example.com')).toEqual([])
    expect(links('ada.lovelace@mail.example.co.uk', '+34 600 123 456')).toEqual([])
  })

  it('still finds a link on the e-mail\'s line, and one inside a sentence', () => {
    expect(links('ada@example.com · github.com/ada')).toEqual([{ label: 'GitHub', url: 'github.com/ada' }])
    expect(links('Portfolio en https://ada.dev/obra, con ejemplos.')).toEqual([{ label: 'Web', url: 'https://ada.dev/obra' }])
  })
})

describe('the contact details under the summary (spec 084)', () => {
  const summary = (...texts: string[]) =>
    assembleCV(analyze(doc([{ text: 'Ada Lovelace', fontSize: 22 }, { text: 'Resumen', fontSize: 15 }, ...texts.map((text) => ({ text })), { text: 'Competencias', fontSize: 15 }]))).summary

  it('leaves out the lines that are only the e-mail, phone, place or a link, as Freelance sets them', () => {
    expect(summary('Analista de sistemas,', 'con diez años de oficio.', 'ada@example.com', '+34 600 123 456', 'Valencia, España', 'github.com/ada')).toBe(
      'Analista de sistemas, con diez años de oficio.',
    )
    expect(summary('Analista de sistemas.', 'ada@example.com · github.com/ada')).toBe('Analista de sistemas.')
  })

  it('keeps a summary line that reads like a place, and leaves out the place of the card under it', () => {
    const draft = analyze(
      doc([
        { text: 'Ada Lovelace', fontSize: 22 },
        { text: 'Resumen', fontSize: 15 },
        ...['Analista de sistemas con oficio.', 'Datos, diseño y producto.', 'ada@example.com', '+34 600 123 456', 'Valencia, España'].map((text) => ({ text })),
        { text: 'Competencias', fontSize: 15 },
      ]),
    )
    expect(draft.location.value).toBe('Valencia, España')
    expect(assembleCV(draft).summary).toBe('Analista de sistemas con oficio. Datos, diseño y producto.')
  })

  it('keeps a sentence that names one of them', () => {
    expect(summary('Analista de sistemas.', 'Mi obra está en github.com/ada, escríbeme a ada@example.com.', 'github.com/ada')).toBe(
      'Analista de sistemas. Mi obra está en github.com/ada, escríbeme a ada@example.com.',
    )
  })
})

describe('text beside a heading, on its row (spec 084)', () => {
  const at = (text: string, y: number, x: number, fontSize = 10) => ({ text, y, x, end: x + text.length * fontSize * 0.5, fontSize })
  const cv = (...beside: Array<ReturnType<typeof at>>) =>
    assembleCV(
      analyze(
        doc([
          at('Ada Lovelace', 760, 50, 29),
          at('ada@example.com', 694, 140, 9),
          ...beside,
          at('Experiencia', 616, 50, 15.5),
          at('Analista — Cartograf 2022 - 2024', 598, 66),
        ]),
      ),
    )

  it('reads the text a little higher than the heading after it, as Retro\'s tab sets it', () => {
    // In reading order the text, 5 pt above a 21 pt "Resumen", comes before the heading.
    const imported = cv(at('Analista de sistemas con diez años de oficio.', 660, 190), at('Resumen', 655.2, 63, 21))
    expect(imported.summary).toBe('Analista de sistemas con diez años de oficio.')
    expect(imported.experience).toHaveLength(1)
  })

  it('keeps the text a little lower than the heading in its section', () => {
    expect(cv(at('Resumen', 660, 63, 21), at('Analista de sistemas.', 655, 190)).summary).toBe('Analista de sistemas.')
  })

  it('leaves a line above the heading\'s row where it is', () => {
    // 25 pt above a 21 pt heading: a line of the header, not of the heading's row.
    expect(cv(at('Disponible desde enero.', 680, 190), at('Analista de sistemas.', 660, 190), at('Resumen', 655.2, 63, 21)).summary).toBe(
      'Analista de sistemas.',
    )
  })

  it('leaves a line lower than the heading but read before it, another column\'s, where it is', () => {
    expect(cv(at('Disponible desde enero.', 650, 190), at('Resumen', 655.2, 63, 21), at('Analista de sistemas.', 640, 63)).summary).toBe(
      'Analista de sistemas.',
    )
  })

  it('leaves the section before\'s last line, close above the heading but not beside it, in its section', () => {
    expect(cv(at('Resumen', 690, 63, 21), at('Analista de sistemas.', 628, 63)).summary).toBe('Analista de sistemas.')
  })
})

describe('a headline that wraps in a narrow side column (spec 083)', () => {
  const at = (text: string, y: number, fontSize = 10.9, x = 394) => ({ text, x, y, fontSize, end: x + 160 })
  const headline = (...below: Array<ReturnType<typeof at>>) =>
    analyze(doc([at('Łucja Øster', 680, 27.6), at('Ingeniera de datos · “calidad” y', 629), ...below, at('IDIOMAS', 460)])).headline.value

  it('goes on in the line right under it, in its type and where it starts', () => {
    expect(headline(at('‘rigor’', 614.5))).toBe('Ingeniera de datos · “calidad” y ‘rigor’')
  })

  it('does not take in the contact details, a place, a smaller line or one set further down', () => {
    for (const line of [at('ada@example.com', 614.5), at('Valencia, España', 614.5), at('‘rigor’', 614.5, 9.5), at('‘rigor’', 590)]) {
      expect(headline(line)).toBe('Ingeniera de datos · “calidad” y')
    }
  })
})

describe('skills beside a circle with their initials (spec 083)', () => {
  const at = (text: string, x: number, y: number, fontSize = 9.5) => ({ text, x, y, fontSize, end: x + 120 })
  const assemble = (lines: Array<Partial<ExtractedLine> & { text: string }>) => assembleCV(analyze(doc(lines)))
  const skills = (cv: ReturnType<typeof assembleCV>) => cv.skills.map((g) => [g.category, g.items.map((i) => i.name)])

  it('leaves out the initials most of a section\'s lines start with', () => {
    const cv = assemble([
      at('Ada Lovelace', 40, 800, 22),
      at('COMPETENCIAS', 40, 760, 12),
      at('Lenguajes', 40, 740, 8.6),
      at('Ty TypeScript', 50, 720),
      at('Go Go', 214, 720),
      at('V3 Vue 3', 50, 696),
      at('CM CSS moderno', 214, 696),
      at('Diseño', 40, 672, 8.6),
      at('AI Adobe Illustrator', 50, 652),
      at('Ph Photoshop', 214, 652),
    ])
    expect(skills(cv)).toEqual([
      ['Lenguajes', ['TypeScript', 'Go', 'Vue 3', 'CSS moderno']],
      ['Diseño', ['Adobe Illustrator', 'Photoshop']],
    ])
  })

  it('keeps a short first word that is not the initials of a whole section', () => {
    const cv = assemble([at('Ada Lovelace', 40, 800, 22), at('COMPETENCIAS', 40, 760, 12), at('Go Gin', 40, 740), at('TypeScript', 40, 726), at('UX Research', 40, 712), at('Vue 3', 40, 698)])
    expect(skills(cv)).toEqual([['', ['Go Gin', 'TypeScript', 'UX Research', 'Vue 3']]])
  })
})

describe('capitals that are not headings (spec 040)', () => {
  it('keeps uppercase skills inside their section when the headings of the CV are not set in capitals', () => {
    const at = (text: string, y: number, fontSize = 10) => ({ text, y, fontSize })
    const draft = analyze(
      doc([
        at('Ada Lovelace', 800, 25),
        at('Profile', 760, 15),
        at('Mathematician.', 744),
        at('Skills', 700, 15),
        at('ALGORITHM DESIGN', 660),
        at('AGILE METHODOLOGIES', 620),
        at('DISTRIBUTED SYSTEMS', 580),
      ]),
    )
    expect(draft.sections.map((s) => s.kind)).toEqual(['summary', 'skills'])
    expect(draft.sections[1]!.lines.map((l) => l.text)).toEqual(['ALGORITHM DESIGN', 'AGILE METHODOLOGIES', 'DISTRIBUTED SYSTEMS'])
    expect(draft.unclassified).toEqual([])
  })
})

describe('the name from the PDF title (spec 040)', () => {
  const tracked = (title?: string) => analyze({ ...doc([{ text: 'ŁUCJAØSTER - ÑÚÑEZ', fontSize: 22, y: 800 }, { text: 'RESUMEN', y: 760 }, { text: 'Texto.', y: 746 }]), title })

  it('takes the spelling of the title when it has the same letters as the name set with letter-spacing', () => {
    expect(tracked('Łucja Øster-Ñúñez – CV').fullName).toEqual({ value: 'Łucja Øster-Ñúñez', confidence: 'high' })
    expect(tracked('Łucja Øster-Ñúñez').fullName.value).toBe('Łucja Øster-Ñúñez')
    expect(tracked('Łucja Øster-Ñúñez - Resume').fullName.value).toBe('Łucja Øster-Ñúñez')
  })

  it('ignores a title with other letters, and no title at all', () => {
    expect(tracked('Mi currículum de 2024').fullName.value).not.toBe('Mi currículum de 2024')
    expect(tracked(undefined).fullName.value).toBe('Łucjaøster - Ñúñez')
  })

  it('drops control and bidirectional characters from the title it adopts', () => {
    expect(tracked('‮Łucja Øster-Ñúñez\u0007 – CV').fullName.value).toBe('Łucja Øster-Ñúñez')
  })
})

describe('headings in ordinary case (spec 040)', () => {
  const at = (text: string, y: number, fontSize = 10, x = 45) => ({ text, y, fontSize, x })
  const page = () => [
    at('Ada Lovelace', 800, 22),
    at('Experiencia', 760, 10.5),
    at('Analista · Babbage mar 2020 - 2023', 740, 10.2),
    at('Escribió el primer programa.', 726),
    at('Formación', 690, 10.5),
    at('Matemáticas · Londres 2010 - 2014', 670, 10.2),
    at('Charlas', 630, 10.5),
    at('Una charla sobre máquinas', 610),
    at('Otra charla', 596),
  ]

  it('splits at a heading set like the known ones, so its lines are not read as education', () => {
    const draft = analyze(doc(page()))
    expect(draft.sections.find((s) => s.kind === 'education')!.lines).toHaveLength(1)
    expect(draft.unclassified.find((b) => b.heading === 'Charlas')!.lines).toEqual(['Una charla sobre máquinas', 'Otra charla'])
  })

  it('does not take a short line of the same size, right under another line, for a heading', () => {
    const lines = page()
    lines.splice(8, 0, at('Notas', 603, 10.5))
    lines.push(at('Una tercera charla', 582), at('Una cuarta charla', 568), at('Una quinta charla', 554), at('Una sexta charla', 540))
    const draft = analyze(doc(lines))
    expect(draft.unclassified.find((b) => b.heading === 'Notas')).toBeUndefined()
    expect(draft.unclassified.find((b) => b.heading === 'Charlas')!.lines).toContain('Notas')
  })

  it('does not take the title of an entry for a heading, though it is nearly as large and set apart', () => {
    const draft = analyze(doc([...page().slice(0, 4), at('Programador', 700, 10.2), at('Otra Co mar 2018 - 2019', 686, 10.2), at('Formación', 650, 10.5), at('Matemáticas · Londres 2010 - 2014', 630, 10.2)]))
    expect(draft.unclassified.filter((b) => b.heading)).toEqual([])
  })
})

describe('the name of a CV titled with more than the name (spec 040)', () => {
  const named = (title: string) => analyze({ ...doc([{ text: 'ADA DE LOVELACE', fontSize: 22, y: 800 }, { text: 'RESUMEN', y: 760 }, { text: 'Texto.', y: 746 }]), title })

  it('takes the part of the title that spells the name', () => {
    expect(named('CV – Ada de Lovelace – 2024').fullName.value).toBe('Ada de Lovelace')
    expect(named('Ada de Lovelace | Matemática').fullName.value).toBe('Ada de Lovelace')
  })

  it('keeps the page spelling when no part of the title is the name', () => {
    expect(named('Currículum 2024').fullName.value).toBe('Ada De Lovelace')
  })
})

describe('the headline under the name (spec 040)', () => {
  it('is the line under the name in its own column, not the contact details beside it', () => {
    const at = (text: string, x: number, y: number, fontSize = 10) => ({ text, x, y, fontSize, end: x + 150 })
    const draft = analyze(
      doc([
        at('Ada Lovelace', 45, 800, 22),
        at('ada@example.com', 459, 790, 8),
        at('Londres, Reino Unido', 459, 778, 8),
        at('Matemática y programadora', 45, 770),
        at('RESUMEN', 45, 730, 9),
        at('Texto.', 45, 716),
      ]),
    )
    expect(draft.headline.value).toBe('Matemática y programadora')
  })

  it('does not take the name line for the headline when the name was spelled from the title', () => {
    const draft = analyze({ ...doc([{ text: 'ADA LOVELACE', fontSize: 22, y: 800 }, { text: 'Matemática', y: 780 }, { text: 'RESUMEN', y: 740 }, { text: 'Texto.', y: 726 }]), title: 'Ada Lovelace – CV' })
    expect(draft.fullName.value).toBe('Ada Lovelace')
    expect(draft.headline.value).toBe('Matemática')
  })
})

describe('headings as bold as the text (spec 040)', () => {
  const at = (text: string, y: number, extra: Partial<ExtractedLine> = {}) => ({ text, y, fontSize: 10, ...extra })
  const bold = { bold: true }
  const page = (extra: Array<Partial<ExtractedLine> & { text: string }> = []) =>
    doc([
      at('Ada Lovelace', 830, { fontSize: 22, bold: true }),
      at('Experiencia', 800, bold),
      at('Analista de sistemas en Babbage Co', 784),
      at('Escribió el primer programa.', 770),
      at('Tradujo notas sobre la máquina.', 756),
      at('Formó a tres personas.', 742),
      at('Diseñó un método de cálculo.', 728),
      at('Formación', 690, bold),
      at('Matemáticas, Universidad de Londres', 674),
      at('Premios', 634, bold),
      at('Medalla de oro de la sociedad', 618),
      at('Otro reconocimiento', 604),
      ...extra,
    ])

  it('finds a heading that is only set apart and bold like the known ones, when little of the text is bold', () => {
    const draft = analyze(page())
    expect(draft.unclassified.find((b) => b.heading === 'Premios')!.lines).toEqual(['Medalla de oro de la sociedad', 'Otro reconocimiento'])
    expect(draft.sections.find((s) => s.kind === 'education')!.lines).toHaveLength(1)
  })

  it('does not take a bold title followed by its dates for a heading', () => {
    const draft = analyze(page([at('Jefa de proyecto', 560, bold), at('Babbage Co · mar 2020 - 2023', 546)]))
    expect(draft.unclassified.find((b) => b.heading === 'Jefa de proyecto')).toBeUndefined()
    expect(draft.unclassified.find((b) => b.heading === 'Premios')).toBeDefined()
  })

  it('does not take a bold line that is not set apart as much as the headings are', () => {
    const draft = analyze(page([at('Otro título', 576, bold), at('Texto de debajo.', 562)]))
    expect(draft.unclassified.find((b) => b.heading === 'Otro título')).toBeUndefined()
    expect(draft.unclassified.find((b) => b.heading === 'Premios')).toBeDefined()
  })

  it('does not take a line that is set apart like a heading but is not bold like one', () => {
    const draft = analyze(page([at('Notas sueltas', 560), at('Texto de debajo.', 546)]))
    expect(draft.unclassified.find((b) => b.heading === 'Notas sueltas')).toBeUndefined()
    expect(draft.unclassified.find((b) => b.heading === 'Premios')).toBeDefined()
  })

  it('finds such a heading when it is set apart as the known ones are', () => {
    const draft = analyze(page([at('Idiomas extra', 560, bold), at('Texto de debajo.', 546)]))
    expect(draft.unclassified.find((b) => b.heading === 'Idiomas extra')).toBeDefined()
  })

  it('does nothing when most of the text is bold, since weight then tells nothing', () => {
    const lines = page().lines.map((line) => ({ ...line, bold: true }))
    expect(analyze({ ...page(), lines }).unclassified.find((b) => b.heading === 'Premios')).toBeUndefined()
  })
})

describe('a large name on two lines, and a title broken at its hyphen (spec 081)', () => {
  const lines = (name: Array<Partial<ExtractedLine> & { text: string }>) =>
    doc([
      ...name,
      { text: 'Ingeniera de datos', fontSize: 16, y: 690 },
      { text: 'lucja.oster@example.com', y: 670 },
      { text: 'EXPERIENCIA', fontSize: 15, y: 640 },
      { text: 'Desarrolladora Full-', fontSize: 11, y: 620 },
      { text: 'Stack', fontSize: 11, y: 607 },
      { text: 'sep 2019 – feb 2022', y: 594 },
      { text: 'Estudio Nube · Valencia', y: 580 },
      { text: 'FORMACIÓN', fontSize: 15, y: 550 },
      { text: 'Grado en Informática', fontSize: 11, y: 530 },
      { text: 'sep 2014 – jun 2018', y: 517 },
    ])

  it('joins the second line of the name, without a space after a hyphen, and keeps the headline', () => {
    const draft = analyze(lines([{ text: 'Łucja Øster-', fontSize: 30, y: 745 }, { text: 'Ñúñez', fontSize: 30, y: 714 }]))
    expect(draft.fullName.value).toBe('Łucja Øster-Ñúñez')
    expect(draft.headline.value).toBe('Ingeniera de datos')
  })

  it('joins words a line apart with a space, and leaves a line in other type alone', () => {
    expect(analyze(lines([{ text: 'Carol', fontSize: 30, y: 745 }, { text: 'Ronals Vega', fontSize: 30, y: 714 }])).fullName.value).toBe('Carol Ronals Vega')
    expect(analyze(lines([{ text: 'Carol Ronals', fontSize: 30, y: 745 }, { text: 'Freelance', fontSize: 20, y: 714 }])).fullName.value).toBe('Carol Ronals')
  })

  it('reads "Stack" under "Full-" as the end of the title, not as a section of skills', () => {
    const draft = analyze(lines([{ text: 'Łucja Øster-Ñúñez', fontSize: 30, y: 745 }]))
    expect(draft.sections.map((section) => section.kind)).toEqual(['experience', 'education'])
  })
})
