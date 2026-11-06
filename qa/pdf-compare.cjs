// The direct PDF (spec 031) against the printed one, in Chromium, on the dev server (it imports the
// app's modules by URL). Three parts:
//   1. every template × sample / photo / long / page break / long name / long words: same page count,
//      no text missing, at most MAX_DIFF % of pixels differing; with the long name and the long words,
//      every word where the print has it (spec 072: text that wraps to a new line was drawn a line too
//      high); with the long words, no text out of its column or the page (spec 074);
//   2. a fixture page (half-opaque box, list bullet, dashed and dotted borders) printed by Chromium
//      and converted, compared shape by shape, which the whole-page threshold is too coarse to see;
//   3. the side-column warning (spec 033): off for the sample, on for a side column longer than a page.
// A blank last page in the print fails on its own and is left out of the comparison (spec 036).
// Usage: npm run qa:pdf [-- templateId,...]. Needs poppler (pdftoppm, pdftotext, pdfinfo).
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { chromium } = require('playwright')
const { ROOT, startServer } = require('./lib/server.cjs')
const { renderPages, diffPercent } = require('./lib/images.cjs')

const OUT = path.join(ROOT, '.qa/pdf')
const MODES = ['sample', 'photo', 'long', 'break', 'longname', 'longword', 'longword64']
/**
 * Spec 074: one word with no break, the length of `longword` a real German compound, `longword64`
 * longer still. Each field gets its own, starting with a tag (Name, Skil…) so an overflow names its
 * field; real letters, as a run of one letter is narrower than text.
 */
const LONG_WORDS = { longword: 39, longword64: 64 }
/** Spec 031, criterion 4: share of pixels differing (grey difference > 48) at 50 dpi. */
const MAX_DIFF = 4
const SRC = '/src'

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}

/** A page with no ink at all. */
const isBlank = (img) => img.pixels.every((v) => v > 250)
const pdfText = (pdf) => execFileSync('pdftotext', [pdf, '-']).toString().replace(/\s+/g, '').toLowerCase()

/** Each word of a PDF with its page and top-left corner, in points. */
function pdfWords(pdf) {
  const html = execFileSync('pdftotext', ['-bbox', pdf, '-']).toString()
  const words = []
  let page = -1
  for (const m of html.matchAll(/<page |<word xMin="([\d.]+)" yMin="([\d.]+)"[^>]*>([^<]*)<\/word>/g)) {
    if (m[0] === '<page ') page++
    else words.push({ page, x: Number(m[1]), y: Number(m[2]), text: m[3] })
  }
  return words
}

/**
 * Words of the print that the direct PDF draws more than `tolerance` points away (spec 072). Words
 * of four letters or more: letter-spaced headings come out of pdftotext as single letters.
 */
function misplacedWords(printPdf, directPdf, tolerance = 3) {
  const direct = pdfWords(directPdf)
  return pdfWords(printPdf)
    .filter((word) => word.text.length >= 4)
    .filter((word) => {
      const same = direct.filter((other) => other.page === word.page && other.text === word.text)
      return same.length > 0 && Math.min(...same.map((o) => Math.hypot(o.x - word.x, o.y - word.y))) > tolerance
    })
    .map((word) => `${word.text} (p${word.page + 1})`)
}

/** Characters of `reference` absent from `text`, counted as a multiset (order-insensitive). */
function missingChars(reference, text) {
  const counts = new Map()
  for (const ch of text) counts.set(ch, (counts.get(ch) || 0) + 1)
  let missing = 0
  for (const ch of reference) {
    const n = counts.get(ch) || 0
    if (n > 0) counts.set(ch, n - 1)
    else missing++
  }
  return missing
}

/** Opens the app with `window.__base64(blob)`, how a PDF built in the page comes back to Node. */
async function openApp(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    window.__base64 = async (blob) => {
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let s = ''
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      return btoa(s)
    }
  })
}

/**
 * In the paginated print, the text that runs past the right edge of its column (the nearest aside,
 * main or header) or of the page, as "column:field" (spec 074). The field is the tag a long word
 * starts with, or "text" for any other text pushed out (a column widened by the word).
 */
