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
  }
  return { store, caches: { open: async () => cache, match: (key: string | Request) => cache.match(key) } }
}

/**
 * Runs the generated worker against fakes and returns its handlers and state. The server answers
 * `body of <url>` (or `server.body`), with `server.status[url]` when set (200 otherwise).
 */
function boot(known: string[], precache: string[], fresh: string[] = []) {
  const listeners: Record<string, (event: unknown) => void> = {}
  const { store, caches } = fakeCaches()
  const fetched: string[] = []
  const online = { value: true }
  const server = { status: {} as Record<string, number>, body: (url: string) => `body of ${url}` }
  const fetchFake = vi.fn(async (input: string | Request) => {
    const url = typeof input === 'string' ? input : input.url
    if (!online.value) throw new TypeError('Failed to fetch')
    fetched.push(url)
    return new Response(server.body(url), { status: server.status[url] ?? 200 })
  })
  const self = {
    registration: { scope: SCOPE },
    location: new URL(SCOPE),
    addEventListener: (type: string, fn: (event: unknown) => void) => (listeners[type] = fn),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  }
  new Function('self', 'caches', 'fetch', serviceWorkerSource({ version: 'test', known, precache, fresh, commit: 'abc123' }))(self, caches, fetchFake)
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
  return { store, fetched, self, lifecycle, request, online, server }
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

  it('fetches the files without a hash again at every install, so a new favicon or manifest arrives', async () => {
    const sw = boot(known, ['assets/app-1.js', 'icon-192.png'], ['icon-192.png'])
    await sw.lifecycle('install')
    sw.server.body = (url) => `new ${url}`
    sw.fetched.length = 0
    await sw.lifecycle('install')
    expect(sw.fetched.sort()).toEqual([SCOPE, `${SCOPE}icon-192.png`])
    expect(await sw.store.get(`${SCOPE}icon-192.png`)!.text()).toBe(`new ${SCOPE}icon-192.png`)
  })

  it('fails the install on an error answer, and stores nothing of it', async () => {
    const sw = boot(known, ['assets/app-1.js', 'icon-192.png'], ['icon-192.png'])
    await sw.lifecycle('install')
    sw.server.body = (url) => `new ${url}`
    sw.server.status[`${SCOPE}icon-192.png`] = 503
    await expect(sw.lifecycle('install')).rejects.toThrow('503')
    // The new page arrived fine, but is not kept without the rest of its deploy.
    expect(await sw.store.get(SCOPE)!.text()).toBe(`body of ${SCOPE}`)
    expect(await sw.store.get(`${SCOPE}icon-192.png`)!.text()).toBe(`body of ${SCOPE}icon-192.png`)
    expect(sw.self.skipWaiting).toHaveBeenCalledTimes(1)
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

  it('does not keep an error page as the offline page', async () => {
    const sw = boot(known, [])
    await sw.lifecycle('install')
    sw.server.status[SCOPE] = 500
    sw.server.body = () => 'Internal Server Error'
    expect((await sw.request(SCOPE, { mode: 'navigate' }))!.status).toBe(500)
    expect(await sw.store.get(SCOPE)!.text()).toBe(`body of ${SCOPE}`)
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
    sw.server.status[`${SCOPE}icon-192.png`] = 404
    expect((await sw.request(`${SCOPE}icon-192.png`))!.status).toBe(404)
    expect(sw.store.has(`${SCOPE}icon-192.png`)).toBe(false)
  })

  it('names the commit it was built from, for qa:live (spec 068)', () => {
    expect(serviceWorkerSource({ version: 'v', known: [], precache: [], fresh: [], commit: 'abc123' })).toMatch(/^\/\/ .* Commit abc123\./)
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
