// Functional blocks. Each runs in its own browser context (its own IndexedDB), so they run in parallel.
const fs = require('fs')
const path = require('path')
const { settled, BASE, check, until, sleep, open, previewText, previewHas, step, startSample, idbDump, idbDocCount, overflow } = require('./lib.cjs')

/** A · writing a CV from blank: every step, links, validation, persistence, undo/redo. */
async function mainFlow(browser) {
  const B = 'main'
  const p = await open(browser)
  check(B, 'first run shows the welcome view', await p.getByRole('heading', { name: 'Empieza tu CV' }).isVisible())
  await p.getByRole('button', { name: /En blanco/ }).click()
  await settled(p)
  check(B, 'blank goes to Datos personales', await p.getByRole('heading', { name: 'Datos personales' }).isVisible())

  await p.getByLabel('Nombre completo').fill('Lucía Pérez Gómez')
  await p.getByLabel('Titular profesional').fill('Ingeniera de datos')
  await p.getByLabel('Email').fill('lucia@correo')
  check(B, 'invalid email shows a warning', await until(() => p.getByText(/válid|parece|revisa/i).first().isVisible(), { timeout: 2000 }))
  await p.getByLabel('Email').fill('lucia@correo.es')
  await p.getByLabel('Teléfono').fill('+34 611 222 333')
  await p.getByRole('textbox', { name: 'Ubicación' }).fill('Sevilla')
  check(B, 'preview shows name, headline and email', await previewHas(p, 'lucia@correo.es') && (await previewText(p)).includes('Lucía Pérez Gómez'))

  await p.getByRole('button', { name: /Añadir enlace/ }).click()
  await p.getByRole('textbox', { name: 'Etiqueta', exact: true }).last().fill('LinkedIn')
  await p.getByRole('textbox', { name: 'URL', exact: true }).last().fill('linkedin.com/in/lucia')
  await previewHas(p, 'LinkedIn')
  const href = await p.locator('.cv-page a', { hasText: 'LinkedIn' }).first().getAttribute('href').catch(() => null)
  check(B, 'link href is made absolute https', href && href.startsWith('https://'), href)

  await step(p, 'Resumen')
  await p.locator('textarea').first().fill('Ingeniera de datos con cinco años diseñando pipelines en Python y SQL para equipos de producto. Me gusta convertir datos desordenados en decisiones claras y medibles.')
  check(B, 'summary meter shows a verdict', await until(() => p.locator('.verdict').isVisible(), { timeout: 2000 }))

  await step(p, 'Experiencia')
  await p.getByRole('button', { name: /Añadir experiencia/ }).click()
  await p.getByRole('textbox', { name: 'Puesto', exact: true }).last().fill('Data Engineer')
  await p.getByRole('textbox', { name: 'Empresa', exact: true }).last().fill('Datalab')
  await p.getByLabel('Inicio').last().fill('2021-03')
  const current = p.getByLabel('Actualmente aquí').last()
  if (!(await current.isChecked())) await current.check()
  check(B, 'a current job disables the end date', await p.getByLabel('Fin', { exact: false }).last().isDisabled())
  await p.getByLabel('Descripción').last().fill('Pipelines de ingesta para 40 fuentes.')
  const hl = p.getByPlaceholder('Añadir logro').last()
  await hl.fill('Reduje el coste de cómputo un 30 %')
  await hl.press('Enter')
  check(B, 'experience in the preview with "Actualidad" and the highlight', await previewHas(p, '30 %') && /Actualidad/.test(await previewText(p)))
  await p.getByRole('button', { name: /Añadir experiencia/ }).click()
  await p.getByRole('textbox', { name: 'Puesto', exact: true }).last().fill('Analista')
  await p.getByRole('textbox', { name: 'Empresa', exact: true }).last().fill('Banco Sur')
  await p.getByLabel('Inicio').last().fill('2021-09')
  await p.getByLabel('Actualmente aquí').last().uncheck()
  await p.getByLabel('Fin', { exact: false }).last().fill('2020-02')
  check(B, 'an end before the start warns', await until(() => p.getByText('La fecha de fin es anterior a la de inicio.').first().isVisible(), { timeout: 2000 }))
  await p.getByLabel('Inicio').last().fill('2018-09')
  check(B, 'two jobs, newest first as entered', await previewHas(p, 'Analista') && (await previewText(p)).indexOf('Data Engineer') < (await previewText(p)).indexOf('Analista'))

  await step(p, 'Formación')
  await p.getByRole('button', { name: /Añadir formación/ }).click()
  await p.getByRole('textbox', { name: 'Titulación', exact: true }).last().fill('Grado en Estadística')
  await p.getByRole('textbox', { name: 'Centro', exact: true }).last().fill('Universidad de Sevilla')
  check(B, 'education in the preview', await previewHas(p, 'Grado en Estadística'))

  await step(p, 'Competencias')
  await p.getByRole('button', { name: /Añadir grupo/ }).click()
  await p.getByRole('textbox', { name: 'Categoría', exact: true }).last().fill('Lenguajes')
  const sk = p.getByPlaceholder(/Añadir habilidad/).last()
  await sk.fill('Python, SQL, Scala, dbt')
  await sk.press('Enter')
  check(B, 'skills (comma-separated entry) in the preview', await previewHas(p, 'dbt') && (await previewText(p)).includes('Scala'))

  await step(p, 'Idiomas')
  await p.getByRole('button', { name: /Añadir idioma/ }).click()
  await p.getByLabel('Idioma', { exact: true }).last().fill('Inglés')
  await p.getByRole('button', { name: 'C1', exact: true }).last().click()
  check(B, 'language with a level in the preview', await previewHas(p, 'C1') && (await previewText(p)).includes('Inglés'))

  // Persistence: wait for the autosave to reach IndexedDB instead of sleeping.
  const stored = await until(async () => (await idbDump(p)).includes('Inglés'), { timeout: 5000 })
  check(B, 'autosave reaches IndexedDB', stored)
  await p.reload({ waitUntil: 'networkidle' })
  const after = await until(async () => {
    const t = await previewText(p)
    return ['Lucía Pérez Gómez', 'Data Engineer', 'Grado en Estadística', 'dbt', 'Inglés'].every((s) => t.includes(s)) && t
  })
  check(B, 'everything persists after a reload', !!after)
  check(B, 'a reload does not show the welcome again', !(await p.getByRole('heading', { name: 'Empieza tu CV' }).isVisible()))

  await step(p, 'Datos personales')
  await p.getByLabel('Titular profesional').fill('Ingeniera de datos senior')
  await p.locator('body').click({ position: { x: 5, y: 600 } })
  await p.keyboard.press('Control+z')
  const undone = await until(async () => (await p.getByLabel('Titular profesional').inputValue()) === 'Ingeniera de datos', { timeout: 3000 })
  check(B, 'Ctrl+Z undoes the last edit', undone, await p.getByLabel('Titular profesional').inputValue())
  await p.keyboard.press('Control+Shift+z')
  check(B, 'Ctrl+Shift+Z redoes it', await until(async () => (await p.getByLabel('Titular profesional').inputValue()) === 'Ingeniera de datos senior', { timeout: 3000 }))

  // A blank CV that was never typed in survives a reload too (027).
  await p.getByRole('button', { name: 'Mis CVs' }).first().click()
  await p.locator('button.tile--new').click()
  await p.reload({ waitUntil: 'networkidle' })
  check(B, '"Nuevo CV" without typing reopens in the editor after reload', await until(() => p.getByRole('heading', { name: 'Datos personales' }).isVisible(), { timeout: 3000 }))

  check(B, 'no console errors', p.errs.length === 0, p.errs.join(' | '))
  await p.context().close()
}

