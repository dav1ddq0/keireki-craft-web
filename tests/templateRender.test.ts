// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { templates } from '@/templates/registry'
import { createSampleCV } from '@/core/sample'
import { createEmptyCV } from '@/core/factory'

/**
 * Renders every registered template against both a full CV and an empty one.
 * The empty case is the one that bites in practice: a template that assumes
 * `experience[0]` exists looks fine in development and breaks on a new document.
 */
describe.each(templates)('$name renders', (definition) => {
  it('shows the sample data', async () => {
    const component = await definition.component()
    const wrapper = mount(component as any, { props: { data: createSampleCV() } })

    expect(wrapper.text()).toContain('Nadia Martín Reyes')
    expect(wrapper.text()).toContain('Cartograf')
    expect(wrapper.text()).toContain('TypeScript')
    expect(wrapper.find('a[href^="https://"]').exists()).toBe(true)
  })

  it('marks every section with its kind, so the preview can outline it (spec 019)', async () => {
    const component = await definition.component()
    const wrapper = mount(component as any, { props: { data: createSampleCV() } })
    const kinds = wrapper.findAll('[data-section]').map((el) => el.attributes('data-section'))
    expect(kinds).toEqual(expect.arrayContaining(['summary', 'experience', 'education', 'skills', 'languages', 'custom']))
  })

  it('starts a flagged main-column section on a new page, never a sidebar one (spec 022)', async () => {
    const component = await definition.component()
    const data = createSampleCV()
    data.pageBreaks = ['education', 'skills', 'languages']
    const wrapper = mount(component as any, { props: { data } })

    const flagged = wrapper.findAll('[data-page-break]').map((el) => el.attributes('data-section'))
    // Amber keeps education in its side column (spec 071); its skills are in the main one.
    const sideEducation = ['amber']
    expect(flagged).toContain(sideEducation.includes(definition.id) ? 'skills' : 'education')
    expect(flagged.includes('education')).toBe(!sideEducation.includes(definition.id))
    // These templates put languages in a sidebar, aside or block row; a break there would push the main column.
    const twoColumn = ['amber', 'aurora', 'banner', 'chevron', 'cobalt', 'facet', 'frame', 'harbor', 'meridian', 'modern', 'monogram', 'retro', 'freelance']
    expect(flagged.includes('languages')).toBe(!twoColumn.includes(definition.id))
  })

  it('survives a completely empty CV', async () => {
    const component = await definition.component()
    const wrapper = mount(component as any, { props: { data: createEmptyCV() } })

    // No content means no headings: an empty document must not print stray titles.
    expect(wrapper.findAll('h2').length).toBeLessThanOrEqual(1)
  })

  it('applies the accent color as a CSS variable', async () => {
    const data = createEmptyCV()
    data.style.accentColor = '#ff0000'
    const component = await definition.component()
    const wrapper = mount(component as any, { props: { data } })

    expect(wrapper.attributes('style')).toContain('--cv-accent: #ff0000')
  })

  it('prints the optional personal data only when it is filled', async () => {
    const component = await definition.component()
    const empty = createSampleCV()
    const bare = mount(component as any, { props: { data: empty } }).text()
    expect(bare).not.toMatch(/Nacimiento|Nacionalidad|Carné de conducir|Estado civil/)

    const filled = createSampleCV()
    Object.assign(filled.personal, {
      birthDate: '1992-03-12',
      birthPlace: 'Valencia',
      nationality: 'Española',
      drivingLicense: 'B',
      maritalStatus: 'single',
    })
    const text = mount(component as any, { props: { data: filled } }).text()
    expect(text).toContain('Nacimiento: 12 mar 1992, Valencia')
    expect(text).toContain('Nacionalidad: Española')
    expect(text).toContain('Carné de conducir: B')
    expect(text).toContain('Estado civil: Soltero/a')
  })
})
