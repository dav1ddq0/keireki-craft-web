import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const SITE = 'https://keireki-craft.eu/'
const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
const meta = (attr: 'name' | 'property', key: string) =>
  html.match(new RegExp(`<meta ${attr}="${key.replace(/[:.]/g, '\\$&')}" content="([^"]+)"`))?.[1]
/** A file of the site, as `public/` puts it at the root. */
const served = (url: string) => existsSync(join(ROOT, 'public', url.replace(SITE, '').replace(/^\//, '')))

/** PNG width and height, from the IHDR chunk. */
function pngSize(file: string) {
  const bytes = readFileSync(join(ROOT, 'public', file))
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

describe('Link preview and search (spec 066)', () => {
  it('describes the page with the card a shared link shows, at absolute addresses', () => {
    for (const key of ['og:type', 'og:site_name', 'og:title', 'og:description', 'og:image:alt']) expect(meta('property', key), key).toBeTruthy()
    expect(meta('property', 'og:url')).toBe(SITE)
    expect(meta('name', 'twitter:card')).toBe('summary_large_image')
    expect(meta('name', 'description')).toBeTruthy()
    expect(html).toContain(`<link rel="canonical" href="${SITE}" />`)
    const image = meta('property', 'og:image')!
    expect(image.startsWith(SITE)).toBe(true)
    expect(served(image)).toBe(true)
  })

  it('has a social image of the size it declares', () => {
    const { width, height } = pngSize('og-image.png')
    expect({ width, height }).toEqual({ width: 1200, height: 630 })
    expect(meta('property', 'og:image:width')).toBe(String(width))
    expect(meta('property', 'og:image:height')).toBe(String(height))
  })

  it('has PNG icons for phones, each the size it is named', () => {
    for (const [file, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]] as const) {
      expect(pngSize(file), file).toEqual({ width: size, height: size })
    }
    for (const href of [...html.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]* href="([^"]+)"/g)].map((m) => m[1]!)) {
      expect(served(href), href).toBe(true)
    }
  })

  it('lets search engines in and names the sitemap, which lists the site', () => {
    const robots = readFileSync(join(ROOT, 'public/robots.txt'), 'utf8')
    expect(robots).toMatch(/^User-agent: \*$/m)
    expect(robots).not.toMatch(/^Disallow: \/\s*$/m)
    expect(robots).toContain(`Sitemap: ${SITE}sitemap.xml`)
    expect(readFileSync(join(ROOT, 'public/sitemap.xml'), 'utf8')).toContain(`<loc>${SITE}</loc>`)
  })
})
