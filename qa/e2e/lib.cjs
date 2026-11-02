// Shared helpers: one Chromium, condition-based waits instead of fixed sleeps, timings recorded.
// QA_BROWSER=firefox or webkit runs the suite on that engine (installed with `npx playwright install <name>`).
const { chromium: engine, devices } = (() => {
  const playwright = require('playwright')
  return { chromium: playwright[process.env.QA_BROWSER || 'chromium'], devices: playwright.devices }
})()
const chromium = engine

// Set by run.cjs once the preview server is up.
const BASE = process.env.BASE
const results = []
const timings = []

function check(block, name, ok, detail = '') {
  results.push({ block, name, ok: !!ok, detail })
  if (!ok || process.env.VERBOSE) console.log(`${ok ? 'PASS' : 'FAIL'} [${block}] ${name}${detail ? ' — ' + detail : ''}`)
}

function timing(block, name, ms, budget) {
  timings.push({ block, name, ms: Math.round(ms), budget })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Polls `fn` until it returns something truthy; returns that value, or false on timeout. */
async function until(fn, { timeout = 8000, every = 20 } = {}) {
  const t0 = Date.now()
  for (;;) {
    try {
      const v = await fn()
      if (v) return v
    } catch {}
    if (Date.now() - t0 > timeout) return false
    await sleep(every)
  }
}

async function open(browser, { initScript, ...opts } = {}) {
  // No service worker (spec 067) unless a block asks for one: the blocks measure the app, and the
  // worker's 10 MB install in every parallel context would skew their timings. `offline` allows it.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES', acceptDownloads: true, serviceWorkers: 'block', ...opts })
  // Runs in every page before the app does (a browser without an API, say).
  if (initScript) await ctx.addInitScript(initScript)
  const p = await ctx.newPage()
  // CPU=4 slows the page's CPU 4× (Chromium emulation), for a modest laptop or a phone.
  if (process.env.CPU) await (await ctx.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU) })
  p.errs = []
  p.on('pageerror', (e) => p.errs.push('pageerror: ' + e.message))
  p.on('console', (m) => {
    // Playwright's own Firefox driver (juggler) logs warnings about itself; they are not the app's.
    if (/juggler/.test(m.text())) return
    // The service worker refused by the context's `serviceWorkers: 'block'` above, logged by main.ts.
    if (/Service Worker registration blocked by Playwright/.test(m.text())) return
    if (m.type() === 'error' || (m.type() === 'warning' && !/\[vite\]/.test(m.text()))) p.errs.push(m.type() + ': ' + m.text().slice(0, 200))
  })
  await p.goto(BASE, { waitUntil: 'networkidle' })
  return p
}

const preview = (p) => p.locator('.pane .cv-page, .cv-page').first()
const previewText = (p) => preview(p).innerText()
const previewHas = (p, text, timeout) => until(async () => (await previewText(p)).includes(text), { timeout })

/** Waits until the page stops moving: no CSS transition or animation running for a few frames (spec 048). */
async function settled(p) {
  await p.evaluate(
    () =>
      new Promise((resolve) => {
        let quiet = 0
        const tick = () => {
          quiet = document.getAnimations().length === 0 ? quiet + 1 : 0
          if (quiet >= 4) resolve()
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }),
  )
}

async function step(p, name) {
  await p.locator('nav button.row', { hasText: name }).first().click()
  await p.getByRole('heading', { name, exact: true }).first().waitFor({ timeout: 5000 }).catch(() => {})
  await settled(p)
}

async function startSample(p) {
  await p.getByRole('button', { name: /Desde un ejemplo/ }).click()
  await previewHas(p, 'Nadia Martín Reyes')
  await settled(p)
}

/** Every value in the app's IndexedDB store, as one string: "has this reached storage yet?". */
const idbDump = (p) =>
  p.evaluate(
    () =>
      new Promise((resolve) => {
        const q = indexedDB.open('keireki-craft')
        q.onsuccess = () => {
          const all = q.result.transaction('kv').objectStore('kv').getAll()
          all.onsuccess = () => resolve(JSON.stringify(all.result.filter((v) => !(v instanceof Blob))))
        }
        q.onerror = () => resolve('')
      }),
  )

const idbDocCount = (p) =>
  p.evaluate(
    () =>
      new Promise((resolve) => {
        const q = indexedDB.open('keireki-craft')
        q.onsuccess = () => {
          const g = q.result.transaction('kv').objectStore('kv').get('index')
          g.onsuccess = () => resolve((g.result || []).length)
        }
      }),
  )

const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth)

const ENGINE = process.env.QA_BROWSER || 'chromium'

module.exports = { ENGINE, settled, chromium, BASE, results, timings, check, timing, sleep, until, open, preview, previewText, previewHas, step, startSample, idbDump, idbDocCount, overflow }
