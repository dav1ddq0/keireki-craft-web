// The end-to-end suite on the built site (`vite preview`: production bundle and CSP), in Chromium.
// Performance first and alone (clean timings), then every functional block in parallel contexts.
// Usage: npm run qa:e2e (builds first). Reports to .qa/e2e/.
const fs = require('node:fs')
const path = require('node:path')
const { ROOT, startServer } = require('../lib/server.cjs')

;(async () => {
  const outDir = path.join(ROOT, '.qa/e2e')
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })
  const server = await startServer('preview')
  process.env.BASE = server.url
  const { chromium, results, timings, ENGINE } = require('./lib.cjs')
  const perf = require('./perf.cjs')
  const flows = require('./flows.cjs')
  const transitions = require('./transitions.cjs')
  const fidelity = require('./fidelity.cjs')
  const offline = require('./offline.cjs')

  const started = Date.now()
  const browser = await chromium.launch()
  const blockTimes = {}
  const timed = (name, fn) => async () => {
    const t0 = Date.now()
    try {
      await fn()
    } catch (error) {
      results.push({ block: name, name: 'block crashed', ok: false, detail: String(error.message).split('\n')[0] })
      console.log(`CRASH [${name}] ${String(error.message).split('\n').slice(0, 3).join(' ')}`)
    }
    blockTimes[name] = Date.now() - t0
  }

  try {
    // The performance block prints with page.pdf() and the rename block reads an SVG page's storage: Chromium only.
    if (ENGINE === 'chromium') await timed('perf', () => perf.run(browser, outDir))()
    else console.log(`(perf and rename blocks skipped on ${ENGINE}: they need Chromium)`)
    const printed = path.join(outDir, 'printed.pdf')
    const blocks = [
      timed('main', () => flows.mainFlow(browser)),
      timed('custom+style', () => flows.customAndStyle(browser)),
      timed('export+import', () => flows.exportImport(browser, outDir, fs.existsSync(printed) ? printed : null)),
      timed('docs+prefs', () => flows.documentsAndPrefs(browser)),
      ...(ENGINE === 'chromium' ? [timed('rename', () => flows.renameMigration(browser))] : []),
      timed('layout', () => flows.noLayoutShift(browser)),
      timed('phone', () => flows.phone(browser)),
      timed('ai', () => flows.aiImprove(browser)),
      timed('widths', () => flows.widths(browser)),
      timed('transitions', () => transitions.run(browser)),
      timed('fidelity', () => fidelity.run(browser, outDir)),
      timed('offline', () => offline.run(browser)),
    ]
    // Other engines are slower with every block at once, and the animation checks sample frames: one at a time there.
    if (ENGINE === 'chromium') await Promise.all(blocks.map((block) => block()))
    else for (const block of blocks) await block()
  } finally {
    await browser.close()
    server.stop()
  }

  console.log('\n== timings (ms; ⚠ over budget)')
  for (const t of timings) console.log(`${t.budget && t.ms > t.budget ? '⚠' : ' '} ${String(t.ms).padStart(6)}  ${t.name}${t.budget ? `  (budget ${t.budget})` : ''}`)
  console.log('\n== info')
  for (const r of results.filter((r) => r.ok && r.detail && r.block === 'perf')) console.log(`  ${r.name}: ${r.detail}`)
  const failed = results.filter((r) => !r.ok)
  console.log(`\n== ${results.length - failed.length}/${results.length} checks pass`)
  for (const r of failed) console.log(`FAIL [${r.block}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`)
  console.log('\n== block wall time (s):', Object.entries(blockTimes).map(([k, v]) => `${k} ${(v / 1000).toFixed(1)}`).join(' · '), `· total ${((Date.now() - started) / 1000).toFixed(1)}`)
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ results, timings, blockTimes }, null, 2))
  process.exitCode = failed.length ? 1 : 0
})()
