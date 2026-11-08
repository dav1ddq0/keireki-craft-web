// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSampleCV } from '@/core/sample'
import { createEmptyCV } from '@/core/factory'
import { greeting } from '@/templates/retro/greeting'
import Retro from '@/templates/retro/Template.vue'

const source = readFileSync('src/templates/retro/Template.vue', 'utf8')

describe('Retro (spec 080)', () => {
  it('greets in the CV’s language over the whole name', () => {
    const data = createSampleCV()
    const wrapper = mount(Retro, { props: { data } })
    expect(wrapper.find('.greeting').text()).toBe('¡Hola! Soy')
    expect(wrapper.find('h1.name').text()).toBe('Nadia Martín Reyes')
    // Before the name in the text, so a PDF import meets it as its own line.
    expect(wrapper.html().indexOf('greeting')).toBeLessThan(wrapper.html().indexOf('class="name"'))
    expect(greeting('en')).toBe("Hello! I'm")
    expect(greeting('fr')).toBe('Bonjour ! Je suis')
    expect(greeting('xx')).toBe('¡Hola! Soy')
  })

  it('leaves no greeting, name or empty tab without a name or headline', () => {
    const wrapper = mount(Retro, { props: { data: createEmptyCV() } })
    expect(wrapper.find('.greeting').exists()).toBe(false)
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.find('.headline').exists()).toBe(false)
  })

  it('puts the summary in the band, skills and languages at the side, the rest in the main column', () => {
    const wrapper = mount(Retro, { props: { data: createSampleCV() } })
    const kinds = (selector: string) => wrapper.find(selector).findAll('[data-section]').map((el) => el.attributes('data-section'))
    expect(wrapper.find('.band').attributes('data-section')).toBe('summary')
    expect(kinds('aside')).toEqual(['skills', 'languages'])
    expect(kinds('main')).toEqual(expect.arrayContaining(['experience', 'education', 'custom']))
    expect(kinds('main')).not.toContain('summary')
    expect(kinds('main')).not.toContain('skills')
  })

  it('has no band without a summary', () => {
    const data = createSampleCV()
    data.summary = ''
    expect(mount(Retro, { props: { data } }).find('.band').exists()).toBe(false)
  })

  it('shows the photo in its ring with the pointer, and neither without a photo', () => {
    const data = createSampleCV()
    data.personal.photo = 'data:image/png;base64,AAAA'
    const withPhoto = mount(Retro, { props: { data } })
    expect(withPhoto.find('.photo-ring img.photo').exists()).toBe(true)
    expect(withPhoto.find('.pointer').exists()).toBe(true)

    data.personal.photo = ''
    const without = mount(Retro, { props: { data } })
    expect(without.find('.photo-ring').exists()).toBe(false)
    expect(without.find('.pointer').exists()).toBe(false)
  })

  it('hangs the skills under a tab with the section’s title, each group named a little smaller than its skills', () => {
    const data = createSampleCV()
    data.skills = [
      { id: 'a', category: 'Software', items: [{ name: 'Figma', level: 4 }, { name: 'Vue' }] },
      { id: 'b', category: '', items: [{ name: 'Git' }] },
    ]
    const wrapper = mount(Retro, { props: { data } })
    const skills = wrapper.find('[data-section="skills"]')
    // The section's title is what a PDF import finds the skills by.
    expect(skills.findAll('.tab').map((tab) => tab.text())).toEqual(['Competencias'])
    expect(skills.findAll('.skill-category').map((c) => c.text())).toEqual(['Software'])
    const bullets = skills.findAll('.bullet')
    expect(bullets.map((b) => b.find('.bullet-name').text())).toEqual(['Figma', 'Vue', 'Git'])
    expect(bullets[0]!.find('.v-dots').exists()).toBe(true)
    expect(bullets[1]!.find('.v-dots').exists()).toBe(false)
    const size = /\.skill-category\s*\{[^}]*font-size:\s*([\d.]+)em/.exec(source)?.[1]
    expect(Number(size)).toBeLessThan(1)
  })

  it('lists the languages with their level in brackets', () => {
    const wrapper = mount(Retro, { props: { data: createSampleCV() } })
    const languages = wrapper.find('[data-section="languages"]')
    expect(languages.find('.tab').text()).toBe('Idiomas')
    expect(languages.find('.bullet').text().replace(/\s+/g, ' ')).toBe('Español (Nativo)')
  })

  it('draws a different icon for e-mail, phone, location, LinkedIn and GitHub', () => {
    const wrapper = mount(Retro, { props: { data: createSampleCV() } })
    const icons = wrapper.findAll('.contact').map((row) => row.find('path').attributes('d'))
    expect(icons).toHaveLength(5)
    expect(new Set(icons).size).toBe(5)
  })

  it('sets the name and titles in Roboto Slab, the rest in the chosen font', () => {
    expect(source).toMatch(/--slab:\s*'Roboto Slab'/)
    for (const selector of ['.name', '.title', '.band-title', '.tab']) {
      expect(new RegExp(`\\${selector}\\s*\\{[^}]*font-family:\\s*var\\(--slab\\)`).test(source)).toBe(true)
    }
    expect(source).toMatch(/\.retro\s*\{[^}]*font-family:\s*var\(--cv-font\)/)
  })

  it('repeats the frame and the sheet on every page, in the one box the direct PDF draws first', () => {
    expect(source).toMatch(/\.retro\[data-split-from\]::before\s*\{\s*content:\s*''\s*!important/)
    // An ::after would be painted over the text by the direct PDF, which ignores z-index.
    expect(source).not.toMatch(/\.retro[^{]*::after/)
  })
})