function textOutside() {
  const out = new Set()
  for (const sheet of document.querySelectorAll('.pagedjs_page')) {
    const edge = sheet.getBoundingClientRect().right
    const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent.trim()
      if (!text) continue
      const column = node.parentElement.closest('aside, main, header')
      const right = Math.min(edge, column ? column.getBoundingClientRect().right : edge)
      const range = document.createRange()
      range.selectNodeContents(node)
      if ([...range.getClientRects()].some((r) => r.width && r.right > right + 1)) {
        const field = text.match(/^(Name|Summ|Posi|Comp|High|Degr|Inst|Edes|Skil|Lang)rechts/)?.[1] ?? 'text'
        out.add(`${column ? column.tagName.toLowerCase() : 'page'}:${field}`)
      }
    }
  }
  return [...out]
}

async function compareTemplates(page, url, ids) {
  const photo = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'fixtures/portrait.jpg')).toString('base64')
  for (const id of ids) {
    for (const mode of MODES) {
      const key = `${id}-${mode}`
      try {
        // Reference: the print path, with window.print stubbed so Playwright can print instead.
        await page.evaluate(
          async ([id, mode, photo, SRC, LONG_WORD]) => {
            window.__printed = false
            window.print = () => {
              window.__printed = true
            }
            const { printCv } = await import(`${SRC}/services/export/pdf.ts`)
            const { createSampleCV } = await import(`${SRC}/core/sample.ts`)
            const cv = createSampleCV()
            if (mode === 'long' || mode === 'break') {
              const entries = cv.experience
              cv.experience = [0, 1, 2, 3].flatMap((n) => entries.map((e) => ({ ...e, id: e.id + n })))
            }
            if (mode === 'break') cv.pageBreaks = ['education']
            if (mode === 'longname') {
              // A last name too long for the line, and positions and companies growing until what follows
              // them on the line (" · company", the location) starts a new one.
              cv.personal.fullName = 'Maximiliana Wolfeschlegelsteinhausen-Bergerdorff'
              const entry = cv.experience[0]
              cv.experience = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
                ...entry,
                id: entry.id + n,
                position: 'Desarrolladora ' + 'senior '.repeat(n),
                company: entry.company + ' Geoespacial'.repeat(n),
              }))
            }
            if (LONG_WORD) {
              const word = (tag) => (tag + 'rechtsschutzversicherungsgesellschaften'.repeat(3)).slice(0, LONG_WORD)
              cv.personal.fullName = word('Name')
              cv.summary = word('Summ')
              Object.assign(cv.experience[0], { position: word('Posi'), company: word('Comp') })
              cv.experience[0].highlights[0] = word('High')
              Object.assign(cv.education[0], { degree: word('Degr'), institution: word('Inst'), description: word('Edes') })
              cv.skills[0].items[0].name = word('Skil')
              cv.languages[0].name = word('Lang')
            }
            if (mode === 'photo') cv.personal.photo = photo
            window.__cv = cv
            window.__done = printCv(cv, id, { paginate: true })
          },
          [id, mode, photo, SRC, LONG_WORDS[mode]],
        )
        await page.waitForFunction(() => window.__printed, null, { timeout: 60_000 })
        const outside = LONG_WORDS[mode] ? await page.evaluate(textOutside) : []
        const printed = await page.pdf({ preferCSSPageSize: true, printBackground: true })
        await page.evaluate(() => {
          window.dispatchEvent(new Event('afterprint'))
          return window.__done
        })
        const printPdf = path.join(OUT, `${key}.print.pdf`)
        fs.writeFileSync(printPdf, printed)

        const direct = await page.evaluate(
          async ([id, SRC]) => {
            const { buildDirectPdf } = await import(`${SRC}/services/export/pdfDirect.ts`)
            return window.__base64(await buildDirectPdf(window.__cv, id, 'Test – CV'))
          },
          [id, SRC],
        )
        const directPdf = path.join(OUT, `${key}.direct.pdf`)
        fs.writeFileSync(directPdf, Buffer.from(direct, 'base64'))

        const printImages = renderPages(printPdf, 50)
        const directImages = renderPages(directPdf, 50)
        let blankTail = 0
        while (printImages.length > 1 && isBlank(printImages.at(-1))) {
          printImages.pop()
          blankTail++
        }
        check(`${key}: the print ends without a blank page`, blankTail === 0, blankTail ? `${blankTail} blank` : '')
        const pages = [printImages.length, directImages.length]
        const missing = missingChars(pdfText(printPdf), pdfText(directPdf))
        const diffs = printImages.map((img, i) => diffPercent(img, directImages[i]))
        const worst = Math.max(...diffs)
        check(
          `${key}: same pages, no text missing, diff ≤ ${MAX_DIFF} %`,
          pages[0] === pages[1] && missing === 0 && worst <= MAX_DIFF,
          `pages ${pages.join('/')}, missing ${missing}, diff ${diffs.map((d) => d.toFixed(1)).join(',')} %`,
        )
        if (LONG_WORDS[mode]) check(`${key}: no text leaves its column or the page`, outside.length === 0, outside.join(', '))
        if (mode === 'longname' || LONG_WORDS[mode]) {
          const misplaced = misplacedWords(printPdf, directPdf)
          check(`${key}: every word where the print has it`, misplaced.length === 0, misplaced.slice(0, 6).join(', '))
        }
      } catch (error) {
        check(`${key}: converts`, false, String(error.message).split('\n')[0])
        await openApp(page, url)
      }
    }
  }
}

