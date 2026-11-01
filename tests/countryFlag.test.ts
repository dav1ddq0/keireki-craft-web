// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { readdirSync } from 'node:fs'
import CountryFlag from '@/components/ui/CountryFlag.vue'
import { COUNTRIES } from '@/core/countries'

describe('CountryFlag (spec 056)', () => {
  it('shows the flag once its file has loaded, and hides it from assistive tech', async () => {
    const wrapper = mount(CountryFlag, { props: { iso: 'ES' } })
    await vi.waitFor(() => expect(wrapper.find('img').exists()).toBe(true))
    const img = wrapper.get('img')
    expect(img.attributes('src')).toBeTruthy()
    expect(img.attributes('alt')).toBe('')
    expect(img.attributes('aria-hidden')).toBe('true')
  })

  it('follows the country when it changes', async () => {
    const wrapper = mount(CountryFlag, { props: { iso: 'ES' } })
    await vi.waitFor(() => expect(wrapper.find('img').exists()).toBe(true))
    const spain = wrapper.get('img').attributes('src')
    await wrapper.setProps({ iso: 'FR' })
    await vi.waitFor(() => expect(wrapper.find('img').exists()).toBe(true))
    expect(wrapper.get('img').attributes('src')).not.toBe(spain)
  })

  it('keeps an empty box for a code with no flag file', async () => {
    const wrapper = mount(CountryFlag, { props: { iso: 'ZZ' } })
    await flushPromises()
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.flag--empty').exists()).toBe(true)
  })

  it('has a flag file for every country in the list', () => {
    const files = new Set(readdirSync('node_modules/flag-icons/flags/4x3'))
    const missing = COUNTRIES.filter((c) => !files.has(`${c.iso.toLowerCase()}.svg`)).map((c) => c.iso)
    expect(missing).toEqual([])
  })
})
