// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSampleCV } from '@/core/sample'
import { CONTACT_ICONS, FILLED_ICONS, contactKind, linkKind } from '@/templates/contactIcons'
import { monogramLetters } from '@/templates/monogram/initials'
import Monogram from '@/templates/monogram/Template.vue'
import Cobalt from '@/templates/cobalt/Template.vue'

describe('monogramLetters (spec 049)', () => {
  it('takes the first letter of the first name and of the last surname', () => {
    expect(monogramLetters('Nadia Martín Reyes')).toEqual(['N', 'R'])
    expect(monogramLetters('  carolina   cepeda ')).toEqual(['C', 'C'])
  })

  it('gives one letter for a single name, none for an empty one, and keeps accents and wide characters whole', () => {
    expect(monogramLetters('Nadia')).toEqual(['N', ''])
    expect(monogramLetters('   ')).toEqual(['', ''])
    expect(monogramLetters('Élodie Øster')).toEqual(['É', 'Ø'])
    expect(monogramLetters('𠮷田 太郎')[0]).toBe('𠮷')
  })
})

describe('contactKind', () => {
  it('names the line the e-mail, the phone, the location, or something else', () => {
    const personal = { email: 'a@b.c', phone: '+34 600', location: 'Valencia' }
    expect(['a@b.c', '+34 600', 'Valencia', 'Nacionalidad: ES'].map((t) => contactKind(t, personal))).toEqual(['mail', 'phone', 'pin', 'info'])
    expect(new Set(Object.values(CONTACT_ICONS)).size).toBe(7)
  })
})

describe('Monogram (spec 049)', () => {
  it('shows the initials in a frame when there is no photo, and the photo when there is one', () => {
    const data = createSampleCV()
    data.personal.photo = ''
    const plain = mount(Monogram, { props: { data } })
    expect(plain.find('img.photo').exists()).toBe(false)
    expect(plain.findAll('.letter').map((l) => l.text())).toEqual(['N', 'R'])

    data.personal.photo = 'data:image/png;base64,AAAA'
    const withPhoto = mount(Monogram, { props: { data } })
    expect(withPhoto.find('img.photo').exists()).toBe(true)
    expect(withPhoto.find('.frame').exists()).toBe(false)
  })

  it('puts the summary in the header and the career, with education, in the main column', () => {
    const wrapper = mount(Monogram, { props: { data: createSampleCV() } })
    expect(wrapper.find('.head [data-section="summary"]').exists()).toBe(true)
    const kinds = (selector: string) => wrapper.find(selector).findAll('[data-section]').map((el) => el.attributes('data-section'))
    expect(kinds('aside')).toEqual(['skills', 'languages'])
    expect(kinds('main')).toEqual(expect.arrayContaining(['experience', 'education']))
    expect(kinds('main')).not.toContain('summary')
  })

  it('draws no frame for an empty name, and no summary block without a summary', () => {
    const data = createSampleCV()
    data.personal.fullName = ''
    data.personal.photo = ''
    data.summary = ''
    const wrapper = mount(Monogram, { props: { data } })
    expect(wrapper.find('.frame').exists()).toBe(false)
    expect(wrapper.find('.summary').exists()).toBe(false)
  })
})

describe('linkKind', () => {
  it('knows a professional network and a code host by their host, with or without the scheme', () => {
    expect(linkKind('https://www.linkedin.com/in/nadia')).toBe('linkedin')
    expect(linkKind('linkedin.com/in/nadia')).toBe('linkedin')
    expect(linkKind('github.com/nadia')).toBe('github')
    expect(linkKind('https://gist.github.com/nadia')).toBe('github')
  })

  it('does not take a lookalike host for one of them, and falls back to the globe', () => {
    expect(linkKind('https://notlinkedin.com/x')).toBe('link')
    expect(linkKind('https://github.com.evil.example/x')).toBe('link')
    expect(linkKind('https://nadia.dev')).toBe('link')
    expect(linkKind('http://[bad')).toBe('link')
  })
})

describe('Monogram: a long list of skills (spec 052)', () => {
  const withSkills = (n: number) => {
    const data = createSampleCV()
    data.skills = [{ id: 'g', category: '', items: Array.from({ length: n }, (_, i) => ({ name: `Skill ${i}` })) }]
    return mount(Monogram, { props: { data } })
  }

  it('gives a short unnamed group a bullet each, and a long one a single line, so the sidebar stays short', () => {
    const short = withSkills(8)
    expect(short.findAll('aside .bullets li')).toHaveLength(8)
    const long = withSkills(11)
    expect(long.find('aside .bullets').exists()).toBe(false)
    expect(long.find('aside .skill-items').text()).toContain('Skill 10')
  })
})


describe('LinkedIn and GitHub icons (spec 058)', () => {
  it('are the networks’ own marks, drawn filled, and the other icons stay stroked', () => {
    expect(FILLED_ICONS).toEqual(new Set(['linkedin', 'github']))
    for (const template of [Monogram, Cobalt]) {
      const wrapper = mount(template, { props: { data: createSampleCV() } })
      for (const kind of ['linkedin', 'github'] as const) expect(wrapper.find(`path[d="${CONTACT_ICONS[kind]}"]`).classes()).toContain('filled')
      expect(wrapper.find(`path[d="${CONTACT_ICONS.mail}"]`).classes()).not.toContain('filled')
    }
  })
})
