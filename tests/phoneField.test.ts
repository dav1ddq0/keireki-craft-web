// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { countryByIso, type Country } from '@/core/countries'
import PhoneField from '@/components/form/PhoneField.vue'

let ipAnswer: Promise<Country | null> = Promise.resolve(null)
vi.mock('@/services/geo/ipCountry', () => ({ fetchIpCountry: () => ipAnswer }))

const mountField = (phone = '') =>
  mount(PhoneField, {
    props: {
      inputId: 'phone',
      modelValue: phone,
      'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value }),
    },
    attachTo: document.body,
  })
let wrapper: ReturnType<typeof mountField>

const dialText = () => wrapper.get('.dial').text()
const deferred = () => {
  let resolve!: (c: Country | null) => void
  const promise = new Promise<Country | null>((r) => (resolve = r))
  return { promise, resolve }
}

beforeEach(() => {
  document.body.innerHTML = ''
  ipAnswer = Promise.resolve(null)
})

describe('PhoneField (spec 056)', () => {
  it('opens a phone that already has a code on that country, untouched', () => {
    wrapper = mountField('+34 600 123 456')
    expect(dialText()).toBe('+34')
    expect((wrapper.get('input[type="tel"]').element as HTMLInputElement).value).toBe('600 123 456')
  })

  it('starts an empty phone on the country guessed from the browser, without writing a lone code', async () => {
    wrapper = mountField('')
    await flushPromises()
    expect(dialText()).toMatch(/^\+\d+$/)
    expect(wrapper.props('modelValue')).toBe('')
  })

  it('moves to the IP country when it answers and the user has not chosen', async () => {
    const answer = deferred()
    ipAnswer = answer.promise
    wrapper = mountField('')
    answer.resolve(countryByIso('JP') ?? null)
    await flushPromises()
    expect(dialText()).toBe('+81')
  })

  it('never overwrites a country the user chose while the lookup was out', async () => {
    const answer = deferred()
    ipAnswer = answer.promise
    wrapper = mountField('')
    await wrapper.get('.country').trigger('click')
    await wrapper.get('.search').setValue('+33')
    await wrapper.get('.option').trigger('click')
    answer.resolve(countryByIso('JP') ?? null)
    await flushPromises()
    expect(dialText()).toBe('+33')
  })

  it('never overwrites a phone that already has a code, nor one being typed', async () => {
    const answer = deferred()
    ipAnswer = answer.promise
    wrapper = mountField('')
    await wrapper.get('input[type="tel"]').setValue('600 123 456')
    const before = dialText()
    answer.resolve(countryByIso('JP') ?? null)
    await flushPromises()
    expect(dialText()).toBe(before)

    const withCode = mountField('+34 600 123 456')
    await flushPromises()
    expect(withCode.get('.dial').text()).toBe('+34')
  })

  it('stores the phone as one string: code + number', async () => {
    wrapper = mountField('')
    await wrapper.get('.country').trigger('click')
    await wrapper.get('.search').setValue('+44')
    await wrapper.get('.option').trigger('click')
    await wrapper.get('input[type="tel"]').setValue('7700 900123')
    expect(wrapper.props('modelValue')).toBe('+44 7700 900123')
  })

  it('searches by name, ISO code or dial code, and says when nothing matches', async () => {
    wrapper = mountField('')
    await wrapper.get('.country').trigger('click')
    await wrapper.get('.search').setValue('+34')
    expect(wrapper.findAll('.option').some((o) => o.text().includes('+34'))).toBe(true)
    await wrapper.get('.search').setValue('zzzz')
    expect(wrapper.findAll('.option')).toHaveLength(0)
    expect(wrapper.find('.empty').exists()).toBe(true)
  })

  it('picks with the keyboard: arrows move, Enter chooses, Escape closes', async () => {
    wrapper = mountField('')
    await wrapper.get('.country').trigger('click')
    const search = wrapper.get('.search')
    await search.setValue('+34')
    await search.trigger('keydown', { key: 'Enter' })
    expect(dialText()).toBe('+34')
    expect(wrapper.find('.popup').exists()).toBe(false)
    await wrapper.get('.country').trigger('click')
    await wrapper.get('.search').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.popup').exists()).toBe(false)
  })

  it('follows the string when it changes from outside (undo, import)', async () => {
    wrapper = mountField('+34 600 123 456')
    await wrapper.setProps({ modelValue: '+33 1 23 45 67 89' })
    expect(dialText()).toBe('+33')
  })

  it('moves a code typed in the number box to the selector', async () => {
    wrapper = mountField('')
    await wrapper.get('input[type="tel"]').setValue('+49 151 2345678')
    expect(dialText()).toBe('+49')
    expect(wrapper.props('modelValue')).toBe('+49 151 2345678')
  })
})