/** B · custom sections, page breaks, templates, style, CV language. */
async function customAndStyle(browser) {
  const B = 'custom+style'
  const p = await open(browser)
  await startSample(p)

  await step(p, 'Secciones propias')
  const before = await p.locator('.order-label').count()
  await p.getByRole('button', { name: '+ Cursos' }).click()
  check(B, 'a preset adds a section to the order list', await until(async () => (await p.locator('.order-label').count()) === before + 1, { timeout: 2000 }))
  await p.getByRole('textbox', { name: 'Título', exact: true }).last().fill('Curso de Spark')
  check(B, 'the preset entry shows in the preview', await previewHas(p, 'Curso de Spark'))
  await p.getByRole('button', { name: /Sección en blanco/ }).first().click()
  await p.getByRole('textbox', { name: 'Título de la sección' }).last().fill('Voluntariado')
  check(B, 'a custom section with no entries is not printed', !(await previewText(p)).includes('Voluntariado'))
  await p.getByRole('button', { name: 'Eliminar Voluntariado' }).last().click()
  check(B, 'removing a section takes it out of the order list', await until(async () => !(await p.locator('.order-label', { hasText: 'Voluntariado' }).count()), { timeout: 2000 }))

  // Page break on Education: the switch is stored, and the section carries the marker.
  const edu = p.getByRole('checkbox', { name: /Formación/ })
  await edu.check()
  check(B, 'a page break marks the section in the preview', await until(() => p.locator('.cv-page [data-section="education"][data-page-break]').count(), { timeout: 2000 }))
  await edu.uncheck()

  await step(p, 'Plantilla y estilo')
  const lost = []
  for (const id of ['aurora', 'banner', 'chevron', 'cobalt', 'compact', 'editorial', 'facet', 'frame', 'harbor', 'ledger', 'meridian', 'modern', 'monogram', 'monograph', 'classic']) {
    const card = p.getByRole('button', { name: new RegExp('^' + id, 'i') }).first()
    if (!(await card.count())) { lost.push(id + ':nocard'); continue; }
    await card.click()
    const ok = await until(async () => {
      if (!(await p.locator(`.pane .cv-page article.${id}`).count())) return false
      // textContent, not innerText: some templates uppercase headings with CSS.
      const t = await p.locator('.pane .cv-page').first().textContent()
      return t.includes('Nadia Martín Reyes') && t.includes('Cartograf') && t.includes('Curso de Spark')
    }, { timeout: 4000 })
    if (!ok) lost.push(id)
  }
  check(B, 'all 13 templates keep all the content', lost.length === 0, lost.join(','))
  await p.getByRole('button', { name: /^Meridian/ }).first().click()
  await p.getByRole('button', { name: 'Violeta' }).click()
  check(B, 'the accent colour reaches the CV', await until(async () => /7c55e4/i.test((await p.locator('.cv-page [style*="--cv-accent"]').first().getAttribute('style')) || ''), { timeout: 2000 }))
  const lang = p.getByLabel('Idioma del CV')
  await lang.selectOption({ index: 1 })
  check(B, 'the CV language switches section titles', await until(async () => /EXPERIENCE|Experience/.test(await previewText(p)), { timeout: 2000 }))
  check(B, 'the UI stays in Spanish', await p.getByRole('heading', { name: 'Plantilla y estilo' }).isVisible())
  await lang.selectOption({ index: 0 })

  check(B, 'no console errors', p.errs.length === 0, p.errs.join(' | '))
  await p.context().close()
}