/* ---- fixture: shapes the whole-page threshold cannot see ------------------------------------ */

// Laid out in normal flow so the print and paged.js agree on positions without positioned
// ancestors. Text is white: only the shapes under test are dark. Arial resolves to the same
// system font in both pages, so the bullet (sized from the font's ascent) is comparable.
const FIXTURE_HTML = `
<div class="fx" style="padding:20mm;margin:0">
  <div style="opacity:.5;width:40mm;height:20mm;margin:0"><div style="height:100%;background:#000"></div></div>
  <ul class="fx-list" style="margin:20mm 0 0;padding:0 0 0 20mm;font:40px/1.2 Arial,sans-serif;color:#fff;list-style:disc outside"><li style="margin:0;padding:0">x</li></ul>
  <div style="box-sizing:content-box;margin:20mm 0 0;width:120mm;height:10mm;border:2px dashed #000;background:none"></div>
  <div style="box-sizing:content-box;margin:20mm 0 0;width:120mm;height:10mm;border:3px dotted #000;background:none"></div>
</div>`
const FIXTURE_CSS = '@page { size: A4; margin: 0 } .fx-list li::marker { color: #000 }'
const FIXTURE_DPI = 144
/** Blank rows a shape may contain: 5 mm at FIXTURE_DPI. */
const MAX_GAP = 28

/** Bands of rows holding dark pixels, top to bottom, each with its box, mean grey and top-row runs. */
function shapeBands(img) {
  const dark = (x, y) => img.pixels[y * img.width + x] < 200
  const rows = []
  for (let y = 0; y < img.height; y++) {
    let any = false
    for (let x = 0; x < img.width && !any; x++) any = dark(x, y)
    rows.push(any)
  }
  const bands = []
  for (let y = 0; y < img.height; y++) {
    if (!rows[y]) continue
    // A dashed or dotted side border leaves blank rows inside its shape; shapes are 20 mm apart.
    let end = y
    for (let next = y + 1; next < img.height && next - end <= MAX_GAP; next++) if (rows[next]) end = next
    let left = img.width
    let right = -1
    for (let yy = y; yy <= end; yy++) {
      for (let x = 0; x < img.width; x++) {
        if (dark(x, yy)) {
          left = Math.min(left, x)
          right = Math.max(right, x)
        }
      }
    }
    let sum = 0
    for (let yy = y; yy <= end; yy++) for (let x = left; x <= right; x++) sum += img.pixels[yy * img.width + x]
    // Marks along the top border, one row in from its edge (anti-aliasing blurs the edge itself).
    let runs = 0
    for (let x = left, inRun = false; x <= right; x++) {
      const d = dark(x, y + 1)
      if (d && !inRun) runs++
      inRun = d
    }
    bands.push({ top: y, bottom: end, left, right, mean: sum / ((end - y + 1) * (right - left + 1)), runs })
    y = end
  }
  return bands
}

