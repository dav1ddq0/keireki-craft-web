// Upload → download → upload again, per template, through the built site (`vite preview`), in Chromium.
//   - A JSON file made hard on purpose (Ł Ø ß ř, curly quotes, a link) is uploaded with a photo framed
//     in the crop dialog, then downloaded as direct PDF, print, HTML and JSON (spec 037).
//   - Each download is checked for what it holds, the JSON is uploaded again (exact round trip, the
//     photo shows) and both PDFs go through PDF import (name and e-mail recovered whole).
//   - The name, the headline and the sections PDF import rebuilds are checked too (spec 040): the experiences, education entries,
//     skill items and languages of the uploaded CV come back in number, in every template and both PDFs.
//     The CV is the app's own, so this measures the heuristics on the 13 layouts, not on any PDF.
// Usage: npm run qa:roundtrip (builds first). Files in .qa/roundtrip/.
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { ROOT, startServer } = require('./lib/server.cjs')

const OUT = path.join(ROOT, '.qa/roundtrip')
const PHOTO = path.join(__dirname, 'fixtures/portrait.jpg')
const TEMPLATES = fs
  .readdirSync(path.join(ROOT, 'src/templates'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(ROOT, 'src/templates', entry.name, 'Template.vue')))
  .map((entry) => entry.name)
/** Its name is letter-spaced: pdf.js returns single letters evenly spaced, so the word gap is lost. */
const NAME_NOT_RECOVERED = new Set()

const strip = (cv) => {
  const copy = JSON.parse(JSON.stringify(cv))
  delete copy.meta.id
  delete copy.meta.createdAt
  delete copy.meta.updatedAt
  return copy
}
const withoutPhoto = (cv) => {
  const copy = strip(cv)
  delete copy.personal.photo
  return copy
}
const diff = (a, b, at = '') => {
  if (JSON.stringify(a) === JSON.stringify(b)) return []
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diff(a[k], b[k], `${at}.${k}`))
  }
  return [`${at}: ${JSON.stringify(a)?.slice(0, 60)} ≠ ${JSON.stringify(b)?.slice(0, 60)}`]
}
/** Templates may set text in capitals with CSS, so text is compared without case. */
const fold = (text) => text.replace(/\s+/g, ' ').toLocaleLowerCase('es')
/** pdftotext spaces out letter-spaced text ("ca l i d a d"), so PDF text is compared without spaces. */
const squash = (text) => fold(text).replace(/ /g, '')
const pdfText = (file) => execFileSync('pdftotext', [file, '-']).toString()
const pdfPages = (file) => Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [file]).toString())[1])
const pdfImages = (file) => execFileSync('pdfimages', ['-list', file]).toString().trim().split('\n').slice(2).filter(Boolean)

