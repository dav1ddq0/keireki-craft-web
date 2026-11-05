// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import StepStyle from '@/components/form/StepStyle.vue'
import { CV_LANGUAGES, PALETTE } from '@/core/stylePresets'
import { useCvStore } from '@/stores/cv'
import { getTemplate } from '@/templates/registry'

describe('the accent swatches of the style step (spec 052)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const swatches = (templateId: string) => {
    const cv = useCvStore()
    cv.setTemplate(templateId)
    return mount(StepStyle).findAll('.color-row .swatch').map((s) => s.attributes('style') ?? '')
  }

  it('offers the shared palette for a template that has no colours of its own', () => {
    expect(swatches('classic')).toHaveLength(PALETTE.length)
  })

  it("offers a template's own colours when it declares them (Monogram's nine)", () => {
    const own = getTemplate('monogram').palette!
    expect(own).toHaveLength(9)
    const shown = swatches('monogram')
    expect(shown).toHaveLength(9)
    // Each swatch is painted with one of the template's colours, in order.
    own.forEach((color, i) => {
      const rgb = [1, 3, 5].map((k) => parseInt(color.slice(k, k + 2), 16)).join(', ')
      expect(shown[i]).toContain(`rgb(${rgb})`)
    })
  })
})

describe('the CV language select of the style step (spec 070)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('names each language in itself, with its own lang', () => {
    const select = mount(StepStyle)
      .findAll('select')
      .find((candidate) => candidate.findAll('option').some((option) => option.attributes('value') === 'ca-valencia'))!
    expect(select.findAll('option').map((o) => [o.attributes('value'), o.text(), o.attributes('lang')])).toEqual(
      CV_LANGUAGES.map((language) => [language.code, language.label, language.code]),
    )
  })
})
