// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { exportCss, withoutPrintMedia } from '@/services/export/pdf'

/** paged.js applies the rules of every print-only @media to the whole page (spec 055). */
describe('withoutPrintMedia', () => {
  it('drops print-only blocks and keeps the rest', () => {
    const css = '.a{color:red}@media print{html,body{background:#fff}a{color:inherit}}.b{color:blue}'
    expect(withoutPrintMedia(css)).toBe('.a{color:red}.b{color:blue}')
  })

  it('drops `only print` and `print and (…)`, any case of spacing', () => {
    expect(withoutPrintMedia('@media only print { .x { top: 0 } }.y{}')).toBe('.y{}')
    expect(withoutPrintMedia('@media print and (orientation: portrait){.x{top:0}}.y{}')).toBe('.y{}')
    expect(withoutPrintMedia('@media print, only print {.x{}}.y{}')).toBe('.y{}')
  })

  it('keeps blocks that also apply on screen', () => {
    for (const css of ['@media screen, print{.x{top:0}}', '@media not print{.x{top:0}}', '@media screen{.x{top:0}}', '@media (min-width: 600px){.x{top:0}}']) {
      expect(withoutPrintMedia(css)).toBe(css)
    }
  })

  it('drops a print block nested in another, and the nested blocks of a print block', () => {
    expect(withoutPrintMedia('@media (min-width:1px){.a{}@media print{.b{}}.c{}}')).toBe('@media (min-width:1px){.a{}.c{}}')
    expect(withoutPrintMedia('@media print{@supports (display:grid){.a{}}.b{}}.c{}')).toBe('.c{}')
  })

  it('is not fooled by braces or "@media print" inside strings and comments', () => {
    expect(withoutPrintMedia('.a::before{content:"}@media print{"}@media print{.b{content:"{"}}.c{}')).toBe('.a::before{content:"}@media print{"}.c{}')
    expect(withoutPrintMedia('/* @media print { */.a{}/* } */')).toBe('.a{}')
  })

  it('takes the document print rules out of what paged.js gets from print.css', () => {
    const print = withoutPrintMedia(readFileSync('src/styles/print.css', 'utf8'))
    expect(print).not.toMatch(/@media\s+print/)
    expect(print).not.toMatch(/html,\s*body/)
    // The rules of the page itself stay.
    expect(print).toMatch(/@page\s*\{/)
    expect(print).toMatch(/break-inside:\s*avoid/)
    expect(exportCss().print).not.toMatch(/@media\s+print/)
  })
})
