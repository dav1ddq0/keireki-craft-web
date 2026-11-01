import { describe, expect, it } from 'vitest'
import { createSampleCV } from '@/core/sample'
import { LOCALES } from '@/i18n'
import { CV_LANGUAGES } from '@/core/stylePresets'
import { isSectionHeading } from '@/services/pdfImport/patterns'

/** The shape of a sample: what each section holds, not what it says. */
function shape(locale: (typeof LOCALES)[number]) {
  const cv = createSampleCV(locale)
  return {
    links: cv.personal.links.length,
    experience: cv.experience.map((e) => [e.startDate, e.endDate, e.highlights.length]),
    education: cv.education.map((e) => [e.startDate, e.endDate]),
    skills: cv.skills.map((g) => g.items.map((i) => i.level ?? null)),
    languages: cv.languages.length,
    custom: cv.customSections.map((s) => s.entries.length),
    order: cv.sectionOrder.length,
  }
}

/** The prose of a sample, where a line left in Spanish would show. */
function prose(locale: (typeof LOCALES)[number]) {
  const cv = createSampleCV(locale)
  return [
    cv.meta.title,
    cv.personal.fullName,
    cv.personal.headline,
    cv.summary,
    ...cv.experience.flatMap((e) => [e.position, e.description, ...e.highlights]),
    ...cv.education.flatMap((e) => [e.degree, e.description]),
    cv.skills[0]!.category,
    ...cv.languages.map((l) => l.name),
    ...cv.customSections.flatMap((s) => [s.title, ...s.entries.flatMap((e) => [e.title, e.description])]),
  ]
}

describe('sample CV in the interface language (spec 059)', () => {
  it('keeps the Spanish sample as it was', () => {
    const cv = createSampleCV()
    expect(cv.personal.fullName).toBe('Nadia Martín Reyes')
    expect(cv.meta.language).toBe('es')
    expect(createSampleCV('es').summary).toBe(cv.summary)
  })

  it.each(LOCALES.filter((l) => l !== 'es'))('%s: a local person, the same shape, the CV in that language, nothing left in Spanish', (locale) => {
    const cv = createSampleCV(locale)
    expect(CV_LANGUAGES.map((l) => l.code)).toContain(locale)
    expect(cv.meta.language).toBe(locale)
    expect(shape(locale)).toEqual(shape('es'))
    const spanish = new Set(prose('es'))
    for (const text of prose(locale)) expect(spanish.has(text), text).toBe(false)
    expect(cv.personal.email).toMatch(/@example\.com$/)
  })

  it.each(LOCALES)('%s: no skill group is called like a section, which an import would split there', (locale) => {
    for (const group of createSampleCV(locale).skills) expect(isSectionHeading(group.category), group.category).toBe(false)
  })
})
