// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PreferencesPopover from '@/components/PreferencesPopover.vue'
import AppMenuSheet from '@/components/AppMenuSheet.vue'

beforeEach(() => setActivePinia(createPinia()))

const NAMES = [
  ['Español', 'es'],
  ['English', 'en'],
  ['Français', 'fr'],
  ['Italiano', 'it'],
  ['Português', 'pt-PT'],
  ['Deutsch', 'de'],
  ['Català', 'ca'],
  ['Valencià', 'ca-valencia'],
  ['Euskara', 'eu'],
]

describe('UI language options (specs 027, 057, 070)', () => {
  it('names each language in itself, with its lang, instead of "ES" / "EN"', () => {
    const wrapper = mount(PreferencesPopover)
    const options = wrapper.findAll('select option[lang]')
    expect(options.map((o) => [o.text(), o.attributes('lang')])).toEqual(NAMES)
  })

  it('offers the same nine in the phone menu', () => {
    const wrapper = mount(AppMenuSheet, { props: { open: true }, global: { stubs: { BottomSheet: { template: '<div><slot /></div>' } } } })
    expect(wrapper.findAll('select option[lang]').map((o) => [o.text(), o.attributes('lang')])).toEqual(NAMES)
  })
})

describe('stored UI language (spec 057)', () => {
  it('keeps one of the six and falls back to Spanish for anything else', async () => {
    const { storedLocale, setLocale } = await import('@/i18n')
    for (const [stored, expected] of [['pt', 'pt'], ['de', 'de'], ['xx', 'es'], [42, 'es']]) {
      localStorage.setItem('keireki-craft:prefs', JSON.stringify({ uiLanguage: stored }))
      expect(storedLocale()).toBe(expected)
    }
    setLocale('pt')
    expect(document.documentElement.lang).toBe('pt-PT')
    localStorage.setItem('keireki-craft:prefs', JSON.stringify({ uiLanguage: 'ca-valencia' }))
    expect(storedLocale()).toBe('ca-valencia')
    setLocale('ca-valencia')
    expect(document.documentElement.lang).toBe('ca-valencia')
    setLocale('es')
  })
})
