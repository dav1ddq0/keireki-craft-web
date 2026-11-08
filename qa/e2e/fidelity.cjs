// The PDF download against the page (spec 050): what a template draws on screen must be something the
// direct PDF can draw, and its text must go out in an embedded font, not a PDF standard one.
const fs = require('node:fs')
const path = require('node:path')
const { check, open, settled, startSample } = require('./lib.cjs')

const IDS = ['amber', 'aurora', 'banner', 'chevron', 'classic', 'cobalt', 'compact', 'editorial', 'facet', 'frame', 'harbor', 'ledger', 'meridian', 'modern', 'monogram', 'monograph', 'retro', 'freelance']

/** Runs in the page: CSS on the CV that the direct PDF has no way to draw. Outer box-shadows (rings, soft shadows) are drawn. */
const UNSUPPORTED = () => {
  const out = []
  const page = document.querySelector('.pane .cv-page')
  const where = (el, pseudo) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : ''}${pseudo}`
  for (const el of page.querySelectorAll('*')) {
    for (const pseudo of ['', '::before', '::after']) {
      const s = getComputedStyle(el, pseudo || undefined)
      if (pseudo && (s.content === 'none' || s.content === 'normal')) continue
      const note = (what) => out.push(`${what} @ ${where(el, pseudo)}`)
      if (s.backgroundImage !== 'none') note('background-image / gradient')
      if (/\binset\b/.test(s.boxShadow)) note('inset box-shadow')
      // A grey photo the direct PDF draws itself (spec 081): grayscale() alone, on an image.
      if (s.filter !== 'none' && !(el instanceof HTMLImageElement && /^grayscale\([^)]*\)$/.test(s.filter))) note('filter')
      if (s.textShadow !== 'none') note('text-shadow')
      if (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) note('outline')
      if (s.textDecorationLine !== 'none') note('text-decoration ' + s.textDecorationLine)
      if (s.mixBlendMode !== 'normal') note('mix-blend-mode')
      if (new Set(['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map((k) => s[k])).size > 1) note('corners of different radii')
      // An <img> has no ::before; Firefox still reports a content for it.
      if (pseudo && !(el instanceof HTMLImageElement) && !/^"[^"]*"$/.test(s.content)) note('generated content other than a string')
    }
  }
  return [...new Set(out)]
}

async function run(browser, outDir) {
  const B = 'fidelity'
  const p = await open(browser, { viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  await startSample(p)
  await p.locator('input[type=file]').first().setInputFiles(path.join(__dirname, '../fixtures/portrait.jpg')).catch(() => {})
  await p.waitForSelector('dialog.crop[open]', { timeout: 3000 }).catch(() => {})
  await p.getByRole('button', { name: /Usar foto/ }).last().click().catch(() => {})
  await settled(p)

  const unsupported = []
  const standard = []
  const noStandIn = []
  for (const id of IDS) {
    await p.locator('nav button.row', { hasText: 'Plantilla y estilo' }).first().click()
    await p.getByRole('button', { name: new RegExp('^' + id, 'i') }).first().click()
    await p.waitForSelector(`.pane .cv-page article.${id}`, { timeout: 4000 })
    await settled(p)
    for (const found of await p.evaluate(UNSUPPORTED)) unsupported.push(`${id}: ${found}`)
    // A computer without Georgia must fall back to the face the PDF uses, not to whatever it has (spec 052).
    const stack = await p.evaluate(() => getComputedStyle(document.querySelector('.pane .cv-page article')).fontFamily)
    if ((/georgia|iowan/i.test(stack) && !/gelasio/i.test(stack)) || (/arial|helvetica/i.test(stack) && !/arimo/i.test(stack))) noStandIn.push(`${id}: ${stack}`)

    await p.locator('nav button.row', { hasText: 'Exportar' }).first().click()
    await settled(p)
    const [download] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.getByRole('button', { name: /Descargar PDF/ }).first().click()])
    const file = path.join(outDir, `fidelity-${id}.pdf`)
    await download.saveAs(file)
    const fonts = [...new Set((fs.readFileSync(file, 'latin1').match(/\/BaseFont \/[A-Za-z0-9+_-]+/g) || []).map((s) => s.replace('/BaseFont /', '')))]
    // An embedded subset is named "ABCDEF+Name"; a PDF standard font has no prefix.
    const loose = fonts.filter((name) => !name.includes('+'))
    if (loose.length) standard.push(`${id}: ${loose.join(' ')}`)
  }
  check(B, 'no template uses CSS the direct PDF cannot draw (gradients, inset shadows, filters, underlines…)', unsupported.length === 0, unsupported.join(' · '))
  check(B, 'every template, in its own default font, goes out in embedded fonts', standard.length === 0, standard.join(' · '))
  check(B, 'the page falls back to the PDF\'s stand-in font when the system one is missing', noStandIn.length === 0, noStandIn.join(' · '))
  check(B, 'no console errors while downloading them all', p.errs.length === 0, p.errs.slice(0, 3).join(' | '))
  await p.context().close()
}

module.exports = { run }
