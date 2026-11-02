import { describe, expect, it, vi } from 'vitest'
import { precacheOf, serviceWorkerSource } from '../build/serviceWorker'

const SCOPE = 'https://keireki-craft.eu/'

/** One Cache Storage with a single cache, keyed by URL. */
function fakeCaches() {
  const store = new Map<string, Response>()
  const cache = {
    put: async (key: string | Request, response: Response) => void store.set(typeof key === 'string' ? key : key.url, response),
    match: async (key: string | Request) => store.get(typeof key === 'string' ? key : key.url.split('?')[0]!)?.clone(),
    keys: async () => [...store.keys()].map((url) => ({ url })),
    delete: async (key: { url: string }) => store.delete(key.url),
    addAll: async (urls: string[]) => {
      for (const url of urls) store.set(url, await (globalThis as unknown as { fetch: typeof fetch }).fetch(url))
    },
  }
  return { store, caches: { open: async () => cache, match: (key: string | Request) => cache.match(key) } }
}

/** Runs the generated worker against fakes and returns its handlers and state. */
function boot(known: string[], precache: string[], online = { value: true }) {
  const listeners: Record<string, (event: unknown) => void> = {}
  const { store, caches } = fakeCaches()
  const fetched: string[] = []
  const fetchFake = vi.fn(async (input: string | Request) => {
    const url = typeof input === 'string' ? input : input.url
    if (!online.value) throw new TypeError('Failed to fetch')
    fetched.push(url)
    return new Response(`body of ${url}`, { status: 200 })
  })
  const self = {
    registration: { scope: SCOPE },
    location: new URL(SCOPE),
    addEventListener: (type: string, fn: (event: unknown) => void) => (listeners[type] = fn),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  }
  new Function('self', 'caches', 'fetch', serviceWorkerSource({ version: 'test', known, precache }))(self, caches, fetchFake)
  /** Fires a lifecycle event and waits for what it asked to wait for. */
  const lifecycle = async (type: 'install' | 'activate') => {
    let work: Promise<unknown> = Promise.resolve()
    listeners[type]!({ waitUntil: (p: Promise<unknown>) => (work = p) })
    await work
  }
  /** Fires a fetch event; resolves to the response, or undefined when the worker lets it through. */
  const request = async (url: string, init: { method?: string; mode?: string } = {}) => {
    let answer: Promise<Response> | undefined
    const pending: Promise<unknown>[] = []
    listeners.fetch!({
      request: { url, method: init.method ?? 'GET', mode: init.mode ?? 'cors' },
      respondWith: (p: Promise<Response>) => (answer = p),
      waitUntil: (p: Promise<unknown>) => pending.push(p),
    })
    const response = await answer
    await Promise.all(pending)
    return response
  }
  return { store, fetched, self, lifecycle, request, online }
}

describe('Service worker (spec 067)', () => {
  const known = ['assets/app-1.js', 'assets/app-1.css', 'assets/es-1.svg', 'icon-192.png']

  it('fetches the index fresh and the precache ahead on install, then takes over', async () => {
    const sw = boot(known, ['assets/app-1.js', 'assets/app-1.css', 'icon-192.png'])
    await sw.lifecycle('install')
    expect([...sw.store.keys()].sort()).toEqual([SCOPE, `${SCOPE}assets/app-1.css`, `${SCOPE}assets/app-1.js`, `${SCOPE}icon-192.png`])
    expect(sw.self.skipWaiting).toHaveBeenCalled()
    await sw.lifecycle('activate')
    expect(sw.self.clients.claim).toHaveBeenCalled()
  })

  it('fetches again only what a deploy changed', async () => {
    const sw = boot(known, ['assets/app-1.js', 'assets/app-1.css'])
    await sw.lifecycle('install')
    sw.fetched.length = 0
    await sw.lifecycle('install')
    expect(sw.fetched).toEqual([SCOPE])
  })

  it('drops the files of an older deploy on activate, and keeps the index', async () => {
    const older = boot(['assets/app-0.js'], ['assets/app-0.js'])
    await older.lifecycle('install')
    const sw = boot(known, ['assets/app-1.js'])
    for (const [url, response] of older.store) sw.store.set(url, response)
    await sw.lifecycle('install')
    await sw.lifecycle('activate')
    expect([...sw.store.keys()].sort()).toEqual([SCOPE, `${SCOPE}assets/app-1.js`])
  })

  it('opens the page from the network when online, and from the cache offline', async () => {
    const sw = boot(known, [])
    await sw.lifecycle('install')
    sw.fetched.length = 0
    expect(await (await sw.request(SCOPE, { mode: 'navigate' }))!.text()).toBe(`body of ${SCOPE}`)
    expect(sw.fetched).toEqual([SCOPE])
    sw.online.value = false
    expect(await (await sw.request(`${SCOPE}?lang=en`, { mode: 'navigate' }))!.text()).toBe(`body of ${SCOPE}`)
  })

  it('serves a cached file without the network, and keeps a known file fetched later (a flag)', async () => {
    const sw = boot(known, ['assets/app-1.js'])
    await sw.lifecycle('install')
    sw.fetched.length = 0
    await sw.request(`${SCOPE}assets/app-1.js`)
    expect(sw.fetched).toEqual([])
    await sw.request(`${SCOPE}assets/es-1.svg`)
    expect(sw.store.has(`${SCOPE}assets/es-1.svg`)).toBe(true)
    await sw.request(`${SCOPE}not-in-the-build.json`)
    expect(sw.store.has(`${SCOPE}not-in-the-build.json`)).toBe(false)
  })

  it('lets other sites and other methods go to the network untouched', async () => {
    const sw = boot(known, [])
    expect(await sw.request('https://ipwho.is/')).toBeUndefined()
    expect(await sw.request('https://claude.ai/new?q=x', { mode: 'navigate' })).toBeUndefined()
    expect(await sw.request(`${SCOPE}assets/app-1.js`, { method: 'POST' })).toBeUndefined()
  })

  it('precaches everything the app may ask for, the flags included, but not the files for crawlers', () => {
    const files = ['assets/app-1.js', 'assets/es-1.svg', 'assets/es-1.js', 'og-image.png', 'robots.txt', 'sitemap.xml', 'icon-512.png']
    expect(precacheOf(files)).toEqual(['assets/app-1.js', 'assets/es-1.svg', 'assets/es-1.js', 'icon-512.png'])
  })
})