/** C · exports and imports: JSON, HTML, bad JSON, the PDF the browser printed. */
async function exportImport(browser, outDir, printedPdf) {
  const B = 'export+import'
  const p = await open(browser)
  await startSample(p)
  await step(p, 'Plantilla y estilo')
  await p.getByRole('button', { name: /^Meridian/ }).first().click()
  await step(p, 'Exportar')

  const [dj] = await Promise.all([p.waitForEvent('download'), p.locator('.option', { hasText: 'JSON' }).getByRole('button').click()])
  const jf = path.join(outDir, 'cv.json')
  await dj.saveAs(jf)
  const json = JSON.parse(fs.readFileSync(jf, 'utf8'))
  check(B, 'JSON export: schema 5 with the template', json.schemaVersion === 5 && json.meta.templateId === 'meridian', `${json.schemaVersion} ${json.meta.templateId} ${dj.suggestedFilename()}`)
  const [dh] = await Promise.all([p.waitForEvent('download'), p.locator('.option', { hasText: 'HTML' }).getByRole('button').click()])
  const hf = path.join(outDir, 'cv.html')
  await dh.saveAs(hf)
  const html = fs.readFileSync(hf, 'utf8')
  check(B, 'HTML export is standalone (no scripts, no absolute paths)', html.includes('Nadia Martín Reyes') && !/<script/i.test(html) && !/src="\/|href="\//.test(html), `${dh.suggestedFilename()} ${Math.round(html.length / 1024)} KB`)
  check(B, 'HTML export embeds the CV font', /@font-face[^}]*data:font\/woff2/.test(html))

  // The HTML file opened from disk renders on its own.
  const hp = await p.context().newPage()
  await hp.goto('file://' + hf)
  check(B, 'the exported HTML opens from disk and shows the CV', (await hp.locator('body').innerText()).includes('Nadia Martín Reyes'))
  await hp.close()

  const n0 = await idbDocCount(p)
  await p.getByRole('button', { name: /Importar/ }).first().click()
  await p.locator('input[type=file][accept*="json"]').setInputFiles(jf)
  check(B, 'JSON import creates a new CV', await until(async () => (await idbDocCount(p)) === n0 + 1, { timeout: 4000 }), `${n0} → ${await idbDocCount(p)}`)
  check(B, 'the imported CV keeps its template', await until(async () => (await p.locator('button.chip').first().innerText()).includes('Meridian'), { timeout: 3000 }))

  const bad = path.join(outDir, 'bad.json')
  fs.writeFileSync(bad, '{"schemaVersion": 99}')
  await p.getByRole('button', { name: /Importar/ }).first().click()
  await p.locator('input[type=file][accept*="json"]').setInputFiles(bad)
  check(B, 'a JSON from a newer version is refused with a message', await until(() => p.locator('.import').getByText(/versión|version|esquema/i).first().isVisible(), { timeout: 3000 }))

  if (printedPdf) {
    await p.locator('input[type=file][accept*="pdf"]').setInputFiles(printedPdf)
    check(B, 'the PDF the browser printed imports into a review', await until(async () => /Nadia|Martín/.test(await p.locator('.import').innerText()), { timeout: 30000 }))
  }
  check(B, 'no console errors', p.errs.length === 0, p.errs.join(' | '))
  await p.context().close()
}

