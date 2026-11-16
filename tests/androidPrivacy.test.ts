import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The Android app's privacy policy (spec 092): the user fills in the developer's name, the contact
 * e-mail and the date by hand. Until then this fails, so an unfilled page is not published.
 */
const PAGES = ['public/android/privacidad.html', 'public/android/privacy.html']
const MARKERS = ['[RESPONSABLE]', '[CORREO]', '[FECHA]']

describe('Android privacy policy pages', () => {
  for (const page of PAGES) {
    const html = readFileSync(join(process.cwd(), page), 'utf8')

    it(`${page} has its name, e-mail and date filled in`, () => {
      expect(MARKERS.filter((marker) => html.includes(marker))).toEqual([])
    })

    it(`${page} links to the other language`, () => {
      const other = page.endsWith('privacidad.html') ? '/android/privacy.html' : '/android/privacidad.html'
      expect(html).toContain(`href="${other}"`)
    })
  }
})
