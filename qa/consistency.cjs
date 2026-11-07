// The interface against its design tokens, in the browser (spec 043, extended in 045): the computed
// style of every element of every view, on a laptop, a desktop, an iPad in both orientations, an
// iPad Pro and three phones, light and dark, checked against the scale. The narrowest phone and
// laptop are walked again with the interface in German, the longest of its languages (spec 057).
//   - text sizes are the sizes of the type scale (`--size-*`), weights are 400/500/600/700;
//   - corner radii are the shape scale, and every field is the same height and radius;
//   - a blurred shadow is an elevation token;
//   - the buttons of one class look alike, and no input shows the browser's own grey;
//   - nothing sticks out of its box, scrolls sideways or is cut without an ellipsis;
//   - the state of "Copy image" hangs over the page, not in the preview toolbar's row (spec 062).
// The CV paper (templates, thumbnails, the phone's preview) sets its own type and is left out.
// Usage: npm run qa:consistency (builds first). Report in .qa/consistency.json.
const fs = require('node:fs')
const path = require('node:path')
const { ROOT, startServer } = require('./lib/server.cjs')
const { devices } = require('playwright')

/** Every format the interface is built for, with the themes it is checked in. Each is walked the same way. */
const PROFILES = [
  { name: 'small laptop 1024×768', opts: { viewport: { width: 1024, height: 768 } }, themes: ['light'] },
  { name: 'laptop 1280×800', opts: { viewport: { width: 1280, height: 800 } }, themes: ['light'] },
  { name: 'desktop 1440×900', opts: { viewport: { width: 1440, height: 900 } }, themes: ['light', 'dark'] },
  { name: 'desktop 1920×1080', opts: { viewport: { width: 1920, height: 1080 } }, themes: ['dark'] },
  { name: 'iPad portrait', opts: () => devices['iPad (gen 7)'], themes: ['light', 'dark'] },
  { name: 'iPad landscape', opts: () => devices['iPad (gen 7) landscape'], themes: ['light'] },
  { name: 'iPad Pro 11', opts: () => devices['iPad Pro 11'], themes: ['dark'] },
  { name: 'Pixel 7', opts: () => devices['Pixel 7'], themes: ['light', 'dark'] },
  { name: 'iPhone SE', opts: () => devices['iPhone SE'], themes: ['light'] },
  { name: 'phone 360×640', opts: { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, themes: ['dark'] },
  // German has the longest words of the six UI languages: the narrowest phone and laptop again (spec 057).
  { name: 'phone 360×640 (de)', lang: 'de', opts: { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, themes: ['light'] },
  { name: 'small laptop 1024×768 (de)', lang: 'de', opts: { viewport: { width: 1024, height: 768 } }, themes: ['light'] },
  // Basque's long agglutinated words, on the same two (spec 070).
  { name: 'phone 360×640 (eu)', lang: 'eu', opts: { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, themes: ['light'] },
  { name: 'small laptop 1024×768 (eu)', lang: 'eu', opts: { viewport: { width: 1024, height: 768 } }, themes: ['light'] },
]

const OUT = path.join(ROOT, '.qa')
/** What the walk clicks, by UI language. */
const UI = {
  es: {
    steps: ['Datos personales', 'Resumen', 'Experiencia', 'Formación', 'Competencias', 'Idiomas', 'Secciones propias', 'Plantilla y estilo', 'Exportar'],
    sample: /Cargar un ejemplo/,
    sampleName: 'Nadia Martín Reyes',
    next: /Siguiente/,
    preview: /^Vista previa$/,
    edit: /^Editar$/,
    back: /Paso anterior|Anterior|Plantilla y estilo|Secciones propias/,
    export: /^Exportar/,
    menu: /^Menú/,
    views: [/^Preferencias/, /^Importar/, /^Mis CVs/],
    newCv: /Nuevo CV/,
    copyStates: ['Copiando…', 'Copiado', 'No se pudo copiar'],
  },
  de: {
    steps: ['Persönliche Daten', 'Profil', 'Berufserfahrung', 'Ausbildung', 'Kenntnisse', 'Sprachen', 'Eigene Abschnitte', 'Vorlage und Stil', 'Exportieren'],
    sample: /Beispiel laden/,
    // The sample is in the interface language, with a person of its own (spec 059).
    sampleName: 'Lena Schneider',
    next: /Weiter|Nächster Schritt/,
    preview: /^Vorschau$/,
    edit: /^Bearbeiten$/,
    back: /Vorheriger Schritt|Zurück|Vorlage und Stil|Eigene Abschnitte/,
    export: /^Exportieren/,
    menu: /^Menü/,
    views: [/^Einstellungen/, /^Importieren/, /^Meine Lebensläufe/],
    newCv: /Neuer Lebenslauf/,
    copyStates: ['Wird kopiert…', 'Kopiert', 'Kopieren fehlgeschlagen'],
  },
  eu: {
    steps: ['Datu pertsonalak', 'Laburpena', 'Esperientzia', 'Prestakuntza', 'Gaitasunak', 'Hizkuntzak', 'Atal propioak', 'Txantiloia eta estiloa', 'Esportatu'],
    sample: /Kargatu adibide bat/,
    sampleName: 'Ane Etxeberria Goikoetxea',
    next: /Hurrengoa|Hurrengo urratsa/,
    preview: /^Aurrebista$/,
    edit: /^Editatu$/,
    back: /Aurreko urratsa|Atzera|Txantiloia eta estiloa|Atal propioak/,
    export: /^Esportatu/,
    menu: /^Menua/,
    views: [/^Hobespenak/, /^Inportatu/, /^Nire CVak/],
    newCv: /CV berria/,
    copyStates: ['Kopiatzen…', 'Kopiatuta', 'Ezin izan da kopiatu'],
  },
}
const SIZES = new Set(['11px', '12px', '14px', '16px', '22px', '24px', '28px', '32px', '36px'])
const WEIGHTS = new Set(['400', '500', '600', '700'])
const RADII = new Set(['0px', '4px', '8px', '16px', '20px', '28px', '9999px', '50%'])

/** Runs in the page: the facts of every visible element of the interface. */
const COLLECT = `(() => {
  const paper = (el) => el.closest('.cv-page, .thumb, .tile-preview, .preview-thumb, .page-wrap, .page-frame, .pagedjs_pages, svg, .paper, [class*=preview] .cv, .sheet-preview')
  const label = (el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).filter((c) => !/^(m3|is-|v-)/.test(c))[0] : '')
  const visible = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0' }
  const out = { text: [], radius: [], shadow: [], buttons: [], fields: [], inputs: [], overflow: [], titles: [] }
  const clipper = (el) => { for (let n = el.parentElement; n; n = n.parentElement) { const s = getComputedStyle(n); if (/(hidden|auto|scroll|clip)/.test(s.overflowX) || n === document.body) return n } return document.body }
  for (const el of document.body.querySelectorAll('*')) {
    if (paper(el) || !visible(el)) continue
    const s = getComputedStyle(el), r = el.getBoundingClientRect()
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (own && !/Source Sans|Caladea|Inter|Merriweather|Lora|Playfair|Georgia|Times|Courier/i.test(s.fontFamily)) out.text.push({ l: label(el), size: s.fontSize, weight: s.fontWeight })
    const hasBg = s.backgroundColor !== 'rgba(0, 0, 0, 0)', hasBorder = parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none'
    if ((hasBg || hasBorder) && s.borderTopLeftRadius !== '0px') out.radius.push({ l: label(el), v: s.borderTopLeftRadius })
    if (s.boxShadow !== 'none') out.shadow.push({ l: label(el), v: s.boxShadow })
    if (el.matches('button.btn') && own) out.buttons.push({ l: 'btn--' + (el.className.match(/btn--(primary|tonal|secondary|ghost|danger)/) || [])[1] + (el.className.includes('btn--sm') ? ' sm' : ''), h: Math.round(r.height), radius: s.borderTopLeftRadius, size: s.fontSize, weight: s.fontWeight })
    // A field is 56 px, 80 where the pointer is coarse and the slider has its 48 dp target (not the text ones).
    if (el.matches('.box') && el.querySelector(':scope > input:not([type=color]):not([type=file]), :scope > select')) out.fields.push({ l: label(el), h: Math.round(r.height), radius: s.borderTopLeftRadius })
    // The title of a view: the heading that names it, not a card's or a dialog's.
    if (el.matches('h2.title, h2.heading, h2.heading--large') && !el.querySelector(':scope > button.trigger') && !el.closest('dialog, .sheet, [class*=sheet], .rail, .card, article, section.panel, header')) out.titles.push({ size: s.fontSize, weight: s.fontWeight, text: (el.textContent || '').trim().slice(0, 18) })
    if (el.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), select, textarea') && s.backgroundColor === 'rgb(239, 239, 239)') out.inputs.push({ l: label(el) + '[' + el.type + ']' })
    // The template carousel of the phone is meant to scroll sideways, and what is in it...
    if (el.closest('ul.templates') && matchMedia('(max-width: 600px)').matches) continue
    // ...and so is the strip of the nine steps on a tablet or a phone.
    if (el.closest('ol.steps')) continue
    const c = clipper(el)
    if (c !== document.body && s.position !== 'absolute' && s.position !== 'fixed') {
      const cr = c.getBoundingClientRect()
      if (r.right > cr.right + 1.5 || r.left < cr.left - 1.5) out.overflow.push({ l: label(el) + ' in ' + label(c), by: Math.round(Math.max(r.right - cr.right, cr.left - r.left)) })
    }
    if (/(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1) out.overflow.push({ l: 'scrolls sideways: ' + label(el), by: el.scrollWidth - el.clientWidth })
  }
  // The template cards of one row are one height (spec 052).
  const rows = new Map()
  for (const card of document.querySelectorAll('button.card')) {
    const r = card.getBoundingClientRect()
    if (r.height < 1) continue
    const key = Math.round(r.top)
    if (!rows.has(key)) rows.set(key, [])
    rows.get(key).push(Math.round(r.height))
  }
  out.uneven = [...rows.values()].filter((h) => Math.max(...h) - Math.min(...h) > 2).map((h) => h.join('/'))
  // What a pinned element of the form paints around itself (a solid shadow, a ::before) stays out
  // of the step bar above it and of what follows it, unpinned (spec 053: the style preview painted
  // over the bar's base).
  out.covers = []
  for (const el of document.querySelectorAll('.wizard *')) {
    if (!visible(el) || getComputedStyle(el).position !== 'sticky') continue
    const bar = el.closest('.wizard').firstElementChild
    if (!bar || bar.contains(el)) continue
    const r = el.getBoundingClientRect(), gap = r.top - bar.getBoundingClientRect().bottom
    let up = 0, down = 0
    // One layer at a time (commas inside rgb() are not separators); an inset shadow paints inside.
    for (const layer of getComputedStyle(el).boxShadow.split(/,(?![^(]*\\))/)) {
      const m = !layer.includes('inset') && layer.match(/(-?[\\d.]+)px (-?[\\d.]+)px ([\\d.]+)px (-?[\\d.]+)px/)
      if (!m) continue
      const [, , y, blur, spread] = m.map(Number)
      up = Math.max(up, -y + blur + spread)
      down = Math.max(down, y + blur + spread)
    }
    const b = getComputedStyle(el, '::before')
    if (b.content !== 'none' && b.position === 'absolute' && b.bottom.endsWith('px')) up = Math.max(up, parseFloat(b.bottom) + parseFloat(b.height) - r.height)
    if (up > gap + 0.5) out.covers.push(label(el) + ' paints ' + Math.round(up) + 'px up, ' + Math.round(gap) + 'px to the bar')
    let next = el.nextElementSibling
    while (next && !visible(next)) next = next.nextElementSibling
    const below = next ? next.getBoundingClientRect().top - r.bottom : Infinity
    if (down > below + 0.5) out.covers.push(label(el) + ' paints ' + Math.round(down) + 'px down, ' + Math.round(below) + 'px to ' + label(next))
  }
  if (document.documentElement.scrollWidth > innerWidth + 1) out.overflow.push({ l: 'the page scrolls sideways', by: document.documentElement.scrollWidth - innerWidth })
  return out
})()`


;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const server = await startServer('preview')
  process.env.BASE = server.url
  const { chromium, check, results, open, settled, startSample, step } = require('./e2e/lib.cjs')
  const browser = await chromium.launch()
  const seen = { btnHeight: new Map(), size: new Map(), weight: new Map(), radius: new Map(), shadow: new Map(), input: new Map(), overflow: new Map(), uneven: new Map(), covers: new Map(), btn: new Map(), field: new Map(), title: new Map(), copyState: new Map() }
  const note = (map, key, where) => { if (!map.has(key)) map.set(key, []); if (map.get(key).length < 3) map.get(key).push(where) }
  let views = 0

  const grab = async (p, where) => {
    views++
    // Audit the page at rest, not while a step is sliding in (spec 048).
    await settled(p)
    const d = await p.evaluate(COLLECT)
    for (const t of d.text) {
      if (!SIZES.has(t.size)) note(seen.size, `${t.size} ${t.l}`, where)
      if (!WEIGHTS.has(t.weight)) note(seen.weight, `${t.weight} ${t.l}`, where)
    }
    for (const r of d.radius) if (!RADII.has(r.v)) note(seen.radius, `${r.v} ${r.l}`, where)
    for (const s of d.shadow) {
      // A drop shadow is an elevation token; rings and indicator lines have no blur.
      const lengths = s.v.replace(/rgba?\([^)]*\)|color\([^)]*\)/g, '').split(',').map((layer) => layer.replace('inset', '').trim().split(/\s+/).map(parseFloat))
      const blurred = lengths.some((l) => (l[2] || 0) !== 0)
      const tokens = ['0px 1px 2px', '0px 2px 6px', '0px 4px 8px'].some((x) => s.v.includes(x))
      if (blurred && !tokens) note(seen.shadow, `${s.v.slice(0, 60)} ${s.l}`, where)
    }
    for (const i of d.inputs) note(seen.input, i.l, where)
    for (const o of d.overflow) note(seen.overflow, `${o.l} (+${o.by}px)`, where)
    for (const row of d.uneven) note(seen.uneven, `a row of cards of ${row} px`, where)
    for (const c of d.covers) note(seen.covers, c, where)
    // The height of a touch-sized call to action (48 and up) is its own; the look of every variant is not.
    for (const b of d.buttons) {
      note(seen.btn, `${b.l} | ${b.radius} ${b.size} w${b.weight}`, where)
      if (b.h < 48 && b.h !== (b.l.endsWith(' sm') ? 32 : 40)) note(seen.btnHeight, `${b.l} ${b.h}h`, where)
    }
    for (const f of d.fields) note(seen.field, `${f.h}h ${f.radius}`, where)
    for (const t of d.titles) note(seen.title, `${t.size} w${t.weight}`, `${where} «${t.text}»`)
  }

  /** Clicks a control if this layout has it, without waiting for one it does not. */
  const tap = async (locator) => { if (await locator.count()) await locator.first().click().catch(() => {}) }
  /** Whether a button with this name is on screen. */
  const shown = (p, name) => p.getByRole('button', { name }).first().isVisible().catch(() => false)
  /** A view of the app by its name: the header tabs where there are any, else the menu of the phone. */
  async function openView(p, name, ui) {
    if (await shown(p, name)) return p.getByRole('button', { name }).first().click().catch(() => {})
    await tap(p.getByRole('button', { name: ui.menu }))
    await p.waitForTimeout(300)
    await p.getByRole('button', { name }).first().click().catch(() => {})
  }

  async function walk(profile, theme) {
    const opts = typeof profile.opts === 'function' ? profile.opts() : profile.opts
    const p = await open(browser, { ...opts, colorScheme: theme })
    // A control a layout does not have is not waited for: each walk tries all of them.
    p.setDefaultTimeout(2000)
    const where = (view) => `${profile.name} ${theme} ${view}`
    const lang = profile.lang ?? 'es'
    const ui = UI[lang]
    const STEPS = ui.steps
    await p.addInitScript(([l, t]) => localStorage.setItem('keireki-craft:prefs', JSON.stringify({ uiLanguage: l, theme: t })), [lang, theme])
    await p.reload({ waitUntil: 'networkidle' }).catch(() => {})
    await grab(p, where('welcome'))
    if (lang === 'es') await startSample(p)
    else {
      await p.getByRole('button', { name: ui.sample }).click()
      await p.getByText(ui.sampleName).first().waitFor({ state: 'attached', timeout: 5000 })
      await settled(p)
    }

    const rail = (await p.locator('.editor-rail').count()) > 0
    // The nine steps: by the rail where there is one, else by the next button of the dock.
    for (let i = 0; i < STEPS.length; i++) {
      if (rail) await p.locator('nav button.row', { hasText: STEPS[i] }).first().click().catch(() => {})
      await p.waitForTimeout(200)
      await grab(p, where(`step ${i + 1} ${STEPS[i]}`))
      if (!rail && i < STEPS.length - 1) await tap(p.getByRole('button', { name: ui.next }))
    }
    // Each state of "Copy image" in the preview toolbar, written in as it would show (spec 062).
    if (await p.locator('header.bar .copy-state').count()) {
      const states = await p.evaluate((texts) => {
        const bar = document.querySelector('header.bar')
        const state = bar.querySelector('.copy-state')
        const at = (text) => {
          state.textContent = text
          const b = bar.getBoundingClientRect(), r = state.getBoundingClientRect()
          return { text, height: b.height, out: text ? Math.round(Math.max(r.right - b.right, b.left - r.left, 0)) : 0 }
        }
        return [at(''), ...texts.map(at)]
      }, ui.copyStates)
      for (const { text, height, out } of states.slice(1)) {
        if (height !== states[0].height) note(seen.copyState, `«${text}» moves the bar ${states[0].height}→${height}px`, where('preview toolbar'))
        if (out) note(seen.copyState, `«${text}» leaves the pane by ${out}px`, where('preview toolbar'))
      }
      await grab(p, where('preview toolbar copy state'))
      await p.evaluate(() => { document.querySelector('header.bar .copy-state').textContent = '' })
    }
    // The phone shows one pane at a time: the preview too.
    if (await shown(p, ui.preview)) {
      await tap(p.getByRole('button', { name: ui.preview }))
      await p.waitForTimeout(400)
      await grab(p, where('preview'))
      await tap(p.getByRole('button', { name: ui.edit }))
    }
    if (rail) await p.locator('nav button.row', { hasText: STEPS[0] }).first().click().catch(() => {})
    else for (let back = 0; back < 9; back++) await tap(p.getByRole('button', { name: ui.back }))
    if (await p.locator('.photo-drop input[type=file]').count()) await p.locator('.photo-drop input[type=file]').setInputFiles(path.join(__dirname, 'fixtures/portrait.jpg'))
    await p.waitForSelector('dialog.crop[open]', { timeout: 1200 }).catch(() => {})
    await p.waitForTimeout(300)
    await grab(p, where('photo crop dialog'))
    await p.keyboard.press('Escape')
    // Export: the dialog on the rail's layouts, the sheet on the others.
    await tap(p.getByRole('button', { name: ui.export }))
    await p.waitForSelector('dialog[open]', { timeout: 1200 }).catch(() => {})
    await grab(p, where('export'))
    await p.keyboard.press('Escape')
    for (const view of ui.views) {
      await openView(p, view, ui)
      await p.waitForTimeout(300)
      await grab(p, where(String(view).slice(2, -2)))
      await p.keyboard.press('Escape')
    }
    // A blank CV: the empty states of every step.
    await tap(p.getByRole('button', { name: ui.newCv }))
    await p.waitForTimeout(400)
    for (let i = 0; i < STEPS.length; i++) {
      if (rail) await p.locator('nav button.row', { hasText: STEPS[i] }).first().click().catch(() => {})
      await p.waitForTimeout(150)
      await grab(p, where(`blank ${STEPS[i]}`))
      if (!rail && i < STEPS.length - 1) await tap(p.getByRole('button', { name: ui.next }))
    }
    await p.context().close()
  }

  try {
    for (const profile of PROFILES) for (const theme of profile.themes) await walk(profile, theme)
  } finally {
    await browser.close()
    server.stop()
  }

  const none = (map) => [...map.entries()].map(([k, w]) => `${k} (${w[0]})`).join(' · ')
  check('scale', `text sizes are the sizes of the type scale, over ${views} views`, !seen.size.size, none(seen.size))
  check('scale', 'font weights are 400, 500, 600 or 700', !seen.weight.size, none(seen.weight))
  check('scale', 'corner radii are the shape scale', !seen.radius.size, none(seen.radius))
  check('scale', 'blurred shadows are elevation tokens', !seen.shadow.size, none(seen.shadow))
  check('controls', 'no input shows the browser\'s own grey', !seen.input.size, none(seen.input))
  check('controls', 'the template cards of a row are one height', !seen.uneven.size, none(seen.uneven))
  check('controls', 'a pinned element paints over neither the step bar nor what follows it', !seen.covers.size, none(seen.covers))
  check('controls', 'nothing sticks out of its box or scrolls sideways', !seen.overflow.size, none(seen.overflow))
  check('controls', 'a copy state in the preview toolbar neither moves the bar nor leaves the pane', !seen.copyState.size, none(seen.copyState))
  const variants = new Map()
  for (const key of seen.btn.keys()) { const [kind, look] = key.split(' | '); if (!variants.has(kind)) variants.set(kind, new Set()); variants.get(kind).add(look) }
  const varying = [...variants].filter(([, looks]) => looks.size > 1).map(([kind, looks]) => `${kind}: ${[...looks].map((look) => `${look} at ${seen.btn.get(`${kind} | ${look}`)[0]}`).join(' / ')}`)
  check('controls', 'every BaseButton variant looks the same wherever it is', !varying.length, varying.join(' · '))
  check('controls', 'a button is 40 px tall, or 32 for the small one, unless it is a touch-sized call to action', !seen.btnHeight.size, none(seen.btnHeight))
  const heights = [...seen.field.keys()]
  check('controls', 'single-line fields are one height and one radius', heights.length === 1, [...seen.field].map(([k, w]) => `${k} at ${w[0]}`).join(' · '))
  const titles = [...seen.title.keys()]
  check('titles', 'the title of a view is one size and weight on every view', titles.length === 1, [...seen.title].map(([k, w]) => `${k} at ${w[0]}`).join(' · '))

  fs.writeFileSync(path.join(OUT, 'consistency.json'), JSON.stringify({ views, results }, null, 1))
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} [${r.block}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`)
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks pass · ${views} views`)
  process.exitCode = failed.length ? 1 : 0
})()