/** D · My CVs, preferences, rail and footer navigation, preview zoom. */
async function documentsAndPrefs(browser) {
  const B = 'docs+prefs'
  const p = await open(browser)
  await startSample(p)

  await step(p, 'Resumen')
  await p.getByRole('button', { name: /Siguiente: Experiencia/ }).click()
  check(B, 'the footer Next goes to the next step', await p.getByRole('heading', { name: 'Experiencia' }).first().isVisible())

  const zoom = () => p.locator('.zoom-value').innerText()
  const z0 = await zoom()
  await p.getByRole('button', { name: 'Acercar', exact: true }).click()
  check(B, 'zoom + changes the zoom', await until(async () => (await zoom()) !== z0, { timeout: 1000 }), `${z0} → ${await zoom()}`)
  await p.getByRole('button', { name: /Ajustar la página/ }).click()

  await p.getByRole('button', { name: 'Mis CVs' }).first().click()
  const tiles = p.locator('li.tile')
  await tiles.first().waitFor()
  const n0 = await tiles.count()
  await p.locator('li.tile', { hasText: 'Nadia' }).first().getByRole('button', { name: 'Duplicar' }).click()
  check(B, 'Duplicate adds a CV titled "(2)"', await until(async () => (await tiles.count()) === n0 + 1 && (await p.locator('li.tile', { hasText: '(2)' }).count()) === 1, { timeout: 3000 }))
  await p.getByRole('searchbox').fill('nadia')
  check(B, 'search filters by name', await until(async () => (await tiles.count()) === 2, { timeout: 1000 }))
  await p.getByRole('searchbox').fill('zzz')
  check(B, 'a search with no match says so', await until(() => p.getByText(/zzz/).isVisible(), { timeout: 1000 }))
  await p.getByRole('searchbox').fill('')
  await p.locator('li.tile', { hasText: '(2)' }).getByRole('button', { name: 'Eliminar' }).click()
  check(B, 'delete asks for confirmation', await p.getByText(/¿Eliminar|Eliminar «/).first().isVisible())
  await p.getByRole('button', { name: 'Confirmar' }).click()
  check(B, 'confirming deletes it', await until(async () => (await tiles.count()) === n0, { timeout: 3000 }))

  await p.getByRole('button', { name: /Preferencias/ }).first().click()
  await p.getByRole('radio', { name: 'English' }).click()
  check(B, 'the UI switches to English', await until(() => p.getByRole('button', { name: /^My CVs/ }).first().isVisible(), { timeout: 2000 }))
  await p.getByRole('radio', { name: /Dark|Oscuro/ }).click()
  check(B, 'the theme switches to dark', (await p.evaluate(() => document.documentElement.dataset.theme)) === 'dark')
  await p.reload({ waitUntil: 'networkidle' })
  check(B, 'language and theme persist after a reload', (await p.evaluate(() => document.documentElement.lang)) === 'en' && (await p.evaluate(() => document.documentElement.dataset.theme)) === 'dark')
  check(B, 'the CV page stays white in dark mode', (await p.locator('.cv-page').first().evaluate((e) => getComputedStyle(e).backgroundColor)) === 'rgb(255, 255, 255)')

  check(B, 'no console errors', p.errs.length === 0, p.errs.join(' | '))
  await p.context().close()
}

