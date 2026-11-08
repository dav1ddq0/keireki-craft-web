// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSampleCV } from '@/core/sample'
import { createEmptyCV } from '@/core/factory'
import Freelance from '@/templates/freelance/Template.vue'

const source = readFileSync('src/templates/freelance/Template.vue', 'utf8')
const rule = (selector: string) => new RegExp(`(^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(source)?.[2] ?? ''

describe('Freelance (spec 081)', () => {
  it('puts the summary with the contact, skills and languages on the left, the rest on the right', () => {
    const wrapper = mount(Freelance, { props: { data: createSampleCV() } })
    const kinds = (selector: string) => wrapper.find(selector).findAll('[data-section]').map((el) => el.attributes('data-section'))
    expect(kinds('aside')).toEqual(['summary', 'skills', 'languages'])
    expect(kinds('main')).toEqual(expect.arrayContaining(['experience', 'education', 'custom']))
    expect(kinds('main')).not.toContain('summary')
    const summary = wrapper.find('[data-section="summary"]')
    expect(summary.find('.contact--main').text()).toContain('@')
  })

  it('keeps the contact in a card of its own when there is no summary', () => {
    const data = createSampleCV()
    data.summary = ''
    const wrapper = mount(Freelance, { props: { data } })
    expect(wrapper.find('aside [data-section="contact"] .contacts').exists()).toBe(true)
    expect(wrapper.find('[data-section="summary"]').exists()).toBe(false)
  })

  it('sets every section in a card with a border and a hard shadow, the header across the page', () => {
    const wrapper = mount(Freelance, { props: { data: createSampleCV() } })
    expect(wrapper.findAll('[data-section]').every((section) => section.classes('card'))).toBe(true)
    expect(wrapper.find('header.card.head').exists()).toBe(true)
    expect(rule('.card')).toMatch(/border:\s*var\(--line\) solid/)
    // A hard shadow: offset, no blur.
    expect(rule('.card')).toMatch(/box-shadow:\s*var\(--lift\) var\(--lift\) 0 0/)
  })

  it('shows the photo in black and white with the ring behind it, and neither without a photo', () => {
    const data = createSampleCV()
    data.personal.photo = 'data:image/png;base64,AAAA'
    const withPhoto = mount(Freelance, { props: { data } })
    expect(withPhoto.find('.head img.photo').exists()).toBe(true)
    // Before the photo in the markup: the direct PDF paints in document order.
    expect(withPhoto.html().indexOf('class="ring"')).toBeLessThan(withPhoto.html().indexOf('class="photo"'))
    expect(rule('.photo')).toMatch(/filter:\s*grayscale\(1\)/)

    data.personal.photo = ''
    const without = mount(Freelance, { props: { data } })
    expect(without.find('.photo').exists()).toBe(false)
    expect(without.find('.ring').exists()).toBe(false)
  })

  it('leaves no header, name or headline behind on an empty CV, and draws the corner patch first', () => {
    const wrapper = mount(Freelance, { props: { data: createEmptyCV() } })
    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.find('.headline').exists()).toBe(false)
    expect(wrapper.find('article').element.firstElementChild?.classList.contains('patch')).toBe(true)
  })

  it('lays experience, education and custom entries two by two', () => {
    const data = createSampleCV()
    data.experience = [0, 1, 2].map((n) => ({ ...data.experience[0]!, id: `e${n}`, position: `Puesto ${n}` }))
    const wrapper = mount(Freelance, { props: { data } })
    const pairs = wrapper.find('[data-section="experience"]').findAll('.pair')
    expect(pairs.map((pair) => pair.findAll('.entry-title').map((t) => t.text()))).toEqual([['Puesto 0', 'Puesto 1'], ['Puesto 2']])
    expect(wrapper.find('[data-section="education"] .pair .entry').exists()).toBe(true)
    expect(wrapper.find('[data-section="custom"] .pair .entry').exists()).toBe(true)
    expect(rule('.pair')).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/)
    expect(rule('.pair')).toMatch(/break-inside:\s*avoid/)
  })

  it('draws a skill level as a bar, a skill without one by name, and a group without levels on one line', () => {
    const data = createSampleCV()
    data.skills = [
      { id: 'a', category: 'Software', items: [{ name: 'Figma', level: 4 }, { name: 'Vue' }] },
      { id: 'b', category: '', items: [{ name: 'Git' }, { name: 'Docker' }] },
    ]
    const skills = mount(Freelance, { props: { data } }).find('[data-section="skills"]')
    expect(skills.find('.title').text()).toBe('Competencias')
    expect(skills.findAll('.skill-category').map((c) => c.text())).toEqual(['Software'])
    const rows = skills.findAll('.level-row')
    expect(rows.map((row) => row.find('.level-name').text())).toEqual(['Figma', 'Vue'])
    expect(rows[0]!.find('.bar-fill').attributes('style')).toContain('width: 80%')
    expect(rows[1]!.find('.bar').exists()).toBe(false)
    expect(skills.find('.skill-items').text()).toBe('Git · Docker')
    const size = /\.skill-category\s*\{[^}]*font-size:\s*([\d.]+)em/.exec(source)?.[1]
    expect(Number(size)).toBeLessThan(1)
  })

  it('gives a language a bar only for a level it recognises, and its level as written', () => {
    const data = createSampleCV()
    data.languages = [
      { id: 'a', name: 'Español', level: 'Nativo' },
      { id: 'b', name: 'Inglés', level: 'Conversación fluida en reuniones' },
    ]
    const rows = mount(Freelance, { props: { data } }).findAll('[data-section="languages"] .lang-row')
    expect(rows[0]!.find('.bar').exists()).toBe(true)
    expect(rows[0]!.find('.lang-level').text()).toBe('Nativo')
    expect(rows[1]!.find('.bar').exists()).toBe(false)
    expect(rows[1]!.find('.lang-level').text()).toBe('Conversación fluida en reuniones')
  })

  it('sets the name and titles in Dela Gothic One at its one weight, the rest in the chosen font', () => {
    expect(source).toMatch(/--display:\s*'Dela Gothic One'/)
    for (const selector of ['.name', '.title']) {
      expect(rule(selector)).toMatch(/font-family:\s*var\(--display\)/)
      expect(rule(selector)).toMatch(/font-weight:\s*400/)
    }
    expect(rule('.freelance')).toMatch(/font-family:\s*var\(--cv-font\)/)
  })

  it('repeats the paper on every page in the one box the direct PDF draws first, and keeps split cards boxed', () => {
    expect(source).toMatch(/\.freelance\[data-split-from\]::before\s*\{\s*content:\s*''\s*!important/)
    expect(source).not.toMatch(/::after/)
    expect(rule('.card[data-split-from]')).toMatch(/padding-top:\s*var\(--pad\) !important/)
    expect(rule('.card[data-split-to]')).toMatch(/padding-bottom:\s*var\(--pad\) !important/)
    expect(rule('.card:not(:has(> *))')).toMatch(/display:\s*none/)
  })
})
