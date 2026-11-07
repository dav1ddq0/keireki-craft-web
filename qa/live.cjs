// The published site, checked where it lives (spec 068): addresses and redirects, the files of 066 and
// 067, then the app itself in Chromium on a laptop and a phone. Run after each deploy; the workflow
// does it too.
// Usage: npm run qa:live [-- <url>]   (default https://keireki-craft.eu/, or QA_LIVE_URL)
// QA_LIVE_COMMIT=<sha> first waits, up to 5 minutes, until the site serves that commit's build: right
// after a deploy the CDN may still answer with the previous one (or a 404 cached from before).
const { chromium } = require('playwright')

const GIVEN = new URL(process.argv[2] ?? process.env.QA_LIVE_URL ?? 'https://keireki-craft.eu/').href
const COMMIT = process.env.QA_LIVE_COMMIT
/** Where the given address ends (the workflow's deploy URL may be the http:// one). */
let SITE = GIVEN
const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}
const until = async (fn, timeout = 15000, every = 250) => {
  const t0 = Date.now()
  for (;;) {
    try {
      const v = await fn()
      if (v) return v
    } catch {}
    if (Date.now() - t0 > timeout) return false
    await new Promise((r) => setTimeout(r, every))
  }
}

;(async () => {
  SITE = (await fetch(GIVEN)).url
  if (COMMIT) {
    // sw.js names the commit it was built from (spec 067).
    const served = await until(async () => (await (await fetch(new URL('sw.js', SITE), { cache: 'no-store' })).text()).includes(`Commit ${COMMIT}.`), 5 * 60_000, 10_000)
    check(`the site serves commit ${COMMIT.slice(0, 7)}`, served)
    if (!served) {
      process.exitCode = 1
      return
    }
  }
  // ---- addresses: one home, over HTTPS.
  const site = new URL(SITE)
  if (site.protocol === 'https:' && !site.hostname.endsWith('localhost')) {
    const variants = [`http://${site.host}/`, ...(site.hostname.startsWith('www.') ? [] : [`https://www.${site.host}/`, `http://www.${site.host}/`])]
    for (const from of variants) {
      // GitHub Pages may take two hops (www over http goes to the apex over http, then to https).
      const r = await fetch(from).catch((e) => ({ redirected: false, url: e.message }))
      check(`${from} redirects to ${SITE}`, r.redirected && r.url === SITE, r.url)
    }
  }
  for (const [file, type] of [['robots.txt', 'text/plain'], ['sitemap.xml', 'xml'], ['og-image.png', 'image/png'], ['manifest.webmanifest', 'manifest'], ['sw.js', 'javascript'], ['icon-512.png', 'image/png']]) {
    const r = await fetch(new URL(file, SITE))
    check(`/${file} is served`, r.ok && (r.headers.get('content-type') ?? '').includes(type), `${r.status} ${r.headers.get('content-type')}`)
  }

  // ---- the app, as a person opens it.
  const browser = await chromium.launch()
  try {
    for (const [label, opts] of [
      ['laptop', { viewport: { width: 1280, height: 800 } }],
      ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
    ]) {
      const ctx = await browser.newContext({ ...opts, locale: 'en-GB' })
      await ctx.addInitScript(() => localStorage.setItem('keireki-craft:prefs', JSON.stringify({ uiLanguage: 'en' })))
      const p = await ctx.newPage()
      const errs = []
      const hosts = new Set()
      p.on('pageerror', (e) => errs.push(e.message))
      p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
      p.on('response', (r) => r.status() >= 400 && errs.push(`${r.status()} ${r.url()}`))
      p.on('request', (r) => hosts.add(new URL(r.url()).host))
      const res = await p.goto(SITE, { waitUntil: 'networkidle' })
      check(`${label}: the page opens`, res.ok() && p.url() === SITE, `${res.status()} ${p.url()}`)
      check(`${label}: with its Content-Security-Policy`, (await p.locator('meta[http-equiv="Content-Security-Policy"]').count()) === 1)
      await p.getByRole('button', { name: /Load a sample/ }).first().click()
      // On the phone the preview is a tap away: its text is there, not on screen.
      check(`${label}: the sample opens`, await until(async () => (await p.locator('.cv-page').first().textContent()).includes('Emma Clarke')))
      const gotIt = p.getByRole('button', { name: 'Got it' })
      if (await gotIt.count()) await gotIt.first().click()
      if (label === 'laptop') {
        const text = `Live check ${Date.now()}`
        await p.getByLabel('Professional headline').fill(text)
        check(`${label}: the preview follows the form`, await until(async () => (await p.locator('.cv-page').first().innerText()).includes(text)))
        await p.waitForTimeout(1000)
        await p.reload({ waitUntil: 'networkidle' })
        check(`${label}: the edit is still there after a reload`, await until(async () => (await p.locator('body').innerText()).includes(text)))
        const sw = await until(() => p.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated'), 90000)
        check(`${label}: the service worker installs (spec 067)`, sw)
        const cdp = await ctx.newCDPSession(p)
        const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
        check(`${label}: installable`, installabilityErrors.length === 0, installabilityErrors.map((e) => e.errorId).join(', '))
        if (sw) {
          await ctx.setOffline(true)
          await p.reload({ waitUntil: 'load' })
          check(`${label}: opens offline`, await until(async () => (await p.locator('body').innerText()).includes(text)))
          await ctx.setOffline(false)
        }
      } else {
        await p.getByRole('button', { name: 'Preview', exact: true }).first().click()
        check(`${label}: the preview shows`, await until(() => p.locator('.cv-page').first().isVisible()))
      }
      // Offline, only ipwho.is may fail (the phone's country code): the app goes on without it.
      const own = errs.filter((e) => !/ipwho\.is|ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e))
      check(`${label}: no errors and no 404`, own.length === 0, own.join(' | '))
      const others = [...hosts].filter((h) => h !== site.host && h !== 'ipwho.is')
      check(`${label}: asks only its own site (and ipwho.is)`, others.length === 0, others.join(', '))
      await ctx.close()
    }
  } finally {
    await browser.close()
  }

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks pass · ${SITE}`)
  process.exitCode = failed.length ? 1 : 0
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
