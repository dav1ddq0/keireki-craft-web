// The site's own images (spec 066), into public/:
//   - og-image.png, 1200×630: the card a shared link shows (logo, name, one sentence, the sample CV);
//   - apple-touch-icon.png (180), icon-192.png, icon-512.png: public/favicon.svg as PNG, which is what
//     phones and link crawlers read.
// Usage: npm run build && node docs/site-images.cjs
const fs = require('node:fs')
const path = require('node:path')
const { startServer } = require('../qa/lib/server.cjs')

const PUBLIC = path.join(__dirname, '../public')
const LOGO = fs.readFileSync(path.join(PUBLIC, 'favicon.svg'), 'utf8')

;(async () => {
  const server = await startServer('preview')
  const { chromium } = require('playwright')
  const browser = await chromium.launch()
  try {
    // ---- the sample CV's first page, in English, as the right half of the card.
    let page
    {
      const context = await browser.newContext({ locale: 'en-GB', colorScheme: 'light', viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 })
      await context.addInitScript(() => localStorage.setItem('keireki-craft:prefs', JSON.stringify({ uiLanguage: 'en', theme: 'light' })))
      const p = await context.newPage()
      await p.goto(server.url, { waitUntil: 'networkidle' })
      await p.getByRole('button', { name: /From a sample/ }).first().click()
      await p.getByText('Emma Clarke').first().waitFor({ state: 'attached' })
      const gotIt = p.getByRole('button', { name: 'Got it' })
      if (await gotIt.count()) await gotIt.first().click()
      await p.waitForTimeout(600)
      const box = await p.locator('.pane .cv-page').first().boundingBox()
      page = (await p.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: (box.width * 297) / 210 } })).toString('base64')
      await context.close()
    }

    // ---- og-image.png
    {
      const p = await (await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage()
      await p.setContent(`<style>
        body { margin: 0; width: 1200px; height: 630px; overflow: hidden; display: flex; align-items: center;
               background: linear-gradient(135deg, #eef2fb 0%, #dfe7f8 100%); font-family: system-ui, sans-serif; color: #111827; }
        .text { flex: 1; padding: 0 40px 0 80px; }
        .logo { width: 112px; height: 112px; }
        h1 { font-size: 72px; line-height: 1; margin: 28px 0 20px; letter-spacing: -1.5px; }
        p { font-size: 32px; line-height: 1.3; margin: 0 0 28px; color: #374151; }
        .url { font-size: 26px; font-weight: 600; color: #1d4ed8; }
        .cv { width: 420px; margin: 64px 72px 0 0; align-self: flex-start; border-radius: 6px;
              box-shadow: 0 24px 48px rgb(17 24 39 / 0.22), 0 2px 6px rgb(17 24 39 / 0.12); }
      </style>
      <div class="text"><div class="logo">${LOGO}</div><h1>Keireki Craft</h1>
        <p>A CV editor that runs entirely in your browser. No account, no upload.</p>
        <div class="url">keireki-craft.eu</div></div>
      <img class="cv" src="data:image/png;base64,${page}">`)
      await p.screenshot({ path: path.join(PUBLIC, 'og-image.png') })
      await p.context().close()
    }

    // ---- the icons: the favicon on its own, at each size.
    for (const [file, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
      const p = await (await browser.newContext({ viewport: { width: size, height: size } })).newPage()
      await p.setContent(`<style>html, body { margin: 0; background: transparent; } svg { display: block; width: ${size}px; height: ${size}px; }</style>${LOGO}`)
      await p.screenshot({ path: path.join(PUBLIC, file), omitBackground: file !== 'apple-touch-icon.png' })
      await p.context().close()
    }
  } finally {
    await browser.close()
    server.stop()
  }
  for (const f of ['og-image.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'])
    console.log(`${f}  ${(fs.statSync(path.join(PUBLIC, f)).size / 1024).toFixed(0)} KB`)
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
