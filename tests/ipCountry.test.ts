import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchIpCountry, IP_COUNTRY_URL, resetIpCountryCache } from '@/services/geo/ipCountry'

const reply = (body: unknown, ok = true) =>
  vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) }) as unknown as typeof fetch

beforeEach(() => resetIpCountryCache())

describe('fetchIpCountry (spec 056)', () => {
  it('asks only for the country code, with no cookies and no referrer', async () => {
    const fetchFn = reply({ country_code: 'ES' })
    await fetchIpCountry(fetchFn)
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe(IP_COUNTRY_URL)
    expect(url).toContain('fields=country_code')
    expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' })
  })

  it('returns the country of a valid code', async () => {
    expect((await fetchIpCountry(reply({ country_code: 'MX' })))?.iso).toBe('MX')
  })

  it('returns null for a failure, a bad status or a payload that is not a known code', async () => {
    expect(await fetchIpCountry(vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch)).toBeNull()
    resetIpCountryCache()
    expect(await fetchIpCountry(reply({ country_code: 'ES' }, false))).toBeNull()
    resetIpCountryCache()
    expect(await fetchIpCountry(reply({ success: false, message: 'limit' }))).toBeNull()
    resetIpCountryCache()
    expect(await fetchIpCountry(reply({ country_code: 'ZZ' }))).toBeNull()
    resetIpCountryCache()
    expect(await fetchIpCountry(reply('ES'))).toBeNull()
  })

  it('gives up after the timeout', async () => {
    const never = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted')))),
    ) as unknown as typeof fetch
    expect(await fetchIpCountry(never, 20)).toBeNull()
  })

  it('asks once per session, however many times it is called', async () => {
    const fetchFn = reply({ country_code: 'ES' })
    await Promise.all([fetchIpCountry(fetchFn), fetchIpCountry(fetchFn)])
    await fetchIpCountry(fetchFn)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
