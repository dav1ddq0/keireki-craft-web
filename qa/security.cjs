// Hostile files through the built site (`vite preview`: production bundle and CSP), in Chromium.
//   - evil.json / typeconfusion.json (qa/fixtures/security): markup in every field, script and data
//     URLs, PDF-syntax injection, a bidi override in the name, __proto__, wrong types. Imported through
//     the UI, then exported every way: nothing may run, nothing may leave the origin, and every output
//     (direct PDF, printed PDF, HTML, JSON) is checked for what it really contains.
//   - evil-import.pdf: OpenAction JavaScript, a javascript: link, markup in the text, through PDF import.
// Usage: npm run qa:security (builds first). Files in .qa/security/.
const fs = require('node:fs')
const path = require('node:path')
const { ROOT, startServer } = require('./lib/server.cjs')

const FIXTURES = path.join(__dirname, 'fixtures/security')
const OUT = path.join(ROOT, '.qa/security')
const STEPS = ['Datos personales', 'Experiencia', 'Formación', 'Competencias', 'Idiomas', 'Secciones propias', 'Plantilla y estilo', 'Exportar']

/**
 * The one request the editor may make off its origin (spec 056): the phone's default country, code
 * only, no IP in the answer. Matched exactly, so any other URL, or any other query, still fails.
 */
const ALLOWED_FOREIGN = new Set(['https://ipwho.is/?fields=country_code'])

