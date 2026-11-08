// Performance of the whole flow on the built site, measured inside the page where latency matters.
const fs = require('fs')
const path = require('path')
const { check, timing, until, open, previewText, previewHas, step, startSample } = require('./lib.cjs')
const pdfjsPromise = import(require.resolve('pdfjs-dist/legacy/build/pdf.mjs'))

const B = 'perf'
const pct = (xs, q) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * q))]

/** Types one character into `input` and waits for the frame where the preview shows it. */
async function keystrokeLatency(p, label, samples) {
  const input = p.getByLabel(label, { exact: true })
  const out = []
  for (let i = 0; i < samples; i++) {
    out.push(
      await input.evaluate(async (el, i) => {
        const page = document.querySelector('.pane .cv-page')
        const next = el.value + String.fromCharCode(97 + (i % 26))
        const t0 = performance.now()
        el.value = next
        el.dispatchEvent(new Event('input', { bubbles: true }))
        await new Promise((r) => {
          const tick = () => (page.textContent.includes(next) ? r() : requestAnimationFrame(tick))
          tick()
        })
        // The frame that shows it has been produced once the next one starts.
        await new Promise((r) => requestAnimationFrame(() => r()))
        return performance.now() - t0
      }, i),
    )
  }
  return out
}

/** Long tasks (> 50 ms on the main thread) seen since the last call. */
const installLongTasks = (p) =>
  p.evaluate(() => {
    window.__long = []
    new PerformanceObserver((l) => window.__long.push(...l.getEntries().map((e) => e.duration))).observe({ type: 'longtask', buffered: true })
  })
const takeLongTasks = (p) => p.evaluate(() => window.__long.splice(0))

