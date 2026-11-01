/**
 * The country of the connection's IP (spec 056). The one network request of the editor, an
 * explicit exception to "everything stays in the browser": it asks `ipwho.is` for the country
 * code only (`fields=country_code`, so the IP does not even come back), sends no cookies nor
 * referrer, gives up after a short timeout, and any failure is silent and means "unknown".
 * The answer is kept in memory for the session and never persisted.
 */
import { countryByIso, type Country } from '@/core/countries'

export const IP_COUNTRY_URL = 'https://ipwho.is/?fields=country_code'
const TIMEOUT_MS = 2000

let cached: Promise<Country | null> | null = null

async function request(fetchFn: typeof fetch, timeoutMs: number): Promise<Country | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchFn(IP_COUNTRY_URL, {
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
    if (!response.ok) return null
    const body: unknown = await response.json()
    const code =
      typeof body === 'object' && body !== null && 'country_code' in body
        ? (body as { country_code: unknown }).country_code
        : null
    // Only a code that is in our list counts; anything else is treated as unknown.
    return typeof code === 'string' ? (countryByIso(code) ?? null) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** The IP's country, or null. One request per session, however many times it is asked. */
export function fetchIpCountry(fetchFn: typeof fetch = fetch, timeoutMs = TIMEOUT_MS): Promise<Country | null> {
  cached ??= request(fetchFn, timeoutMs)
  return cached
}

/** For tests: forget the session's answer. */
export function resetIpCountryCache(): void {
  cached = null
}