/** A page that records requests leaving `origin`, page errors and dialogs (dismissed). */
function watch(page, origin) {
  const seen = { foreign: new Set(), errors: [], dialogs: [] }
  page.on('request', (r) => {
    const url = r.url()
    if (!url.startsWith(origin) && !/^(data|blob):/.test(url) && !ALLOWED_FOREIGN.has(url)) seen.foreign.add(url.slice(0, 80))
  })
  page.on('pageerror', (e) => seen.errors.push('pageerror: ' + e.message.slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && seen.errors.push(m.text().slice(0, 160)))
  page.on('dialog', (d) => {
    seen.dialogs.push(d.message())
    d.dismiss()
  })
  return seen
}

/** What a PDF really holds, read with pdf.js: document JavaScript, open action, attachments, links. */
async function pdfStructure(file) {
  const pdfjs = await import(require.resolve('pdfjs-dist/legacy/build/pdf.mjs'))
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), isEvalSupported: false }).promise
  const links = []
  const otherAnnots = []
  for (let i = 1; i <= doc.numPages; i++) {
    for (const a of await (await doc.getPage(i)).getAnnotations()) {
      if (a.subtype === 'Link') links.push({ action: a.action ?? null, unsafe: a.unsafeUrl ?? null })
      else otherAnnots.push(a.subtype)
    }
  }
  return {
    docJS: await doc.getJSActions(),
    openAction: await doc.getOpenAction(),
    attachments: await doc.getAttachments(),
    links: links.length,
    nonHttpLinks: links.filter((l) => l.action || (l.unsafe && !/^https?:\/\//i.test(l.unsafe))),
    otherAnnots,
  }
}

async function hostileJson(browser, name, origin, check, until) {
  const B = name
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES', acceptDownloads: true })
  const p = await ctx.newPage()
  const seen = watch(p, origin)
  await p.goto(process.env.BASE, { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: /Importar/ }).first().click()
  await p.locator('input[type=file][accept*="json"]').setInputFiles(path.join(FIXTURES, `${name}.json`))
  check(B, 'the file imports and the editor opens', await until(() => p.locator('.editor-form').isVisible(), { timeout: 5000 }))
  await p.waitForTimeout(800)
  const state = await p.evaluate(() => ({ xss: window.__xss ?? null, polluted: {}.polluted ?? null }))
  check(B, 'no injected script ran', state.xss === null, JSON.stringify(state))
  check(B, 'no prototype pollution', state.polluted === null)
  const preview = await p.locator('.pane .cv-page').first().innerText().catch((e) => 'ERR ' + e.message)
  check(B, 'the preview renders (text, not markup)', !preview.startsWith('ERR') && (name !== 'evil' || preview.includes('<img src=x')), preview.slice(0, 60).replace(/\n/g, ' '))
  const hrefs = await p.locator('.pane .cv-page a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
  check(B, 'every link in the CV is http(s)', hrefs.every((h) => /^https?:\/\//i.test(h)), hrefs.join(' , '))
  const imgs = await p.locator('.pane .cv-page img').evaluateAll((is) => is.map((i) => i.getAttribute('src')))
  check(B, 'no remote image in the CV', imgs.every((s) => !/^https?:/i.test(s)), imgs.join(','))

  let stepsOk = true
  for (const step of STEPS) {
    try {
      await p.locator('nav button.row', { hasText: step }).first().click({ timeout: 3000 })
    } catch {
      stepsOk = false
      break
    }
    await p.waitForTimeout(150)
  }
  check(B, 'all steps render', stepsOk && (await p.getByRole('heading', { name: 'Exportar', exact: true }).first().isVisible()))
  if (!stepsOk) {
    check(B, 'no console errors', false, seen.errors.join(' | '))
    await ctx.close()
    return
  }

  // Exports.
  await p.evaluate(() => {
    window.__printed = false
    window.print = () => {
      window.__printed = true
    }
  })
  const out = {}
  for (const [key, button] of [
    ['pdf', p.getByRole('button', { name: 'Descargar PDF' })],
    ['html', p.locator('.option', { hasText: 'HTML autocontenido' }).getByRole('button')],
    ['json', p.locator('.option', { hasText: 'JSON' }).getByRole('button')],
  ]) {
    try {
      const [download] = await Promise.all([p.waitForEvent('download', { timeout: 20_000 }), button.click()])
      const file = path.join(OUT, `${name}.${key}`)
      await download.saveAs(file)
      out[key] = { file, suggested: download.suggestedFilename() }
    } catch (e) {
      out[key] = { error: e.message.split('\n')[0] }
    }
  }
  await p.getByRole('button', { name: 'Imprimir / Guardar como PDF' }).click()
  const printed = await until(() => p.evaluate(() => window.__printed), { timeout: 20_000 })
  let printFile = null
  if (printed) {
    printFile = path.join(OUT, `${name}.print.pdf`)
    fs.writeFileSync(printFile, await p.pdf({ preferCSSPageSize: true, printBackground: true }))
    await p.evaluate(() => window.dispatchEvent(new Event('afterprint')))
  }
  check(B, 'print path works', Boolean(printed))
  for (const [key, v] of Object.entries(out)) check(B, `${key} export works`, !v.error, v.error || v.suggested)
  const names = Object.values(out).filter((v) => v.suggested).map((v) => v.suggested)
  check(B, 'download names have no path separators or control/bidi characters', names.every((n) => !/[\\/\u0000-\u001f‪-‮⁦-⁩]/.test(n)), names.map((n) => JSON.stringify(n)).join(' '))

  for (const file of [out.pdf?.file, printFile].filter(Boolean)) {
    const tag = path.basename(file)
    let r
    try {
      r = await pdfStructure(file)
    } catch (e) {
      r = { error: e.message.split('\n')[0] }
    }
    check(B, `${tag}: parses, no document JavaScript / open action / attachments`, !r.error && !r.docJS && !r.openAction && !r.attachments, JSON.stringify(r).slice(0, 160))
    check(B, `${tag}: every link annotation is an http(s) URL, no actions`, !r.error && r.nonHttpLinks.length === 0 && r.otherAnnots.length === 0, `${r.links} links`)
  }

  if (out.html?.file) {
    // Opened as a document: what it really contains, not what its text mentions.
    const hp = await ctx.newPage()
    const htmlForeign = []
    hp.on('request', (r) => {
      if (!/^(file|data):/.test(r.url())) htmlForeign.push(r.url().slice(0, 80))
    })
    hp.on('dialog', (d) => {
      seen.dialogs.push('html: ' + d.message())
      d.dismiss()
    })
    await hp.goto('file://' + out.html.file)
    await hp.waitForTimeout(500)
    const dom = await hp.evaluate(() => {
      const handlers = [...document.querySelectorAll('*')].filter((el) => [...el.attributes].some((a) => /^on/i.test(a.name))).length
      const hrefs = [...document.querySelectorAll('[href]')].map((el) => el.getAttribute('href'))
      const srcs = [...document.querySelectorAll('[src]')].map((el) => el.getAttribute('src'))
      const cssUrls = []
      for (const sheet of document.styleSheets) {
        for (const rule of sheet.cssRules) {
          const urls = rule.cssText.match(/url\(([^)]*)\)/g)
          if (urls) cssUrls.push(...urls.filter((u) => !/data:/.test(u)))
        }
      }
      return {
        csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') ?? '',
        scripts: document.querySelectorAll('script').length,
        iframes: document.querySelectorAll('iframe, object, embed').length,
        handlers,
        badHrefs: hrefs.filter((h) => !/^https?:\/\//i.test(h)),
        remoteSrcs: srcs.filter((s) => !/^data:/i.test(s)),
        cssUrls,
      }
    })
    check(B, 'HTML export: no <script>/<iframe>, no on* attributes, only http(s) links', dom.scripts === 0 && dom.iframes === 0 && dom.handlers === 0 && dom.badHrefs.length === 0, JSON.stringify(dom).slice(0, 160))
    check(B, 'HTML export: images and CSS load nothing remote', dom.remoteSrcs.length === 0 && dom.cssUrls.length === 0, JSON.stringify({ src: dom.remoteSrcs, css: dom.cssUrls }).slice(0, 160))
    check(B, 'HTML export: its own CSP forbids scripts and remote loads (spec 069)', /default-src 'none'/.test(dom.csp) && !/script-src|https?:/.test(dom.csp), dom.csp)
    check(B, 'HTML export opened: nothing ran, nothing fetched', (await hp.evaluate(() => window.__xss ?? null)) === null && htmlForeign.length === 0, htmlForeign.join(' , '))
    await hp.close()
  }
  if (out.json?.file) {
    const j = JSON.parse(fs.readFileSync(out.json.file, 'utf8'))
    check(B, 'JSON export: style sanitised', /^#[0-9a-f]{3,6}$/i.test(j.style.accentColor) && !/url\(/i.test(JSON.stringify(j.style)), JSON.stringify(j.style).slice(0, 120))
    check(B, 'JSON export: photo is not remote', !j.personal.photo || !/^https?:/i.test(j.personal.photo))
  }
  check(B, 'no request left the origin', seen.foreign.size === 0, [...seen.foreign].join(' , '))
  check(B, 'no dialog was opened', seen.dialogs.length === 0, seen.dialogs.join(' | '))
  check(B, 'no console errors', seen.errors.length === 0, seen.errors.join(' | '))
  await ctx.close()
}

async function hostilePdfImport(browser, origin, check, until) {
  const B = 'pdf import'
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' })).newPage()
  const seen = watch(p, origin)
  await p.goto(process.env.BASE, { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: /Importar/ }).first().click()
  await p.locator('input[type=file][accept*="pdf"]').setInputFiles(path.join(FIXTURES, 'evil-import.pdf'))
  check(B, 'the hostile PDF opens in the review screen', await until(async () => /Eva/.test(await p.locator('.import').innerText()), { timeout: 20_000 }))
  const apply = p.getByRole('button', { name: /Crear|Aplicar|nuevo CV/i }).first()
  if (await apply.count()) {
    await apply.click()
    await until(() => p.locator('.editor-form').isVisible(), { timeout: 5000 })
  }
  await p.waitForTimeout(800)
  check(B, 'nothing from the PDF ran (OpenAction, link, markup)', (await p.evaluate(() => window.__xss ?? null)) === null)
  const hrefs = await p.locator('.pane .cv-page a').evaluateAll((as) => as.map((a) => a.getAttribute('href'))).catch(() => [])
  check(B, 'links in the resulting CV are http(s) only', hrefs.every((h) => /^https?:\/\//i.test(h)), hrefs.join(' , ') || 'no links')
  check(B, 'no request left the origin', seen.foreign.size === 0, [...seen.foreign].join(' , '))
  check(B, 'no dialog, no page error', seen.dialogs.length === 0 && seen.errors.length === 0, [...seen.dialogs, ...seen.errors].join(' | '))
}

/** Clickjacking: another page that frames the app gets a link, not the editor (spec 047). */
async function framedApp(browser, url, check) {
  const B = 'frame'
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  await p.setContent(`<iframe id="f" src="${url}" width="1200" height="800"></iframe>`)
  const frame = await (await p.waitForSelector('#f')).contentFrame()
  await frame.waitForLoadState('networkidle').catch(() => {})
  const found = await frame.evaluate(() => ({ app: Boolean(document.querySelector('#app')), buttons: document.querySelectorAll('button').length, links: document.querySelectorAll('a').length }))
  check(B, 'the app does not start inside a frame', !found.app && found.buttons === 0, JSON.stringify(found))
  check(B, 'the frame offers a link that opens it on its own', found.links === 1)
  await ctx.close()
}

;(async () => {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  const server = await startServer('preview')
  process.env.BASE = server.url
  const { chromium, check, results, until } = require('./e2e/lib.cjs')
  const origin = new URL(server.url).origin
  const browser = await chromium.launch()
  try {
    for (const name of ['evil', 'typeconfusion']) await hostileJson(browser, name, origin, check, until)
    await hostilePdfImport(browser, origin, check, until)
    await framedApp(browser, server.url, check)
  } finally {
    await browser.close()
    server.stop()
  }
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} [${r.block}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`)
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks pass · files in ${path.relative(ROOT, OUT)}/`)
  process.exitCode = failed.length ? 1 : 0
})()
