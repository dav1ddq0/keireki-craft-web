import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** Every CSS source a template is drawn from, whatever the data: the templates and the pieces they share. */
function templateSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return templateSources(path)
    return name.endsWith('.vue') ? [path] : []
  })
}

const sources = templateSources('src/templates').map((file) => {
  const text = readFileSync(file, 'utf8')
  return { file, css: text.slice(text.indexOf('<style')) }
})

/**
 * The direct PDF (specs 031, 050, 051) redraws the page from its layout and can paint boxes, borders,
 * rounded corners, outer shadows, images, SVG shapes and text. It cannot paint what is listed here;
 * the `fidelity` block of `qa:e2e` finds them in the sample CV, this finds them in the source, so one
 * written in a rarely shown state cannot slip through.
 */
const UNSUPPORTED: [string, RegExp][] = [
  ['a gradient', /gradient\s*\(/],
  ['a background image', /background(?:-image)?:[^;]*url\(/],
  // Except grayscale() alone, which the direct PDF draws on a photo (spec 081).
  ['a filter', /(?:^|[\s;{])(?:backdrop-filter\s*:|filter\s*:(?!\s*grayscale\([^)]*\)\s*[;}]))/m],
  ['a text shadow', /text-shadow\s*:(?!\s*none)/],
  ['an underline or strike-through', /text-decoration(?:-line)?\s*:\s*(?!none)[^;]*(?:underline|line-through|overline)/],
  ['an outline', /(?:^|[\s;{])outline\s*:\s*(?!none|0\b)/m],
  ['a blend mode', /mix-blend-mode\s*:\s*(?!normal)/],
  ['an inset shadow', /box-shadow\s*:[^;]*\binset\b/],
  // A radius of four different corners: the PDF draws one radius for the box.
  ['corners of different radii', /border-radius\s*:\s*[^;/%]*\d[a-z]*\s+[^;/%]*\d[a-z]*/],
]

describe('what the templates may use, so the PDF download looks like the page (spec 052)', () => {
  for (const [what, pattern] of UNSUPPORTED) {
    it(`uses no ${what}`, () => {
      const found = sources.filter(({ css }) => pattern.test(css)).map(({ file }) => file)
      expect(found).toEqual([])
    })
  }
})