async function run(browser, outDir) {
  const p = await open(browser)
  await installLongTasks(p)

  // ---- cold load -------------------------------------------------------------------------------
  const load = await p.evaluate(async () => {
    const nav = performance.getEntriesByType('navigation')[0]
    const lcp = await new Promise((r) => {
      new PerformanceObserver((l) => r(l.getEntries().at(-1).startTime)).observe({ type: 'largest-contentful-paint', buffered: true })
      setTimeout(() => r(null), 1000)
    })
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime
    const res = performance.getEntriesByType('resource')
    const sum = (f) => res.filter(f).reduce((s, r) => s + (r.encodedBodySize || 0), 0)
    return {
      dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, fcp, lcp,
      js: sum((r) => r.name.endsWith('.js')), css: sum((r) => r.name.endsWith('.css')),
      fonts: sum((r) => /\.woff2?$/.test(r.name)), requests: res.length,
    }
  })
  timing(B, 'cold load: first contentful paint', load.fcp, 1000)
  timing(B, 'cold load: largest contentful paint', load.lcp, 1500)
  timing(B, 'cold load: DOMContentLoaded', load.dcl, 1000)
  const kb = (n) => Math.round(n / 1024)
  check(B, 'first load: JS / CSS / fonts transferred (KB, compressed bodies)', true, `${kb(load.js)} / ${kb(load.css)} / ${kb(load.fonts)} in ${load.requests} requests`)

  // ---- sample CV -------------------------------------------------------------------------------
  let t0 = Date.now()
  await startSample(p)
  timing(B, 'welcome → sample CV in the preview', Date.now() - t0, 1000)

  // ---- typing ----------------------------------------------------------------------------------
  await takeLongTasks(p)
  const typing = await keystrokeLatency(p, 'Nombre completo', 30)
  timing(B, 'keystroke → preview, sample CV (p50)', pct(typing, 0.5), 50)
  timing(B, 'keystroke → preview, sample CV (p95)', pct(typing, 0.95), 100)
  const longTyping = await takeLongTasks(p)
  check(B, 'no long tasks while typing in the sample CV', longTyping.length === 0, longTyping.map(Math.round).join(', '))

  // ---- step switching --------------------------------------------------------------------------
  const steps = ['Resumen', 'Experiencia', 'Formación', 'Competencias', 'Idiomas', 'Secciones propias', 'Plantilla y estilo', 'Exportar', 'Datos personales']
  const stepTimes = []
  for (const name of steps) {
    const btn = p.locator('nav button.row', { hasText: name }).first()
    stepTimes.push(
      await btn.evaluate(async (el, name) => {
        const t0 = performance.now()
        el.click()
        await new Promise((r) => {
          const tick = () => ([...document.querySelectorAll('h2,h1')].some((h) => h.textContent.trim() === name) ? r() : requestAnimationFrame(tick))
          tick()
        })
        return performance.now() - t0
      }, name),
    )
  }
  timing(B, 'step switch (worst of 9)', Math.max(...stepTimes), 100)
  timing(B, 'step switch (median)', pct(stepTimes, 0.5), 50)

  // ---- template switching ----------------------------------------------------------------------
  await step(p, 'Plantilla y estilo')
  const ids = ['amber', 'aurora', 'banner', 'chevron', 'cobalt', 'classic', 'compact', 'editorial', 'facet', 'frame', 'harbor', 'ledger', 'meridian', 'modern', 'monogram', 'monograph', 'retro', 'freelance']
  const cold = []
  for (const id of ids) {
    const card = p.getByRole('button', { name: new RegExp('^' + id, 'i') }).first()
    if (!(await card.count())) continue
    cold.push(
      await card.evaluate(async (el, id) => {
        const t0 = performance.now()
        el.click()
        await new Promise((r) => {
          const tick = () => (document.querySelector(`.pane .cv-page article.${id}`) ? r() : requestAnimationFrame(tick))
          tick()
        })
        return performance.now() - t0
      }, id),
    )
  }
  timing(B, 'template switch, first time (worst)', Math.max(...cold), 300)
  timing(B, 'template switch, first time (median)', pct(cold, 0.5), 150)
  const warmCard = p.getByRole('button', { name: /^classic/i }).first()
  const warm = await warmCard.evaluate(async (el) => {
    const t0 = performance.now()
    el.click()
    await new Promise((r) => {
      const tick = () => (document.querySelector('.pane .cv-page article.classic') ? r() : requestAnimationFrame(tick))
      tick()
    })
    return performance.now() - t0
  })
  timing(B, 'template switch, already loaded', warm, 100)

  // ---- a long CV ---------------------------------------------------------------------------------
  // Same sample, experience × 8 (48 jobs), imported through the UI as a new CV.
  const big = await p.evaluate(() => {
    const req = indexedDB.open('keireki-craft')
    return new Promise((r) => {
      req.onsuccess = () => {
        const all = req.result.transaction('kv').objectStore('kv').getAll()
        all.onsuccess = () => r(all.result.find((v) => v && v.personal && v.personal.fullName))
      }
    })
  })
  big.experience = Array.from({ length: Number(process.env.LONG || 8) }, (_, n) => big.experience.map((e) => ({ ...e, id: e.id + '-' + n }))).flat()
  big.meta.title = 'Long CV'
  const bigFile = path.join(outDir, 'long-cv.json')
  fs.writeFileSync(bigFile, JSON.stringify(big))
  await p.getByRole('button', { name: /Importar/ }).first().click()
  await p.locator('input[type=file][accept*="json"]').setInputFiles(bigFile)
  await until(async () => (await p.locator('.pane .cv-page').count()) && (await previewText(p)).length > 0)
  await step(p, 'Datos personales')
  await takeLongTasks(p)
  const longTyping2 = await keystrokeLatency(p, 'Nombre completo', 20)
  timing(B, `keystroke → preview, long CV with ${big.experience.length} jobs (p50)`, pct(longTyping2, 0.5), 50)
  timing(B, `keystroke → preview, long CV (p95)`, pct(longTyping2, 0.95), 100)
  const lt = await takeLongTasks(p)
  check(B, 'long CV: long tasks while typing', lt.length === 0, `${lt.length} (${lt.map(Math.round).join(', ')} ms)`)

  // ---- paginated preview -----------------------------------------------------------------------
  await step(p, 'Exportar')
  t0 = Date.now()
  await p.locator('.paginated-head').getByRole('button').click()
  // paged.js adds pages one by one: done when the count has held for 300 ms.
  let last = -1, since = Date.now()
  const pages = await until(async () => {
    const n = await p.locator('.paginated .pagedjs_page').count()
    if (n !== last) { last = n; since = Date.now(); return false; }
    return n > 0 && Date.now() - since >= 300 && n
  }, { timeout: 20000 })
  t0 += 300
  timing(B, 'paginated preview of the long CV (debounce 400 ms included)', Date.now() - t0, 2500)
  check(B, 'paginated preview shows pages', pages > 1, `${pages} pages`)

  // ---- PDF through the browser's print -------------------------------------------------------
  await p.evaluate(() => {
    window.__printAt = 0
    window.print = () => { window.__printAt = performance.now(); }
  })
  const printBtn = p.getByRole('button', { name: 'Imprimir / Guardar como PDF' })
  const clickAt = await printBtn.evaluate((el) => { const t = performance.now(); el.click(); return t; })
  await until(() => p.evaluate(() => window.__printAt), { timeout: 30000 })
  const printAt = await p.evaluate(() => window.__printAt)
  timing(B, 'Print/PDF click → print dialog (long CV, paged.js)', printAt - clickAt, 3000)
  const paged = await p.locator('#print-root .pagedjs_page').count()
  const title = await p.evaluate(() => document.title)
  t0 = Date.now()
  const buf = await p.pdf({ preferCSSPageSize: true, printBackground: true })
  timing(B, "Chromium's print to PDF (long CV)", Date.now() - t0, 5000)
  await p.evaluate(() => window.dispatchEvent(new Event('afterprint')))
  const pdfjs = await pdfjsPromise
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
  const blanks = []
  let text = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const items = (await page.getTextContent()).items.filter((it) => it.str.trim())
    if (!items.length) blanks.push(i)
    text += items.map((it) => it.str).join(' ') + ' '
  }
  // Embedded subsets are named "ABCDEF+Family"; the raw PDF lists them as /BaseFont.
  const fonts = new Set([...buf.toString('latin1').matchAll(/\/BaseFont\s*\/(?:[A-Z]{6}\+)?([^\s/<>\[\]]+)/g)].map((m) => m[1]))
  check(B, 'printed PDF: same page count as paged.js, no blank pages', doc.numPages === paged && blanks.length === 0, `paged ${paged}, pdf ${doc.numPages}, blank ${blanks.join(',') || '-'}`)
  check(B, 'printed PDF: has the CV text', text.includes('Nadia') && /Cartograf/.test(text))
  check(B, 'printed PDF: fonts embedded', fonts.size > 0, [...fonts].join(', '))
  check(B, 'print dialog proposes "<name> – CV" as the file name', /– CV$/.test(title), title)
  const pdfFile = path.join(outDir, 'printed.pdf')
  fs.writeFileSync(pdfFile, buf)
  await until(async () => (await p.evaluate(() => document.title)) !== title)

  // ---- direct PDF download (spec 031) ---------------------------------------------------------------
  t0 = Date.now()
  const [direct] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.getByRole('button', { name: 'Descargar PDF' }).click()])
  const directFile = path.join(outDir, 'direct.pdf')
  await direct.saveAs(directFile)
  timing(B, 'Descargar PDF → file (long CV, first use: PDFKit loaded)', Date.now() - t0, 4000)
  t0 = Date.now()
  const [again] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.getByRole('button', { name: 'Descargar PDF' }).click()])
  await again.path()
  timing(B, 'Descargar PDF → file (long CV, again)', Date.now() - t0, 3000)
  const directDoc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(directFile)) }).promise
  check(B, 'direct PDF: same page count as the printed one', directDoc.numPages === doc.numPages, `${directDoc.numPages} vs ${doc.numPages}`)

  // ---- JPG download (spec 062) ------------------------------------------------------------------
  t0 = Date.now()
  const [jpg] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.getByRole('button', { name: 'Descargar JPG' }).click()])
  const jpgBytes = fs.readFileSync(await jpg.path())
  timing(B, 'Descargar JPG → file (long CV)', Date.now() - t0, 4000)
  // The pages stacked at 192 dpi, 8 pt apart: each band of the image must carry ink, or a page was lost.
  const bands = await p.evaluate(async ([b64, pages]) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }))
    const canvas = Object.assign(document.createElement('canvas'), { width: bitmap.width, height: bitmap.height })
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(bitmap, 0, 0)
    const scale = 192 / 72
    const ink = []
    for (let i = 0; i < pages; i++) {
      const top = Math.round(i * (841.89 + 8) * scale)
      const { data } = ctx.getImageData(0, top, bitmap.width, Math.floor(841.89 * scale))
      let dark = 0
      for (let j = 0; j < data.length; j += 4) if (data[j] + data[j + 1] + data[j + 2] < 600) dark++
      ink.push(dark / (data.length / 4))
    }
    return { width: bitmap.width, height: bitmap.height, ink }
  }, [jpgBytes.toString('base64'), directDoc.numPages])
  const jpgHeight = Math.floor((directDoc.numPages * 841.89 + (directDoc.numPages - 1) * 8) * (192 / 72))
  check(B, 'JPG: a JPEG named "<name> – CV.jpg"', jpgBytes[0] === 0xff && jpgBytes[1] === 0xd8 && /– CV\.jpg$/.test(jpg.suggestedFilename()), jpg.suggestedFilename())
  check(B, 'JPG: every page of the direct PDF, one under the other, at 192 dpi', bands.width === 1587 && Math.abs(bands.height - jpgHeight) <= 1, `${bands.width}×${bands.height}, expected 1587×${jpgHeight}`)
  check(B, 'JPG: no page drawn blank', bands.ink.every((share) => share > 0.003), bands.ink.map((share) => (share * 100).toFixed(1) + ' %').join(', '))

  // ---- copy to the clipboard (spec 062) -----------------------------------------------------------
  await p.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(p.url()).origin })
  t0 = Date.now()
  await p.getByRole('button', { name: 'Copiar imagen' }).click()
  const copied = await until(async () => (await p.locator('.copy-state').first().textContent()) === 'Copiado', { timeout: 30000 })
  timing(B, 'Copiar imagen → on the clipboard (long CV)', Date.now() - t0, 4000)
  const clip = await p.evaluate(async () => {
    const [item] = await navigator.clipboard.read()
    if (!item?.types.includes('image/png')) return { types: item?.types ?? [] }
    const bitmap = await createImageBitmap(await item.getType('image/png'))
    return { types: item.types, width: bitmap.width, height: bitmap.height }
  })
  check(B, 'Copiar imagen puts the whole CV on the clipboard as a PNG', copied && clip.width === bands.width && clip.height === bands.height, `${clip.types.join(',')} ${clip.width}×${clip.height}`)

  // ---- JSON / HTML downloads --------------------------------------------------------------------
  for (const kind of ['JSON', 'HTML']) {
    t0 = Date.now()
    const [d] = await Promise.all([p.waitForEvent('download'), p.locator('.option', { hasText: kind }).getByRole('button').click()])
    await d.path()
    timing(B, `${kind} export → file (long CV)`, Date.now() - t0, kind === 'HTML' ? 2000 : 500)
  }

  // ---- PDF import of the printed PDF ---------------------------------------------------------------
  await p.getByRole('button', { name: /Importar/ }).first().click()
  t0 = Date.now()
  await p.locator('input[type=file][accept*="pdf"]').setInputFiles(pdfFile)
  const reviewed = await until(async () => /Nadia/.test(await p.locator('.import').innerText()), { timeout: 30000 })
  timing(B, 'import of the printed PDF → review screen', Date.now() - t0, 4000)
  check(B, 'the printed PDF imports back (review shows the name)', reviewed)

  const heap = await p.evaluate(() => performance.memory?.usedJSHeapSize)
  check(B, 'JS heap at the end of the flow (MB)', true, heap ? String(Math.round(heap / 1048576)) : 'n/a')
  check(B, 'no console errors', p.errs.length === 0, p.errs.join(' | '))
  await p.context().close()
}

module.exports = { run }
