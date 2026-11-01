// The README's images (spec 065), from the built app, in English with the English sample:
//   - demo.gif: the headline typed into the form, the preview following it, a few templates and
//     an accent colour;
//   - templates-light.webp / templates-dark.webp: the first page of every template, named;
//   - phone.webp: the editor and the preview on a phone, on a transparent ground.
// The GIF and the WebP files are written by Python's Pillow (Playwright's ffmpeg cannot write GIF);
// Pillow is not a project dependency: `pip install pillow` once.
// Usage: npm run build && node docs/readme-media.cjs [out dir, default docs/images]
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { startServer } = require('../qa/lib/server.cjs')

const OUT = path.resolve(process.argv[2] ?? path.join(__dirname, 'images'))
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-media-'))
/** The templates the demo walks through, after the sample's own, in the gallery's order (it scrolls down). */
const DEMO_TEMPLATES = ['Banner', 'Cobalt', 'Editorial', 'Monogram']

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const server = await startServer('preview')
  const { chromium } = require('playwright')
  const browser = await chromium.launch()
  const jobs = { gif: null, stills: [] }

  /** A fresh page of the app in English with the sample CV open. */
  async function withSample(contextOptions, theme = 'light') {
    const context = await browser.newContext({ locale: 'en-GB', colorScheme: theme, ...contextOptions })
    await context.addInitScript((t) => localStorage.setItem('keireki-craft:prefs', JSON.stringify({ uiLanguage: 'en', theme: t })), theme)
    const p = await context.newPage()
    await p.goto(server.url, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: /From a sample/ }).first().click()
    await p.getByText('Emma Clarke').first().waitFor({ state: 'attached' })
    const gotIt = p.getByRole('button', { name: 'Got it' })
    if (await gotIt.count()) await gotIt.first().click()
    await settled(p)
    return p
  }

  /** Waits until no CSS transition or animation runs for a few frames. */
  const settled = (p) =>
    p.evaluate(() => new Promise((resolve) => {
      let quiet = 0
      const tick = () => ((quiet = document.getAnimations().length ? 0 : quiet + 1) >= 4 ? resolve() : requestAnimationFrame(tick))
      requestAnimationFrame(tick)
    }))
  const step = async (p, name) => {
    await p.locator('nav button.row', { hasText: name }).first().click()
    await settled(p)
  }
  /** A smooth scroll to what comes next, as a person would, rather than Playwright's jump. */
  const scrollTo = async (p, locator) => {
    await locator.first().evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    await p.waitForTimeout(700)
  }
  const pickTemplate = async (p, name) => {
    await p.locator('button.card', { has: p.locator('.card-name', { hasText: new RegExp(`^${name}$`) }) }).click()
    await settled(p)
    await p.waitForTimeout(150)
  }

  try {
    // ---- demo.gif: Chromium's screencast, a frame each time the page changes, with its time.
    {
      // Twice the pixels, then down to 1600 px: sharp on a high-density screen, where GitHub shows
      // the README's 880 CSS px with about 1760 real ones.
      const p = await withSample({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
      const cdp = await p.context().newCDPSession(p)
      const frames = []
      cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
        const file = path.join(TMP, `frame-${String(frames.length).padStart(4, '0')}.png`)
        fs.writeFileSync(file, Buffer.from(data, 'base64'))
        frames.push({ file, t: metadata.timestamp * 1000 })
        cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
      })
      await cdp.send('Page.startScreencast', { format: 'png' })
      await p.waitForTimeout(1200)
      const headline = p.getByLabel('Professional headline')
      await headline.click()
      await headline.press('ControlOrMeta+a')
      await headline.pressSequentially('Staff Frontend Engineer', { delay: 110 })
      await p.waitForTimeout(1400)
      await step(p, 'Template and style')
      await p.waitForTimeout(900)
      for (const name of DEMO_TEMPLATES) {
        await scrollTo(p, p.locator('button.card', { has: p.locator('.card-name', { hasText: new RegExp(`^${name}$`) }) }))
        await pickTemplate(p, name)
        await p.waitForTimeout(1300)
      }
      await scrollTo(p, p.locator('.color-row'))
      await p.locator('.color-row .swatch').nth(3).click()
      await p.waitForTimeout(1800)
      await cdp.send('Page.stopScreencast')
      jobs.gif = { out: path.join(OUT, 'demo.gif'), width: 1600, frames: frames.map((f, i) => ({ file: f.file, ms: Math.round((frames[i + 1]?.t ?? f.t + 1800) - f.t) })) }
      await p.context().close()
    }

    // ---- the templates: the first page of each, then one named grid per theme.
    const pages = []
    {
      const p = await withSample({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 })
      await step(p, 'Template and style')
      const names = await p.locator('button.card .card-name').allInnerTexts()
      for (const name of names) {
        await pickTemplate(p, name)
        const box = await p.locator('.pane .cv-page').first().boundingBox()
        const file = path.join(TMP, `template-${name}.png`)
        await p.screenshot({ path: file, clip: { x: box.x, y: box.y, width: box.width, height: (box.width * 297) / 210 } })
        pages.push({ name, data: fs.readFileSync(file).toString('base64') })
      }
      await p.context().close()
    }
    for (const theme of ['light', 'dark']) {
      const p = await (await browser.newContext({ viewport: { width: 1320, height: 400 }, deviceScaleFactor: 1.5 })).newPage()
      const [ground, ink, line] = theme === 'light' ? ['#ffffff', '#1f2328', '#d1d9e0'] : ['#0d1117', '#f0f6fc', '#3d444d']
      await p.setContent(`<style>
        body { margin: 0; padding: 24px; background: ${ground}; color: ${ink}; font: 600 15px/1.2 system-ui, sans-serif; }
        .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 28px 24px; }
        figure { margin: 0; text-align: center; }
        img { display: block; width: 100%; border: 1px solid ${line}; border-radius: 6px; margin-bottom: 10px; }
      </style><div class="grid">${pages.map((t) => `<figure><img src="data:image/png;base64,${t.data}"><figcaption>${t.name}</figcaption></figure>`).join('')}</div>`)
      const file = path.join(TMP, `templates-${theme}.png`)
      await p.screenshot({ path: file, fullPage: true })
      jobs.stills.push({ file, out: path.join(OUT, `templates-${theme}.webp`) })
      await p.context().close()
    }

    // ---- the phone: the editor and the preview, side by side.
    {
      const p = await withSample({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
      const editor = path.join(TMP, 'phone-editor.png')
      await p.screenshot({ path: editor })
      await p.getByRole('button', { name: 'Preview', exact: true }).first().click()
      await settled(p)
      await p.waitForTimeout(400)
      const preview = path.join(TMP, 'phone-preview.png')
      await p.screenshot({ path: preview })
      await p.context().close()

      const c = await (await browser.newContext({ viewport: { width: 860, height: 400 }, deviceScaleFactor: 1.5 })).newPage()
      const shot = (f) => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">`
      await c.setContent(`<style>
        html, body { margin: 0; background: transparent; }
        .row { display: flex; gap: 32px; padding: 16px; width: max-content; }
        img { width: 390px; border: 10px solid #1f2328; border-radius: 36px; box-shadow: 0 8px 24px rgb(0 0 0 / 0.25); }
      </style><div class="row">${shot(editor)}${shot(preview)}</div>`)
      const file = path.join(TMP, 'phone.png')
      await c.locator('.row').screenshot({ path: file, omitBackground: true })
      jobs.stills.push({ file, out: path.join(OUT, 'phone.webp') })
      await c.context().close()
    }
  } finally {
    await browser.close()
    server.stop()
  }

  const python = spawnSync('python3', ['-c', PILLOW, JSON.stringify(jobs)], { stdio: 'inherit' })
  fs.rmSync(TMP, { recursive: true, force: true })
  if (python.status !== 0) throw new Error('Pillow could not write the images (pip install pillow)')
  for (const f of fs.readdirSync(OUT)) console.log(`${f}  ${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0)} KB`)
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

/** One palette for the whole GIF, so a still area keeps its colours and Pillow only writes what moved. */
const PILLOW = `
import json, sys
from PIL import Image

jobs = json.loads(sys.argv[1])

for still in jobs['stills']:
    Image.open(still['file']).save(still['out'], 'WEBP', quality=88, method=6)

gif = jobs['gif']
# At most about 12 frames a second: a frame shorter than that is held instead by the one before it.
kept = []
for frame in gif['frames']:
    if kept and kept[-1]['ms'] < 80:
        kept[-1] = {'file': frame['file'], 'ms': kept[-1]['ms'] + frame['ms']}
    else:
        kept.append(dict(frame))
gif['frames'] = kept
def load(frame):
    im = Image.open(frame['file']).convert('RGB')
    return im.resize((gif['width'], round(im.height * gif['width'] / im.width)), Image.LANCZOS)
frames = [load(f) for f in gif['frames']]
sample = Image.new('RGB', (frames[0].width, frames[0].height * 4))
for i, k in enumerate([0, len(frames) // 3, 2 * len(frames) // 3, len(frames) - 1]):
    sample.paste(frames[k], (0, frames[0].height * i))
palette = sample.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
indexed = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]
indexed[0].save(gif['out'], save_all=True, append_images=indexed[1:], duration=[max(20, f['ms']) for f in gif['frames']], loop=0, optimize=False)
`