/** E · phone: dock through every step, export on the last one, preview, sheets. */
async function phone(browser) {
  const B = 'phone'
  const p = await open(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  check(B, 'the welcome fits the width', (await overflow(p)) === 0)
  await p.getByRole('button', { name: /Desde un ejemplo/ }).tap()
  check(B, 'the editor opens on Datos personales', await until(() => p.getByText('Datos personales').first().isVisible(), { timeout: 3000 }))
  const seen = []
  for (let i = 0; i < 8; i++) {
    const counter = await p.getByText(/^\d de 9$/).first().innerText().catch(() => '?')
    await p.locator('button.action').filter({ hasText: 'Siguiente' }).last().tap()
    await until(async () => (await p.getByText(/^\d de 9$/).first().innerText().catch(() => '?')) !== counter, { timeout: 2000 })
    seen.push(await p.getByText(/^\d de 9$/).first().innerText().catch(() => '?'))
    if (await overflow(p)) check(B, 'no horizontal scroll on ' + seen.at(-1), false)
  }
  check(B, 'Next walks all nine steps', seen.at(-1) === '9 de 9', seen.join(' › '))
  const last = p.locator('button.action:visible').last()
  const lastText = (await last.innerText()).trim()
  await last.tap()
  const sheet = await until(() => p.locator('dialog[open]').innerText(), { timeout: 2000 })
  check(B, 'on the last step the main action is Exportar and opens the export sheet', lastText === 'Exportar' && /PDF[\s\S]*JSON/.test(sheet || ''), lastText)
  await p.keyboard.press('Escape')
  await until(async () => !(await p.locator('dialog[open]').count()), { timeout: 2000 })
  await p.getByRole('button', { name: 'Vista previa' }).last().tap()
  check(B, 'preview mode shows the CV', await previewHas(p, 'Nadia', 3000))
  await p.getByRole('button', { name: 'Editar' }).tap()
  await p.getByRole('button', { name: /Cambiar de paso/ }).tap()
  const steps = await until(() => p.locator('dialog[open]').innerText(), { timeout: 2000 })
  check(B, 'the step sheet lists the steps', /Experiencia[\s\S]*Exportar/.test(steps || ''))
  await p.locator('dialog[open] button', { hasText: 'Competencias' }).tap()
  check(B, 'picking a step in the sheet goes there', await until(async () => !(await p.locator('dialog[open]').count()) && p.getByText('Competencias').first().isVisible(), { timeout: 2000 }))
  await p.getByRole('button', { name: /Menú|Más opciones|Menu/ }).first().tap()
  const menu = await until(() => p.locator('dialog[open]').innerText(), { timeout: 2000 })
  check(B, 'the menu has My CVs, Import and preferences', /Mis CVs/.test(menu) && /Importar/.test(menu) && /Tema/.test(menu))
  check(B, 'no console errors', p.errs.length === 0, p.errs.join(' | '))
  await p.context().close()
}

/** F · no horizontal scroll at 320/768/1024; Fit at 2560. */
async function widths(browser) {
  const B = 'widths'
  for (const w of [320, 768, 1024]) {
    const p = await open(browser, { viewport: { width: w, height: 800 }, isMobile: w < 700, hasTouch: w < 700 })
    await startSample(p)
    const bad = []
    for (let i = 0; i < 9; i++) {
      const ov = await overflow(p)
      if (ov > 0) bad.push(`step${i + 1}:${ov}px`)
      const next = p.locator('button:visible').filter({ hasText: /^Siguiente/ }).last()
      // The last step has no Next at all; isDisabled() on a missing element would wait 30 s.
      if (!(await next.count()) || (await next.isDisabled())) break
      // The step is the one marked current in the rail, or the dock's "N de 9" on narrow screens.
      const where = () => p.evaluate(() => (document.querySelector('[aria-current="step"]')?.textContent || '') + ([...document.querySelectorAll('*')].find((e) => /^\d de 9$/.test(e.textContent.trim()))?.textContent || ''))
      const h = await where()
      await next.click()
      await until(async () => (await where()) !== h, { timeout: 1500 })
    }
    for (const view of ['Mis CVs', 'Importar']) {
      const nav = p.getByRole('button', { name: view }).first()
      if (await nav.isVisible().catch(() => false)) {
        await nav.click()
        await p.locator(view === 'Mis CVs' ? 'li.tile' : '.import').first().waitFor({ timeout: 3000 })
        const ov = await overflow(p)
        if (ov > 0) bad.push(`${view}:${ov}px`)
      }
    }
    check(B, `${w}px: no horizontal scroll in any step or view`, bad.length === 0, bad.join(', '))
    check(B, `${w}px: no console errors`, p.errs.length === 0, p.errs.join(' | '))
    await p.context().close()
  }
  const p = await open(browser, { viewport: { width: 2560, height: 1400 } })
  await startSample(p)
  const z = async () => parseInt(await p.locator('.zoom-value').innerText())
  check(B, '2560px: the fitted zoom is at most 100 %', (await z()) <= 100, `${await z()} %`)
  await p.getByRole('button', { name: 'Acercar' }).click()
  await p.getByRole('button', { name: 'Acercar' }).click()
  check(B, '2560px: + still goes above 100 %', await until(async () => (await z()) > 100, { timeout: 1000 }))
  await p.getByRole('button', { name: /Ajustar la página/ }).click()
  check(B, '2560px: Fit returns to at most 100 %', await until(async () => (await z()) <= 100, { timeout: 1000 }))
  await p.context().close()
}

/**
 * G · an install from before the rename (spec 039): the documents and the photo are in the "cv-maker"
 * database and the preferences under "cv-maker:prefs". They must show up under the new name.
 */
async function renameMigration(browser) {
  const B = 'rename'
  let p = await open(browser)
  await startSample(p)
  await p.locator('.photo-drop input[type=file]').setInputFiles(path.join(__dirname, '../fixtures/portrait.jpg')).catch(() => {})
  await p.locator('dialog.crop[open] canvas').waitFor({ timeout: 4000 }).catch(() => {})
  await p.getByRole('button', { name: 'Usar foto' }).click({ timeout: 2000 }).catch(() => {})
  await until(async () => /photo:/.test(await idbDump(p)) || (await idbDocCount(p)) > 0, { timeout: 4000 })
  await sleep(800)

  // The app's page is closed (it holds the database open, even in the back/forward cache) and a page of the
  // same origin that does not start the app moves the data back to where the old version kept it.
  const next = await p.context().newPage()
  await p.close()
  p = next
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await p.goto(BASE + 'favicon.svg')
  const moved = await p.evaluate(async () => {
    const open = (name) => new Promise((resolve, reject) => { const r = indexedDB.open(name); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    const next = await open('keireki-craft')
    const objects = next.transaction('kv').objectStore('kv')
    const [keys, values] = await Promise.all([new Promise((r) => { const q = objects.getAllKeys(); q.onsuccess = () => r(q.result) }), new Promise((r) => { const q = objects.getAll(); q.onsuccess = () => r(q.result) })])
    next.close()
    await new Promise((r, reject) => { const q = indexedDB.deleteDatabase('keireki-craft'); q.onsuccess = () => r(); q.onerror = () => reject(q.error); q.onblocked = () => setTimeout(() => reject(new Error('delete blocked')), 3000) })
    const legacy = await new Promise((resolve, reject) => { const r = indexedDB.open('cv-maker', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    await new Promise((resolve, reject) => { const tx = legacy.transaction('kv', 'readwrite'); keys.forEach((k, i) => tx.objectStore('kv').put(values[i], k)); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error) })
    legacy.close()
    localStorage.clear()
    localStorage.setItem('cv-maker:prefs', JSON.stringify({ uiLanguage: 'en', theme: 'dark' }))
    return keys
  })
  check(B, 'the old install is set up (documents and photo under "cv-maker")', moved.some((k) => k.startsWith('photo:')) && moved.includes('index'), moved.join(', '))

  check(B, 'the new database is gone before the app starts', !(await p.evaluate(async () => (await indexedDB.databases()).some((d) => d.name === 'keireki-craft'))))
  await p.goto(BASE, { waitUntil: 'networkidle' })
  check(B, 'the CV is there under the new name', await until(async () => (await p.locator('.pane .cv-page').innerText().catch(() => '')).includes('Nadia Martín Reyes'), { timeout: 6000 }))
  check(B, 'the documents are in the new database', (await idbDocCount(p)) === 1, String(await idbDocCount(p)))
  const keys = await p.evaluate(() => new Promise((resolve) => { const r = indexedDB.open('keireki-craft'); r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').getAllKeys(); q.onsuccess = () => resolve(q.result) } }))
  check(B, 'the photo came with it', keys.some((k) => k.startsWith('photo:')), keys.join(', '))
  check(B, 'the old preferences carry over', (await p.evaluate(() => document.documentElement.lang)) === 'en' && (await p.evaluate(() => document.documentElement.dataset.theme)) === 'dark')
  check(B, 'the old database is deleted once the copy is checked', await until(() => p.evaluate(async () => !(await indexedDB.databases()).some((d) => d.name === 'cv-maker')), { timeout: 4000 }))
  check(B, 'the app is called Keireki Craft', (await p.title()) === 'Keireki Craft' && (await p.locator('.crumbs, header').first().innerText()).includes('Keireki Craft'))
  // The next start must not bring the old copy over what was edited since: the new database wins.
  // The old preferences set the UI to English.
  await step(p, 'Personal details')
  await p.getByLabel('Full name').fill('Editada tras migrar')
  check(B, 'an edit after the migration is saved', await until(async () => (await idbDump(p)).includes('Editada tras migrar'), { timeout: 4000 }))
  await p.reload({ waitUntil: 'networkidle' })
  check(B, 'the next start keeps the edit and does not copy the old data again', await until(async () => (await p.locator('.pane .cv-page').innerText().catch(() => '')).includes('Editada tras migrar'), { timeout: 6000 }))
  check(B, 'no console errors', errs.length === 0, errs.join(' | '))
  await p.context().close()

  // Storage that cannot be opened says so, instead of an empty or blank app.
  const broken = await browser.newContext({ locale: 'es-ES' })
  await broken.addInitScript(() => {
    const open = IDBFactory.prototype.open
    IDBFactory.prototype.open = function (name, ...rest) {
      if (name === 'keireki-craft') throw new Error('storage unavailable')
      return open.call(this, name, ...rest)
    }
  })
  const q = await broken.newPage()
  await q.goto(BASE, { waitUntil: 'networkidle' })
  check(B, 'storage that cannot be opened shows a message and a reload button', await until(async () => /No se pudo abrir el almacenamiento/.test(await q.locator('.startup-failed').innerText().catch(() => '')) && (await q.getByRole('button', { name: 'Recargar' }).isVisible()), { timeout: 4000 }))
  await broken.close()
}

/**
 * H · the page does not move while a PDF is built or the paginated view is open (spec 041): paged.js left
 * a copy of the interface CSS after the original, and a base rule then beat the media query overriding it.
 */
async function noLayoutShift(browser) {
  const B = 'layout'
  const p = await open(browser, { acceptDownloads: true })
  await startSample(p)
  await step(p, 'Exportar')
  const rects = () => p.evaluate(() => ['.editor', '.editor-rail', '.editor-form', '.editor-preview'].map((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? [r.x, r.y, r.width, r.height].map(Math.round).join(',') : '-' }).join(' | '))
  // The page's background too: paged.js applied print.css's `html, body { background: #fff }` to the app (spec 055).
  const backgrounds = () => p.evaluate(() => [document.documentElement, document.body].map((e) => getComputedStyle(e).backgroundColor).join(' / '))
  const watch = () => p.evaluate(() => { window.__rects = new Set(); window.__bgs = new Set(); const sel = ['.editor', '.editor-rail', '.editor-form', '.editor-preview']; const tick = () => { window.__rects.add(sel.map((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? [r.x, r.y, r.width, r.height].map(Math.round).join(',') : '-' }).join(' | ')); window.__bgs.add([document.documentElement, document.body].map((e) => getComputedStyle(e).backgroundColor).join(' / ')); window.__watch = requestAnimationFrame(tick) }; tick() })
  const seen = () => p.evaluate(() => { cancelAnimationFrame(window.__watch); return [...window.__rects] })
  const seenBackgrounds = () => p.evaluate(() => [...window.__bgs])
  const before = await rects()
  const bg = await backgrounds()

  await watch()
  await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.getByRole('button', { name: 'Descargar PDF' }).click()])
  await sleep(600)
  const during = await seen()
  check(B, 'building the direct PDF moves nothing on the page', during.length === 1 && during[0] === before, during.length > 1 ? `${during.length} different layouts: ${during.slice(0, 2).join(' ‖ ')}` : '')
  const duringBg = await seenBackgrounds()
  check(B, 'building the direct PDF leaves the page background alone', duringBg.length === 1 && duringBg[0] === bg, duringBg.join(' ‖ '))

  await watch()
  await p.getByRole('button', { name: 'Ver vista previa' }).click()
  await p.locator('dialog[open] .pagedjs_page, .pagedjs_page').first().waitFor({ timeout: 20000 }).catch(() => {})
  await sleep(800)
  const preview = await seen()
  check(B, 'the paginated view moves nothing either, opening or open', preview.length === 1 && preview[0] === before, preview.length > 1 ? `${preview.length} different layouts: ${preview.slice(0, 2).join(' ‖ ')}` : '')
  const previewBg = await seenBackgrounds()
  check(B, 'the paginated view leaves the page background alone, opening or open', previewBg.length === 1 && previewBg[0] === bg, previewBg.join(' ‖ '))
  check(B, 'no console errors', p.errs.length === 0, p.errs.join(' | '))
  await p.context().close()
}

module.exports = { mainFlow, customAndStyle, exportImport, documentsAndPrefs, phone, widths, renameMigration, noLayoutShift }
