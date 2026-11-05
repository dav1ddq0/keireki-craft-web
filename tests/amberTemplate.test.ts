// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSampleCV } from '@/core/sample'
import { createEmptyCV } from '@/core/factory'
import { splitName } from '@/templates/amber/name'
import Amber from '@/templates/amber/Template.vue'

const source = readFileSync('src/templates/amber/Template.vue', 'utf8')

describe('splitName (spec 071)', () => {
  it('puts the last word apart, for the accent', () => {
    expect(splitName('Nadia Martín Reyes')).toEqual({ lead: 'Nadia Martín', last: 'Reyes' })
    expect(splitName('  Ane   Etxeberria ')).toEqual({ lead: 'Ane', last: 'Etxeberria' })
  })

  it('leaves a one-word name all in ink, and an empty one empty', () => {
    expect(splitName('Madonna')).toEqual({ lead: 'Madonna', last: '' })
    expect(splitName('   ')).toEqual({ lead: '', last: '' })
  })
})

describe('Amber (spec 071)', () => {
  it('reads the whole name, with its last word in the accent', () => {
    const wrapper = mount(Amber, { props: { data: createSampleCV() } })
    const name = wrapper.find('h1.name')
    expect(name.text()).toBe('Nadia Martín Reyes')
    expect(name.find('.name-last').text()).toBe('Reyes')
    expect(source).toMatch(/\.name-last\s*\{[^}]*color:\s*var\(--cv-accent-text\)/)
  })

  it('accents nothing in a one-word name, and leaves no header text without a name', () => {
    const data = createSampleCV()
    data.personal.fullName = 'Nadia'
    expect(mount(Amber, { props: { data } }).find('.name-last').exists()).toBe(false)

    const empty = mount(Amber, { props: { data: createEmptyCV() } })
    expect(empty.find('h1').exists()).toBe(false)
    expect(empty.find('.headline').exists()).toBe(false)
  })

  it('keeps education and languages in the side column, the rest in the main one', () => {
    const wrapper = mount(Amber, { props: { data: createSampleCV() } })
    const kinds = (selector: string) => wrapper.find(selector).findAll('[data-section]').map((el) => el.attributes('data-section'))
    expect(kinds('aside')).toEqual(['education', 'languages'])
    expect(kinds('main')).toEqual(expect.arrayContaining(['summary', 'experience', 'skills', 'custom']))
    expect(kinds('main')).not.toContain('education')
  })

  it('shows the photo in its frame with the corner triangle, and neither without a photo', () => {
    const data = createSampleCV()
    data.personal.photo = 'data:image/png;base64,AAAA'
    const withPhoto = mount(Amber, { props: { data } })
    expect(withPhoto.classes()).toContain('amber--photo')
    expect(withPhoto.find('.photo-frame img.photo').exists()).toBe(true)
    expect(withPhoto.find('.side-corner').exists()).toBe(true)

    data.personal.photo = ''
    const without = mount(Amber, { props: { data } })
    expect(without.classes()).not.toContain('amber--photo')
    expect(without.find('.photo-frame').exists()).toBe(false)
    expect(without.find('.side-corner').exists()).toBe(false)
  })

  it('draws skills with a level as bars, and lists them without one', () => {
    const data = createSampleCV()
    data.skills = [
      { id: 'a', category: '', items: [{ name: 'Figma', level: 4 }, { name: 'Vue', level: 5 }] },
      { id: 'b', category: 'Tools', items: [{ name: 'Git' }, { name: 'Docker' }] },
    ]
    const wrapper = mount(Amber, { props: { data } })
    const skills = wrapper.find('[data-section="skills"]')
    expect(skills.findAll('.skill-grid .level-row')).toHaveLength(2)
    expect(skills.find('.v-bars').exists()).toBe(true)
    expect(skills.find('.skill-items').text()).toBe('Git · Docker')
  })

  it('draws a different icon for e-mail, phone, location, LinkedIn and GitHub', () => {
    const wrapper = mount(Amber, { props: { data: createSampleCV() } })
    const icons = wrapper.findAll('.contact').map((row) => row.find('path').attributes('d'))
    expect(icons).toHaveLength(5)
    expect(new Set(icons).size).toBe(5)
  })

  it('sets a skill group name smaller than its items, which is how a PDF import tells them apart', () => {
    const size = /\.skill-category\s*\{[^}]*font-size:\s*([\d.]+)em/.exec(source)?.[1]
    expect(Number(size)).toBeLessThan(1)
  })
})
