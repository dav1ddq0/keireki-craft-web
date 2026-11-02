import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

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

// `base` is the root, where the custom domain (keireki-craft.eu) serves the site, so local preview
// matches production. Override with BASE_PATH to deploy under a path, e.g. a GitHub Pages project
// site without the domain (/<repo>/).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [vue(), contentSecurityPolicy()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // pdf.js ships its worker as a separate chunk; keep it out of the main bundle.
  worker: { format: 'es' },
  // Unit tests cover the pure layers (model, migrations, import heuristics);
  // nothing there needs a DOM, so the default node environment is enough.
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