async function compareFixture(browser, page) {
  const printPage = await browser.newPage()
  await printPage.setContent(`<!doctype html><html><head><style>${FIXTURE_CSS} body{margin:0}</style></head><body>${FIXTURE_HTML}</body></html>`)
  const printPdf = path.join(OUT, 'fixture.print.pdf')
  fs.writeFileSync(printPdf, await printPage.pdf({ preferCSSPageSize: true, printBackground: true }))
  await printPage.close()

  const direct = await page.evaluate(
    async ([html, css, SRC]) => {
      const { paginateInto, releasePagination } = await import(`${SRC}/services/export/pdf.ts`)
      const { pdfFromPagination } = await import(`${SRC}/services/export/pdfDirect.ts`)
      const host = document.createElement('div')
      host.style.cssText = 'position:fixed;left:-10000px;top:0'
      document.body.appendChild(host)
      try {
        if (!(await paginateInto(host, html, { app: css, print: '' }))) throw new Error('Pagination failed')
        return window.__base64(await pdfFromPagination(host, 'Fixture', 'en'))
      } finally {
        releasePagination(host)
        host.remove()
      }
    },
    [FIXTURE_HTML, FIXTURE_CSS, SRC],
  )
  const directPdf = path.join(OUT, 'fixture.direct.pdf')
  fs.writeFileSync(directPdf, Buffer.from(direct, 'base64'))

  const [print] = renderPages(printPdf, FIXTURE_DPI)
  const [conv] = renderPages(directPdf, FIXTURE_DPI)
  const p = shapeBands(print)
  const d = shapeBands(conv)
  if (p.length !== 4 || d.length !== 4) {
    check('fixture: four shapes in both PDFs', false, `print ${p.length}, direct ${d.length}`)
    return
  }
  const [box, bullet, dashed, dotted] = [0, 1, 2, 3].map((i) => [p[i], d[i]])
  // 1 pt at 144 dpi is 2 px.
  const tolerance = 2
  check(
    'fixture: opacity of an ancestor reaches the shape',
    Math.abs(box[0].mean - box[1].mean) <= 10,
    `mean grey print ${box[0].mean.toFixed(0)}, direct ${box[1].mean.toFixed(0)}`,
  )
  const centre = (b) => [(b.left + b.right) / 2, (b.top + b.bottom) / 2]
  const [pc, dc] = [centre(bullet[0]), centre(bullet[1])]
  check(
    'fixture: list bullet where Chromium paints it (± 1 pt)',
    Math.abs(pc[0] - dc[0]) <= tolerance && Math.abs(pc[1] - dc[1]) <= tolerance,
    `centre print ${pc.map((v) => v.toFixed(1))}, direct ${dc.map((v) => v.toFixed(1))} px`,
  )
  for (const [name, [a, b]] of [
    ['dashed', dashed],
    ['dotted', dotted],
  ]) {
    check(
      `fixture: ${name} border has the printed marks`,
      a.runs > 1 && Math.abs(a.runs - b.runs) <= 1,
      `marks along the top: print ${a.runs}, direct ${b.runs}`,
    )
  }
}

/* ---- fixture: shadows, SVG boxes and round strokes (spec 050) ----------------------------------- */

