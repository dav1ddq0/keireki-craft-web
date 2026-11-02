// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/export/render', () => ({
  resolvePhoto: async (data: unknown) => ({ data, revoke: () => {} }),
  renderTemplateHtml: async () => '<section>CV</section>',
  collectDocumentCss: () => '',
}))
vi.mock('@/services/export/fonts', () => ({ embeddedFontCss: async () => '' }))

import { buildStandaloneHtml, EXPORTED_HTML_CSP } from '@/services/export/html'
import { createEmptyCV } from '@/core/factory'

describe('Exported HTML (spec 069)', () => {
  it('carries its own CSP, first in <head>, before anything it could apply to', async () => {
    const html = await buildStandaloneHtml(createEmptyCV(), 'classic')
    const head = html.slice(html.indexOf('<head>'), html.indexOf('<style>'))
    expect(head).toContain(`<meta http-equiv="Content-Security-Policy" content="${EXPORTED_HTML_CSP}">`)
  })

  it('lets nothing run, be framed, be submitted or be fetched', () => {
    const rules = Object.fromEntries(EXPORTED_HTML_CSP.split('; ').map((r) => [r.split(' ')[0], r.split(' ').slice(1).join(' ')]))
    expect(rules['default-src']).toBe("'none'")
    expect(rules['script-src']).toBeUndefined()
    expect(rules['form-action']).toBe("'none'")
    expect(rules['base-uri']).toBe("'none'")
    expect(EXPORTED_HTML_CSP).not.toMatch(/https?:|\*|'unsafe-eval'/)
  })
})
