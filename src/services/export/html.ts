import type { CVData } from '@/types/cv'
import printCss from '@/styles/print.css?raw'
import { collectDocumentCss, renderTemplateHtml, resolvePhoto } from './render'
import { downloadBlob, slugify } from './download'
import { embeddedFontCss } from './fonts'
import { fontStackWithStandIns } from '@/core/fontStandIns'

/**
 * The exported file's own Content-Security-Policy (spec 069). The file has no script and loads
 * nothing remote (checked by `qa:security`); this is the second barrier, should a template ever let
 * markup through: nothing may run, be framed, be submitted or be fetched; the styles and the
 * `data:` photo and fonts it carries are all it may use.
 */
export const EXPORTED_HTML_CSP = [
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  'img-src data:',
  'font-src data:',
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

/**
 * A single `.html` file with the CSS and the CV's font embedded, no external references.
 *
 * The app's own stylesheet is inlined wholesale rather than filtered down to the
 * template's rules: filtering means parsing selectors and guessing, and the
 * exported markup contains no application chrome for the extra rules to touch.
 */
export async function buildStandaloneHtml(data: CVData, templateId: string): Promise<string> {
  const { data: rendered, revoke } = await resolvePhoto(data, 'dataUrl')
  try {
    const body = await renderTemplateHtml(rendered, templateId)
    // The app's @font-face URLs mean nothing in a file opened from disk: the CV's own font is inlined.
    const fonts = await embeddedFontCss(fontStackWithStandIns(data.style.fontFamily))
    const css = `${fonts}\n${collectDocumentCss({ fontFaces: false })}\n${printCss}`
    const title = escapeHtml(data.personal.fullName || data.meta.title)

    return `<!doctype html>
<html lang="${escapeHtml(data.meta.language || 'es')}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${EXPORTED_HTML_CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
${css}
body { margin: 0; background: #f3f4f6; display: flex; justify-content: center; }
.cv-page { margin: 0 auto; box-shadow: 0 1px 12px rgba(0,0,0,.12); }
@media print { body { background: #fff; display: block; } }
</style>
</head>
<body>
<div class="cv-page">${body}</div>
</body>
</html>`
  } finally {
    revoke()
  }
}

export async function exportHtml(data: CVData, templateId: string): Promise<void> {
  const html = await buildStandaloneHtml(data, templateId)
  const name = slugify(data.personal.fullName || data.meta.title)
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${name}.html`)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
