import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { precacheOf, serviceWorkerSource } from './build/serviceWorker'

/**
 * Content-Security-Policy for the built site (spec 017). A meta tag because GitHub Pages cannot send
 * headers; build-only because the dev server needs inline scripts and a websocket for HMR.
 * `style-src 'unsafe-inline'` is required by Vue style bindings and paged.js; what it would let a
 * hostile file do with CSS is closed by the validation in `core/migrations.ts`.
 * `connect-src` allows ipwho.is, and nothing else outside the site: the phone's default country
 * (spec 056) is the one network request of the editor, for the country code only.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self' blob: data: https://ipwho.is",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'keireki-craft:csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    ],
  }
}

/**
 * `sw.js` for the built site (spec 067), with the list of every emitted file and of `public/`.
 * `public/` files keep their names when they change, so their content goes into the version and
 * the worker fetches them again at each install. Build-only: `npm run dev` has no worker.
 */
function serviceWorker(): Plugin {
  const publicDir = fileURLToPath(new URL('./public', import.meta.url))
  return {
    name: 'keireki-craft:service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const publicFiles = (readdirSync(publicDir, { recursive: true }) as string[])
        .map((f) => f.split('\\').join('/'))
        .filter((f) => statSync(join(publicDir, f)).isFile())
      const known = [...Object.keys(bundle), ...publicFiles].filter((f) => !f.endsWith('.map')).sort()
      const hash = createHash('sha256').update(known.join('\n'))
      for (const f of publicFiles.sort()) hash.update(readFileSync(join(publicDir, f)))
      const precache = precacheOf(known)
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: serviceWorkerSource({
          version: hash.digest('hex').slice(0, 12),
          known,
          precache,
          fresh: precache.filter((f) => publicFiles.includes(f)),
          commit: buildCommit(),
        }),
      })
    },
  }
}

/** The commit being built: the workflow's, or the checkout's (`qa:live` waits for it, spec 068). */
function buildCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'unknown'
  }
}

// `base` is the root, where the custom domain (keireki-craft.eu) serves the site, so local preview
// matches production. Override with BASE_PATH to deploy under a path, e.g. a GitHub Pages project
// site without the domain (/<repo>/).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [vue(), contentSecurityPolicy(), serviceWorker()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // pdf.js ships its worker as a separate chunk; keep it out of the main bundle.
  worker: { format: 'es' },
  // Unit tests cover the pure layers (model, migrations, import heuristics);
  // nothing there needs a DOM, so the default node environment is enough.
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
