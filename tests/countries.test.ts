import { describe, expect, it } from 'vitest'
import {
  COUNTRIES,
  countryByIso,
  countryFromLocale,
  countryName,
  joinPhone,
  splitPhone,
} from '@/core/countries'

describe('countries (spec 056)', () => {
  it('lists each country once, with an upper-case ISO code and digit-only dial code', () => {
    const isos = COUNTRIES.map((c) => c.iso)
    expect(new Set(isos).size).toBe(isos.length)
    for (const c of COUNTRIES) {
      expect(c.iso).toMatch(/^[A-Z]{2}$/)
      expect(c.dial).toMatch(/^\d{1,5}$/)
    }
  })

  it('names a country in the interface language', () => {
    expect(countryName('ES', 'en')).toBe('Spain')
    expect(countryName('ES', 'es')).toBe('España')
  })
})

describe('splitPhone / joinPhone', () => {
  it('splits a phone with a code and keeps the number as typed', () => {
    const { country, number } = splitPhone('+34 600 123 456')
    expect(country?.iso).toBe('ES')
    expect(number).toBe('600 123 456')
  })

  it('finds the longest code: +1868 is Trinidad, +1 is the US', () => {
    expect(splitPhone('+1 868 555 0100').country?.iso).toBe('TT')
    expect(splitPhone('+1 415 555 0100').country?.iso).toBe('US')
  })

  it('prefers the main country of a shared code', () => {
    expect(splitPhone('+44 7700 900123').country?.iso).toBe('GB')
    expect(splitPhone('+7 912 345 67 89').country?.iso).toBe('RU')
  })

  it('tolerates a code glued to the number and a dash after the code', () => {
    expect(splitPhone('+34600123456')).toMatchObject({ number: '600123456' })
    expect(splitPhone('+34-600-123-456').number).toBe('600-123-456')
  })

  it('leaves a phone without a leading "+" untouched, with no country', () => {
    expect(splitPhone('600 123 456')).toEqual({ country: null, number: '600 123 456' })
    expect(splitPhone('')).toEqual({ country: null, number: '' })
  })

  it('leaves an unknown code as plain text', () => {
    expect(splitPhone('+999 123')).toEqual({ country: null, number: '+999 123' })
  })

  it('round-trips what the selector produces', () => {
    const es = countryByIso('ES')
    expect(joinPhone(es ?? null, '600 123 456')).toBe('+34 600 123 456')
    const split = splitPhone(joinPhone(es ?? null, '600 123 456'))
    expect(split.country?.iso).toBe('ES')
    expect(split.number).toBe('600 123 456')
  })

  it('keeps an empty number empty (never a lone code)', () => {
    expect(joinPhone(countryByIso('ES') ?? null, '  ')).toBe('')
  })

  it('stores the number alone when there is no country', () => {
    expect(joinPhone(null, '600 123 456')).toBe('600 123 456')
  })
})

describe('countryFromLocale (offline guess)', () => {
  it('uses the region of the language when it has one', () => {
    expect(countryFromLocale('es-MX', 'Europe/Madrid')?.iso).toBe('MX')
  })

  it('falls back to the time zone, then to the language most likely region', () => {
    expect(countryFromLocale('es', 'America/Bogota')?.iso).toBe('CO')
    expect(countryFromLocale('es', 'UTC')?.iso).toBe('ES')
  })

  it('returns null for something that is not a language tag and has no known zone', () => {
    expect(countryFromLocale('not a tag', 'UTC')).toBeNull()
  })
})
