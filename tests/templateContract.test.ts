import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatDateRange, formatPartialDate, resolveSections, styleVars } from '@/templates/shared'
import { createEmptyCV } from '@/core/factory'

const TEMPLATES_DIR = join(process.cwd(), 'src/templates')

const templateDirs = readdirSync(TEMPLATES_DIR).filter((entry) =>
  statSync(join(TEMPLATES_DIR, entry)).isDirectory(),
)

/**
 * The spec's own mitigation for "templates accumulate logic and break the
 * contract" (§13) is a review that no template touches the store or mutates its
 * data. Encoding it as a test means the review happens on every commit.
 */
describe.each(templateDirs)('template contract: %s', (dir) => {
  const source = readFileSync(join(TEMPLATES_DIR, dir, 'Template.vue'), 'utf8')

  it('declares exactly one prop, `data`', () => {
    const props = source.match(/defineProps<\{([^}]*)\}>/)?.[1] ?? ''
    expect(props.replace(/\s/g, '')).toBe('data:CVData')
  })

  it('never imports a store', () => {
    expect(source).not.toMatch(/from\s+'@\/stores/)
    expect(source).not.toMatch(/useCvStore|useUiStore|pinia/)
  })

  it('never imports the export pipeline (paged.js must stay encapsulated)', () => {
    expect(source).not.toMatch(/from\s+'@\/services/)
    expect(source).not.toMatch(/pagedjs/)
  })

  it('does not mutate the incoming data', () => {
    expect(source).not.toMatch(/props\.data\.\w+\s*=/)
    expect(source).not.toMatch(/data\.\w+\.(push|splice|sort|reverse)\(/)
  })

  it('takes colors and fonts from CSS variables only', () => {
    const styles = source.slice(source.indexOf('<style'))
    const hardcodedAccent = styles.match(/(?:color|background|border-color):\s*#[0-9a-f]{3,8}/gi) ?? []
    // Neutral ink and paper are allowed; anything themed must come from a token.
    const forbidden = hardcodedAccent.filter(
      (rule) => !/#(fff|ffffff|1a1a1a|111|000|444|555|666|999|ccc|d1d5db|9ca3af|1f2937)\b/i.test(rule),
    )
    expect(forbidden).toEqual([])
    expect(styles).toMatch(/var\(--cv-accent\)/)
    expect(styles).toMatch(/var\(--cv-font\)/)
  })

  it('protects entries from page breaks', () => {
    expect(source).toMatch(/break-inside:\s*avoid/)
  })
})

/**
 * Tests that walk the registry (palette names, contrast, rendering) only see what its
 * `import.meta.glob` found. A stale Vitest module cache once kept a new template out of it locally,
 * so those tests passed here and failed in CI; this names the template that is missing.
 */
describe('template registry', () => {
  it('registers every template folder, under the folder name', async () => {
    const { templates } = await import('@/templates/registry')
    const folders = templateDirs.filter((dir) => existsSync(join(TEMPLATES_DIR, dir, 'index.ts')))
    expect(templates.map((t) => t.id).sort()).toEqual(folders.sort())
  })
})

describe('shared template helpers', () => {
  it('renders partial dates in the CV content language', () => {
    expect(formatPartialDate('2023-04', 'es')).toBe('abr 2023')
    expect(formatPartialDate('2023-04', 'en')).toBe('Apr 2023')
    expect(formatPartialDate('2023', 'en')).toBe('2023')
  })

  it('renders a null end date as "present"', () => {
    expect(formatDateRange('2020-01', null, 'en')).toBe('Jan 2020 – Present')
    expect(formatDateRange('2020-01', null, 'es')).toBe('ene 2020 – Actualidad')
  })

  it('renders an empty end date as the start alone, without a dangling dash', () => {
    expect(formatDateRange('2020-01', '', 'en')).toBe('Jan 2020')
    expect(formatDateRange('', '', 'en')).toBe('')
  })

  it('exposes style tokens as CSS variables', () => {
    const cv = createEmptyCV()
    expect(styleVars(cv.style)).toMatchObject({ '--cv-accent': cv.style.accentColor })
  })

  it('skips sections with no content so no empty heading is printed', () => {
    const cv = createEmptyCV()
    expect(resolveSections(cv)).toEqual([])

    cv.summary = 'Hola'
    expect(resolveSections(cv).map((s) => s.id)).toEqual(['summary'])
  })

  it('honours a custom section order', () => {
    const cv = createEmptyCV()
    cv.summary = 'Hola'
    cv.languages = [{ id: 'l1', name: 'Español', level: 'Nativo' }]
    cv.sectionOrder = ['languages', 'summary']

    expect(resolveSections(cv).map((s) => s.id)).toEqual(['languages', 'summary'])
  })

  it('flags the sections that start on a new page (spec 022)', () => {
    const cv = createEmptyCV()
    cv.summary = 'Hola'
    cv.languages = [{ id: 'l1', name: 'Español', level: 'Nativo' }]
    cv.pageBreaks = ['languages']

    expect(resolveSections(cv).map((s) => [s.id, s.breakBefore ?? false])).toEqual([
      ['summary', false],
      ['languages', true],
    ])
  })
})