;(async () => {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  const server = await startServer('preview')
  process.env.BASE = server.url
  const { chromium, check, results, until, open, step, startSample } = require('./e2e/lib.cjs')
  const browser = await chromium.launch()

  const download = async (p, locator, file) => {
    const [d] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), locator.click()])
    await d.saveAs(file)
    return d.suggestedFilename()
  }
  const exportJson = (p, file) => download(p, p.locator('.option', { hasText: 'JSON' }).getByRole('button'), file)
  const importJson = async (p, file) => {
    await p.getByRole('button', { name: /Importar/ }).first().click()
    await p.locator('input[type=file][accept*="json"]').setInputFiles(file)
    return until(() => p.locator('.editor-form').isVisible(), { timeout: 6000 })
  }
  const previewPhoto = (p) => until(() => p.locator('.pane .cv-page img').count(), { timeout: 3000 })

  const report = []
  try {
    // The fixture: the sample as the app downloads it, made harder.
    const fixture = await (async () => {
      const p = await open(browser)
      await startSample(p)
      await step(p, 'Exportar')
      const file = path.join(OUT, 'sample.json')
      await exportJson(p, file)
      await p.context().close()
      return JSON.parse(fs.readFileSync(file, 'utf8'))
    })()
    fixture.personal.fullName = 'Łucja Øster-Ñúñez'
    fixture.personal.email = 'lucja.oster@example.com'
    fixture.personal.headline = 'Ingeniera de datos · “calidad” y ‘rigor’'
    fixture.summary = 'Dvořák, Straße, façade, naïve: textos con acentos, ß, ç, ř y — guiones largos.'
    fixture.personal.links = [{ id: 'lk1', label: '', url: 'https://github.com/lucja-oster' }]

    for (const id of TEMPLATES) {
      const dir = path.join(OUT, id)
      const f = (name) => path.join(dir, name)
      fs.mkdirSync(dir)
      const src = { ...fixture, meta: { ...fixture.meta, templateId: id } }
      fs.writeFileSync(f('upload.json'), JSON.stringify(src, null, 1))
      const p = await open(browser)
      const row = { id }

      // 1 · Upload the JSON and a photo.
      check(id, 'JSON uploads', await importJson(p, f('upload.json')))
      await p.locator('.photo-drop input[type=file]').setInputFiles(PHOTO)
      await p.locator('dialog.crop[open] canvas').waitFor({ timeout: 5000 })
      await p.getByRole('button', { name: 'Usar foto' }).click()
      await until(async () => !(await p.locator('dialog.crop[open]').count()), { timeout: 5000 })
      const shows = Boolean(await previewPhoto(p))

      // 2 · Download every way.
      await step(p, 'Exportar')
      const pdfName = await download(p, p.getByRole('button', { name: 'Descargar PDF' }), f('direct.pdf'))
      const htmlName = await download(p, p.locator('.option', { hasText: 'HTML autocontenido' }).getByRole('button'), f('cv.html'))
      const jsonName = await exportJson(p, f('down.json'))
      await p.evaluate(() => {
        window.__printed = false
        window.print = () => (window.__printed = true)
      })
      await p.getByRole('button', { name: 'Imprimir / Guardar como PDF' }).click()
      await until(() => p.evaluate(() => window.__printed), { timeout: 20000 })
      fs.writeFileSync(f('print.pdf'), await p.pdf({ preferCSSPageSize: true, printBackground: true }))
      await p.evaluate(() => window.dispatchEvent(new Event('afterprint')))

      check(id, 'file names keep the name', pdfName === 'Łucja Øster-Ñúñez – CV.pdf' && htmlName === 'Łucja Øster-Ñúñez – CV.html' && jsonName === 'Łucja Øster-Ñúñez – CV.json', `${pdfName} · ${htmlName} · ${jsonName}`)
      const down = JSON.parse(fs.readFileSync(f('down.json'), 'utf8'))
      check(id, 'downloaded JSON carries the photo as a data URL', /^data:image\/(jpeg|png|webp);base64,/.test(down.personal.photo || ''), (down.personal.photo || 'none').slice(0, 30))
      const changed = diff(withoutPhoto(src), withoutPhoto(down))
      check(id, 'downloaded JSON = uploaded JSON, apart from the photo', changed.length === 0, changed.slice(0, 4).join(' | '))

      const text = squash(pdfText(f('direct.pdf')))
      const missing = ['Łucja Øster-Ñúñez', 'lucja.oster@example.com', 'Dvořák', 'Straße', '“calidad”', 'ř'].filter((s) => !text.includes(squash(s)))
      check(id, 'direct PDF has the name, e-mail and accents as text', missing.length === 0, missing.join(', '))
      check(id, 'direct PDF and print have the same pages', pdfPages(f('direct.pdf')) === pdfPages(f('print.pdf')), `${pdfPages(f('direct.pdf'))}/${pdfPages(f('print.pdf'))}`)
      const images = pdfImages(f('direct.pdf'))
      check(id, 'direct PDF embeds the photo only when the template shows it', shows ? images.length >= 1 : images.length === 0, `${images.length} images, preview photo ${shows}`)
      const hp = await p.context().newPage()
      await hp.goto('file://' + f('cv.html'))
      const html = await hp.evaluate(() => ({
        text: document.body.innerText,
        images: document.images.length,
        broken: [...document.images].filter((i) => !i.naturalWidth).length,
      }))
      await hp.close()
      check(id, 'HTML opens from disk with the name and, if shown, the photo', fold(html.text).includes(fold('Łucja Øster-Ñúñez')) && (!shows || (html.images > 0 && html.broken === 0)), `${html.images} images, ${html.broken} broken`)

      // 3 · Upload the downloaded JSON again: nothing changes and the photo shows (spec 037).
      check(id, 'downloaded JSON uploads again', await importJson(p, f('down.json')))
      check(id, 'the photo shows after the JSON upload', Boolean(await previewPhoto(p)) === shows)
      await step(p, 'Exportar')
      await exportJson(p, f('down2.json'))
      const again = diff(strip(down), strip(JSON.parse(fs.readFileSync(f('down2.json'), 'utf8'))))
      check(id, 'JSON round trip is exact, photo bytes included', again.length === 0, again.slice(0, 4).join(' | '))

      // 4 · Upload both PDFs through PDF import.
      for (const kind of ['direct', 'print']) {
        await p.getByRole('button', { name: /Importar/ }).first().click()
        await p.locator('input[type=file][accept*="pdf"]').setInputFiles(f(`${kind}.pdf`))
        const reviewed = await until(async () => /Łucja|Revisa lo detectado/.test(await p.locator('.import').innerText()), { timeout: 30000 })
        check(id, `${kind} PDF uploads into the review`, reviewed)
        if (!reviewed) continue
        await p.getByRole('button', { name: 'Importar a un CV nuevo' }).click()
        await until(() => p.locator('.editor-form').isVisible(), { timeout: 6000 })
        await step(p, 'Exportar')
        await exportJson(p, f(`from-${kind}.json`))
        const got = JSON.parse(fs.readFileSync(f(`from-${kind}.json`), 'utf8'))
        if (!NAME_NOT_RECOVERED.has(id)) check(id, `${kind} PDF import recovers the name`, got.personal.fullName === src.personal.fullName, JSON.stringify(got.personal.fullName))
        check(id, `${kind} PDF import recovers the headline`, fold(got.personal.headline) === fold(src.personal.headline), JSON.stringify(got.personal.headline))
        check(id, `${kind} PDF import recovers the e-mail`, got.personal.email === src.personal.email, JSON.stringify(got.personal.email))
        const items = (cv) => cv.skills.reduce((n, g) => n + g.items.length, 0)
        for (const [what, found, wanted] of [['experiences', got.experience.length, src.experience.length], ['education entries', got.education.length, src.education.length], ['skill items', items(got), items(src)], ['languages', got.languages.length, src.languages.length]]) {
          check(id, `${kind} PDF import recovers the ${what}`, found === wanted, `${found}/${wanted}`)
        }
        row[kind] = `exp ${got.experience.length}/${src.experience.length} · edu ${got.education.length}/${src.education.length} · skills ${items(got)}/${items(src)} · langs ${got.languages.length}/${src.languages.length} · phone ${got.personal.phone === src.personal.phone ? 'ok' : 'lost'} · summary ${got.summary.trim() === src.summary ? 'ok' : got.summary ? 'partial' : 'lost'}`
      }
      check(id, 'no console errors', p.errs.length === 0, p.errs.join(' | '))
      report.push(row)
      await p.context().close()
    }
  } finally {
    await browser.close()
    server.stop()
  }

  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} [${r.block}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`)
  console.log('\nPDF import, recovered/uploaded:')
  for (const r of report) for (const kind of ['direct', 'print']) if (r[kind]) console.log(`  ${r.id.padEnd(10)} ${kind.padEnd(6)} ${r[kind]}`)
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks pass · files in ${path.relative(ROOT, OUT)}/`)
  process.exitCode = failed.length ? 1 : 0
})()
