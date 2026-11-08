// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSampleCV } from '@/core/sample'
import { createEmptyCV } from '@/core/factory'
import Minimalist from '@/templates/minimalist/Template.vue'
import { initials } from '@/templates/minimalist/initials'

const source = readFileSync('src/templates/minimalist/Template.vue', 'utf8')
const rule = (selector: string) => new RegExp(`(^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(source)?.[2] ?? ''

describe('Minimalist (spec 083)', () => {
  it('puts photo, name, contact and languages in the side column on the right, the rest in the main one', () => {
    const data = createSampleCV()
    data.personal.photo = 'data:image/png;base64,AAAA'
    const wrapper = mount(Minimalist, { props: { data } })
    const kinds = (selector: string) => wrapper.find(selector).findAll('[data-section]').map((el) => el.attributes('data-section'))
    expect(kinds('aside')).toEqual(['contact', 'languages'])
    expect(kinds('main')).toEqual(expect.arrayContaining(['summary', 'experience', 'education', 'skills', 'custom']))
    expect(wrapper.find('aside .identity img.photo').exists()).toBe(true)
    expect(wrapper.find('aside h1.name').text()).toBe(data.personal.fullName)
    // The side column first in the markup, placed on the right.
    expect(wrapper.find('article').element.firstElementChild?.tagName).toBe('ASIDE')
    expect(rule('.minimalist')).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) var\(--side\)/)
    expect(rule('.side')).toMatch(/grid-column:\s*2/)
    expect(rule('.main')).toMatch(/grid-column:\s*1/)
  })

  it('shows the photo in a circle, and leaves nothing behind without photo, name or headline', () => {
    expect(rule('.photo')).toMatch(/border-radius:\s*50%/)
    const data = createSampleCV()
    data.personal.photo = ''
    const without = mount(Minimalist, { props: { data } })
    expect(without.find('.photo').exists()).toBe(false)
    expect(without.find('.name').exists()).toBe(true)

    const empty = mount(Minimalist, { props: { data: createEmptyCV() } })
    expect(empty.find('.identity').exists()).toBe(false)
    expect(empty.find('h1').exists()).toBe(false)
    expect(empty.find('[data-section]').exists()).toBe(false)
  })

  it('sets the side titles on a band of the main paper, and the links in Contact with label and address', () => {
    const data = createSampleCV()
    const wrapper = mount(Minimalist, { props: { data } })
    const contact = wrapper.find('[data-section="contact"]')
    expect(contact.find('h2.band').text()).toBe('Contacto')
    expect(contact.findAll('.contact svg.icon').length).toBeGreaterThan(0)
    const links = contact.findAll('.link')
    expect(links.map((link) => link.find('.link-label').text())).toEqual(['LinkedIn', 'GitHub'])
    expect(links[0]!.find('a.link-url').text()).toContain('linkedin.com/in/')
    expect(wrapper.find('[data-section="languages"] h2').classes()).toContain('band')
    expect(rule('.band')).toMatch(/background:\s*var\(--paper\)/)
  })

  it('lays education two by two, experience with its squares and custom sections on a timeline', () => {
    const data = createSampleCV()
    data.education = [0, 1, 2].map((n) => ({ ...data.education[0]!, id: `d${n}`, degree: `Título ${n}` }))
    const wrapper = mount(Minimalist, { props: { data } })
    const pairs = wrapper.find('[data-section="education"]').findAll('.pair')
    expect(pairs.map((pair) => pair.findAll('.entry-title').map((t) => t.text()))).toEqual([['Título 0', 'Título 1'], ['Título 2']])
    expect(rule('.pair')).toMatch(/column-gap:\s*2\.4em/)
    expect(rule('.pair')).toMatch(/break-inside:\s*avoid/)

    const jobs = wrapper.find('[data-section="experience"]').findAll('.entry')
    expect(jobs.length).toBe(data.experience.length)
    expect(jobs.every((job) => job.find('.square').exists())).toBe(true)

    const custom = wrapper.find('[data-section="custom"] .timeline')
    expect(custom.findAll('.tl-entry .tl-square').length).toBe(data.customSections[0]!.entries.length)
    expect(rule('.timeline')).toMatch(/border-left:/)
  })

  it('draws every skill with a circle and its initials, a bar only where a level is given', () => {
    const data = createSampleCV()
    data.skills = [
      { id: 'a', category: 'Diseño', items: [{ name: 'Adobe Illustrator', level: 4 }, { name: 'Figma' }] },
      { id: 'b', category: '', items: [{ name: 'Git' }] },
    ]
    const skills = mount(Minimalist, { props: { data } }).find('[data-section="skills"]')
    expect(skills.findAll('.skill-category').map((c) => c.text())).toEqual(['Diseño'])
    const rows = skills.findAll('.skill')
    expect(rows.map((row) => row.find('.circle').text())).toEqual(['AI', 'Fi', 'Gi'])
    expect(rows.every((row) => row.find('.circle').attributes('aria-hidden') === 'true')).toBe(true)
    expect(rows.map((row) => row.find('.skill-name').text())).toEqual(['Adobe Illustrator', 'Figma', 'Git'])
    expect(rows[0]!.find('.bar-fill').attributes('style')).toContain('width: 80%')
    expect(rows[1]!.find('.bar').exists()).toBe(false)
    expect(rule('.skills')).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/)
    expect(rule('.circle')).toMatch(/background:\s*var\(--cv-accent\)/)
    expect(rule('.circle')).toMatch(/color:\s*var\(--cv-on-accent\)/)
    const size = /\.skill-category\s*\{[^}]*font-size:\s*([\d.]+)em/.exec(source)?.[1]
    expect(Number(size)).toBeLessThan(1)
  })

  it('gives a language a bar only for a level it recognises, and its level as written', () => {
    const data = createSampleCV()
    data.languages = [
      { id: 'a', name: 'Español', level: 'Nativo' },
      { id: 'b', name: 'Inglés', level: 'Conversación fluida en reuniones' },
    ]
    const rows = mount(Minimalist, { props: { data } }).findAll('[data-section="languages"] .lang-row')
    expect(rows[0]!.find('.bar').exists()).toBe(true)
    expect(rows[0]!.find('.lang-level').text()).toBe('Nativo')
    expect(rows[1]!.find('.bar').exists()).toBe(false)
    expect(rows[1]!.find('.lang-level').text()).toBe('Conversación fluida en reuniones')
  })

  it('sets the titles in Montserrat capitals, the name in italic and the rest in the chosen font', () => {
    expect(source).toMatch(/--titles:\s*'Montserrat'/)
    for (const selector of ['.title', '.band']) {
      expect(rule(selector)).toMatch(/font-family:\s*var\(--titles\)/)
      expect(rule(selector)).toMatch(/text-transform:\s*uppercase/)
    }
    expect(rule('.name')).toMatch(/font-style:\s*italic/)
    expect(rule('.name')).not.toMatch(/font-family/)
    expect(rule('.minimalist')).toMatch(/font-family:\s*var\(--cv-font\)/)
  })

  it('paints both papers from the accent in one box that repeats on every page', () => {
    expect(rule('.minimalist')).toMatch(/--paper:\s*color-mix\(in srgb, var\(--cv-accent\) 14%, #fff\)/)
    expect(rule('.minimalist')).toMatch(/--side-bg:\s*color-mix\(in srgb, var\(--cv-accent\) 26%, #fff\)/)
    expect(rule('.minimalist::before')).toMatch(/border-right:\s*var\(--side\) solid var\(--side-bg\)/)
    expect(rule('.minimalist::before')).toMatch(/height:\s*297mm/)
    expect(source).toMatch(/\.minimalist\[data-split-from\]::before\s*\{\s*content:\s*''\s*!important/)
    expect(rule('.minimalist[data-split-from]')).toMatch(/padding-top:\s*var\(--cv-page-margin\) !important/)
    expect(source).not.toMatch(/::after/)
  })
})

describe('a skill\'s initials (spec 083)', () => {
  it.each([
    ['Adobe Illustrator', 'AI'],
    ['Photoshop', 'Ph'],
    ['Vue 3', 'V3'],
    ['SQL', 'SQ'],
    ['C++', 'C'],
    ['Node.js', 'No'],
    ['  gestión de proyectos ', 'GP'],
    ['Diseño y UX', 'DU'],
    ['Go 1', 'G1'],
    ['Ñandú', 'Ña'],
    ['日本語', '日本'],
    ['', ''],
    ['++', ''],
  ])('%s → %s', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})
