import { describe, expect, it } from 'vitest'
import { PALETTE, isSameColor } from '@/core/stylePresets'

describe('palette', () => {
  it('offers five distinct, valid hex colours', () => {
    expect(PALETTE).toHaveLength(5)
    expect(new Set(PALETTE).size).toBe(5)
    for (const color of PALETTE) expect(color).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('compares colours ignoring case and spaces', () => {
    expect(isSameColor('#FFD86F', '#ffd86f')).toBe(true)
    expect(isSameColor(' #ffd86f ', '#ffd86f')).toBe(true)
    expect(isSameColor('#ffd86e', '#ffd86f')).toBe(false)
  })
})

describe('font options', () => {
  it('has unique ids and values, each ending in a generic family', async () => {
    const { FONT_OPTIONS } = await import('@/core/stylePresets')
    expect(new Set(FONT_OPTIONS.map((f) => f.id)).size).toBe(FONT_OPTIONS.length)
    expect(new Set(FONT_OPTIONS.map((f) => f.value)).size).toBe(FONT_OPTIONS.length)
    for (const font of FONT_OPTIONS) expect(font.value).toMatch(/(sans-serif|serif|monospace)$/)
  })

  it('lists every template default and the global default, so the select is never blank', async () => {
    const { FONT_OPTIONS } = await import('@/core/stylePresets')
    const { templates } = await import('@/templates/registry')
    const { DEFAULT_STYLE } = await import('@/core/factory')
    const values = FONT_OPTIONS.map((f) => f.value)
    expect(values).toContain(DEFAULT_STYLE.fontFamily)
    for (const template of templates) {
      if (template.defaults) expect(values).toContain(template.defaults.fontFamily)
    }
  })
})

describe('CV languages', () => {
  it('only offers languages every template table covers', async () => {
    const { CV_LANGUAGES } = await import('@/core/stylePresets')
    const { formatPartialDate, levelAccessibleLabel, resolveSections } = await import('@/templates/shared')
    const { createSampleCV } = await import('@/core/sample')

    for (const { code } of CV_LANGUAGES) {
      // A language missing from a table silently falls back to Spanish, so compare
      // against the Spanish output: a covered language must produce its own text. Not the months:
      // Portuguese "abr 2023" is Spanish too (cvLanguages.test.ts checks every table's keys instead).
      if (code !== 'es') {
        expect(formatPartialDate('2023-04', code)).toMatch(/2023$/)
        expect(levelAccessibleLabel(3, code)).not.toBe(levelAccessibleLabel(3, 'es'))
        const cv = createSampleCV()
        cv.meta.language = code
        const titles = resolveSections(cv).map((s) => s.title)
        const spanish = resolveSections({ ...cv, meta: { ...cv.meta, language: 'es' } }).map((s) => s.title)
        expect(titles).not.toEqual(spanish)
      }
    }
  })
})

describe('readable ink on accent', () => {
  it('picks near-black on light accents and white on dark ones', async () => {
    const { onAccent } = await import('@/templates/shared')
    expect(onAccent('#ffd86f')).toBe('#1a1a1a')
    expect(onAccent('#10cf65')).toBe('#1a1a1a')
    expect(onAccent('#f2614c')).toBe('#1a1a1a')
    expect(onAccent('#7c55e4')).toBe('#ffffff')
    expect(onAccent('#334fdc')).toBe('#ffffff')
  })

  it('gives every palette colour at least 4.5:1 for its ink', async () => {
    const { onAccent, contrastRatio } = await import('@/templates/shared')
    const { templates } = await import('@/templates/registry')
    for (const color of [...PALETTE, ...templates.flatMap((t) => t.palette ?? [])]) {
      expect(contrastRatio(color, onAccent(color))!, color).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('also holds for every template default accent', async () => {
    const { onAccent, contrastRatio } = await import('@/templates/shared')
    const { templates } = await import('@/templates/registry')
    for (const template of templates) {
      const accent = template.defaults!.accentColor
      expect(contrastRatio(accent, onAccent(accent))!).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('falls back to white for input it cannot parse, and exposes the variable', async () => {
    const { onAccent, styleVars } = await import('@/templates/shared')
    const { createEmptyCV } = await import('@/core/factory')
    expect(onAccent('red')).toBe('#ffffff')
    expect(onAccent('')).toBe('#ffffff')
    expect(styleVars(createEmptyCV().style)['--cv-on-accent']).toMatch(/^#/)
  })
})

describe('accent for text on light surfaces', () => {
  it('leaves an accent that already reads well untouched', async () => {
    const { accentText } = await import('@/templates/shared')
    expect(accentText('#1f3a63')).toBe('#1f3a63')
    expect(accentText('#334fdc')).toBe('#334fdc')
  })

  it('darkens light accents until they reach 4.5:1 on white, keeping the hue', async () => {
    const { accentText, contrastRatio } = await import('@/templates/shared')
    for (const color of ['#ffd86f', '#10cf65', '#f2614c']) {
      const text = accentText(color)
      expect(text).not.toBe(color)
      expect(contrastRatio(text, '#ffffff')!).toBeGreaterThanOrEqual(4.5)
    }
    // Same hue: the channel that dominated still dominates after darkening.
    const yellow = accentText('#ffd86f')
    expect(parseInt(yellow.slice(1, 3), 16)).toBeGreaterThan(parseInt(yellow.slice(5, 7), 16))
  })

  it('holds for every palette colour and every template default', async () => {
    const { accentText, contrastRatio } = await import('@/templates/shared')
    const { templates } = await import('@/templates/registry')
    const accents = [...PALETTE, ...templates.flatMap((t) => t.palette ?? []), ...templates.map((t) => t.defaults!.accentColor)]
    for (const accent of accents) {
      expect(contrastRatio(accentText(accent), '#ffffff')!).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('returns input it cannot parse unchanged, and exposes the variable', async () => {
    const { accentText, styleVars } = await import('@/templates/shared')
    const { createEmptyCV } = await import('@/core/factory')
    expect(accentText('red')).toBe('red')
    expect(styleVars(createEmptyCV().style)['--cv-accent-text']).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('i18n keys built from ids', () => {
  it('has a description for every font option in both languages', async () => {
    const { FONT_OPTIONS } = await import('@/core/stylePresets')
    const es = (await import('@/i18n/es')).default
    const en = (await import('@/i18n/en')).default

    for (const [name, dictionary] of [['es', es], ['en', en]] as const) {
      const fonts = dictionary.style.fonts as Record<string, string>
      for (const font of FONT_OPTIONS) {
        expect(fonts[font.id], `${name}.style.fonts.${font.id}`).toBeTruthy()
      }
      // And nothing is described that no longer exists.
      expect(Object.keys(fonts).sort()).toEqual(FONT_OPTIONS.map((f) => f.id).sort())
    }
  })
})

describe('palette names', () => {
  it('names every palette colour in both languages, since swatches are announced by name', async () => {
    const es = (await import('@/i18n/es')).default
    const en = (await import('@/i18n/en')).default
    for (const [name, dictionary] of [['es', es], ['en', en]] as const) {
      const names = dictionary.style.colorNames as Record<string, string>
      const { templates } = await import('@/templates/registry')
      const colors = [...new Set([...PALETTE, ...templates.flatMap((t) => t.palette ?? [])])]
      for (const color of colors) expect(names[color.slice(1)], `${name}.style.colorNames.${color.slice(1)}`).toBeTruthy()
      expect(Object.keys(names).sort()).toEqual(colors.map((c) => c.slice(1)).sort())
    }
  })
})