const LOOK_HTML = `
<div style="padding:30mm;margin:0">
  <div style="width:40mm;height:20mm;background:#fff;box-shadow:0 3mm 6mm rgba(0,0,0,.7)"></div>
  <div style="width:30mm;height:15mm;margin:30mm 0 0;background:#fff;box-shadow:0 0 0 4mm #666"></div>
  <svg viewBox="0 0 24 24" style="display:block;width:14mm;height:14mm;margin:30mm 0 0;background:#000;border-radius:50%;box-sizing:content-box;padding:2mm"><path d="M4 12h16" style="fill:none;stroke:#fff;stroke-width:6;stroke-linecap:round"/></svg>
</div>`

/** Pixels that are not white: a missing shadow, ring or disc is a visible drop in this count. */
const inked = (img) => img.pixels.reduce((n, v) => n + (v < 245 ? 1 : 0), 0)

async function compareLook(browser, page) {
  const printPage = await browser.newPage()
  await printPage.setContent(`<!doctype html><html><head><style>${FIXTURE_CSS} body{margin:0}</style></head><body>${LOOK_HTML}</body></html>`)
  const printPdf = path.join(OUT, 'look.print.pdf')
  fs.writeFileSync(printPdf, await printPage.pdf({ preferCSSPageSize: true, printBackground: true }))
  await printPage.close()
  const direct = await page.evaluate(
    async ([html, css, SRC]) => {
      const { paginateInto, releasePagination } = await import(`${SRC}/services/export/pdf.ts`)
      const { pdfFromPagination } = await import(`${SRC}/services/export/pdfDirect.ts`)
      const host = document.createElement('div')
      host.style.cssText = 'position:fixed;left:-10000px;top:0'
      document.body.appendChild(host)
      try {
        if (!(await paginateInto(host, html, { app: css, print: '' }))) throw new Error('Pagination failed')
        return window.__base64(await pdfFromPagination(host, 'Look', 'en'))
      } finally {
        releasePagination(host)
        host.remove()
      }
    },
    [LOOK_HTML, FIXTURE_CSS, SRC],
  )
  const directPdf = path.join(OUT, 'look.direct.pdf')
  fs.writeFileSync(directPdf, Buffer.from(direct, 'base64'))
  const [print] = renderPages(printPdf, FIXTURE_DPI)
  const [conv] = renderPages(directPdf, FIXTURE_DPI)
  const [a, b] = [inked(print), inked(conv)]
  check('look: soft shadow, ring, SVG disc and round stroke inked as much as the print (± 4 %)', Math.abs(a - b) / a <= 0.04, `inked pixels print ${a}, direct ${b}`)
}

/* ---- side-column warning ---------------------------------------------------------------------- */

async function checkSideColumn(page) {
  const [sample, long] = await page.evaluate(async (SRC) => {
    const { sideColumnOverflows } = await import(`${SRC}/services/export/render.ts`)
    const { createSampleCV } = await import(`${SRC}/core/sample.ts`)
    const cv = createSampleCV()
    const longCv = createSampleCV()
    longCv.personal.links = Array.from({ length: 80 }, (_, i) => ({ id: `l${i}`, label: `Link ${i}`, url: `https://example.com/${i}` }))
    return [await sideColumnOverflows(cv, 'harbor'), await sideColumnOverflows(longCv, 'harbor')]
  }, SRC)
  check('side column: the sample fits on a page', sample === false, `overflows ${sample}`)
  check('side column: 80 links do not fit on a page', long === true, `overflows ${long}`)
}

/* ---- run -------------------------------------------------------------------------------------- */

;(async () => {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  const server = await startServer('dev')
  const browser = await chromium.launch()
  const errors = []
  try {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
    await openApp(page, server.url)
    const only = process.argv[2]?.split(',')
    const ids = only ?? (await page.evaluate(async (SRC) => (await import(`${SRC}/templates/registry.ts`)).templates.map((t) => t.id), SRC))
    await compareFixture(browser, page)
    await compareLook(browser, page)
    await checkSideColumn(page)
    await compareTemplates(page, server.url, ids)
    check('no page errors', errors.length === 0, errors.join(' | '))
  } finally {
    await browser.close()
    server.stop()
  }
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks pass · files in ${path.relative(ROOT, OUT)}/`)
  process.exitCode = failed.length ? 1 : 0
})()
