// The app offline and installable (spec 067): with the service worker allowed, after one visit the
// network goes off and the app still opens, opens the sample and downloads a PDF.
const { BASE, ENGINE, check, open, until, startSample, step } = require('./lib.cjs')

async function run(browser) {
  const B = 'offline'
  const p = await open(browser, { serviceWorkers: 'allow' })
  const ready = await until(() => p.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated'), { timeout: 60000, every: 250 })
  check(B, 'the service worker installs and activates after the first visit', ready)
  const cached = await p.evaluate(async () => (await (await caches.open('keireki-craft')).keys()).length)
  check(B, 'the build is cached ahead (code, styles, PDF fonts, flags)', cached > 450, `${cached} files`)

  const manifest = await p.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]')
    const m = await (await fetch(link.href)).json()
    return { m, icons: await Promise.all(m.icons.map(async (i) => (await fetch(new URL(i.src, link.href))).ok)) }
  })
  check(B, 'the manifest names the app, opens standalone in its scope, and its icons load',
    manifest.m.name === 'Keireki Craft' && manifest.m.display === 'standalone' && manifest.m.start_url === './' && manifest.icons.every(Boolean) && manifest.m.icons.some((i) => i.purpose === 'maskable'))
  if (ENGINE === 'chromium') {
    const cdp = await p.context().newCDPSession(p)
    const { installabilityErrors: errors } = await cdp.send('Page.getInstallabilityErrors')
    check(B, 'Chromium sees the page as installable', errors.length === 0, errors.map((e) => e.errorId).join(', '))
  }

  const failed = []
  p.on('requestfailed', (r) => failed.push(r.url()))
  await p.context().setOffline(true)
  await p.reload({ waitUntil: 'load' })
  check(B, 'offline, a reload opens the app', await until(() => p.getByRole('button', { name: /Cargar un ejemplo/ }).isVisible(), { timeout: 10000 }))
  await startSample(p)
  check(B, 'offline, the sample opens in the preview', true)
  await step(p, 'Exportar')
  const download = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.getByRole('button', { name: 'Descargar PDF' }).click()]).then(([d]) => d).catch(() => null)
  check(B, 'offline, the PDF downloads', !!download && /\.pdf$/.test(download.suggestedFilename()), download ? download.suggestedFilename() : 'no download')
  // Offline, only requests to other sites may fail (ipwho.is), and the console says so for each; the
  // app's own files must all come from the cache. Editor extensions that inject a logger into the
  // local server's page (Console Ninja) fail too, on a websocket to 127.0.0.1: not the app.
  const own = failed.filter((url) => new URL(url).origin === new URL(BASE).origin)
  check(B, 'offline, every file of the app comes from the cache', own.length === 0, own.join(' | '))
  const errs = p.errs.filter((e) => !/Failed to load resource|Console Ninja|ws:\/\/127\.0\.0\.1:/.test(e))
  check(B, 'offline, no errors from the app', errs.length === 0, errs.join(' | '))
  await p.context().setOffline(false)
  await p.context().close()
}

module.exports = { run, BASE }
