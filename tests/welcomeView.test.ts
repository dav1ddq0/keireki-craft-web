// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import WelcomeView from '@/components/documents/WelcomeView.vue'
import { useUiStore } from '@/stores/ui'
import { useCvStore } from '@/stores/cv'
import { templates } from '@/templates/registry'
import { LOCALES } from '@/i18n'

beforeEach(() => setActivePinia(createPinia()))

function setup() {
  const ui = useUiStore()
  const cv = useCvStore()
  const createNew = vi.spyOn(cv, 'createNew').mockResolvedValue()
  const chooseTemplate = vi.spyOn(cv, 'chooseTemplate').mockImplementation(() => {})
  ui.view = 'welcome'
  const wrapper = mount(WelcomeView)
  const button = (name: string) => wrapper.findAll('button').find((b) => b.text() === name)!
  return { ui, wrapper, createNew, chooseTemplate, button }
}

describe('WelcomeView, the home (specs 019, 076)', () => {
  it('says what the product is and counts the real templates and languages', () => {
    const { wrapper } = setup()
    expect(wrapper.find('h1').text()).toBe('Tu CV, en tu navegador. Y en ningún otro sitio.')
    const points = wrapper.find('.points').text()
    expect(points).toContain(`${templates.length} plantillas`)
    expect(points).toContain(`${LOCALES.length} idiomas`)
    expect(wrapper.findAll('h2').map((h) => h.text())).toHaveLength(4)
  })

  it('starts a stored blank CV in the template shown, opens the sample or goes to import', async () => {
    const { ui, createNew, chooseTemplate, button } = setup()

    await button('Crear mi CV').trigger('click')
    await vi.waitFor(() => expect(ui.view).toBe('editor'))
    expect(ui.step).toBe('personal')
    // Stored at once, so a reload opens the editor and not the home again (spec 027).
    expect(createNew).toHaveBeenCalledWith()
    expect(chooseTemplate).toHaveBeenCalledWith('classic')

    await button('Cargar un ejemplo').trigger('click')
    expect(createNew).toHaveBeenCalledWith({ seed: expect.objectContaining({ personal: expect.any(Object) }) })

    await button('Importar mi PDF').trigger('click')
    expect(ui.view).toBe('import')
  })

  it('switches the preview with the chips, and "Create my CV" then starts in that template', async () => {
    const { wrapper, chooseTemplate, button } = setup()
    const chips = wrapper.find('[role="group"]')
    expect(chips.attributes('aria-label')).toBe('Cambiar la plantilla del ejemplo')
    expect(chips.find('[aria-pressed="true"]').text()).toBe('Classic')

    await button('Cobalt').trigger('click')
    expect(chips.find('[aria-pressed="true"]').text()).toBe('Cobalt')
    expect(chips.findAll('[aria-pressed="true"]')).toHaveLength(1)

    await button('Crear mi CV').trigger('click')
    await vi.waitFor(() => expect(chooseTemplate).toHaveBeenCalledWith('cobalt'))
  })

  it('shows four templates, each starting a blank CV in itself', async () => {
    const { ui, wrapper, chooseTemplate } = setup()
    const cards = wrapper.findAll('.template-card')
    expect(cards.map((c) => c.attributes('aria-label'))).toEqual([
      'Usar la plantilla Classic',
      'Usar la plantilla Cobalt',
      'Usar la plantilla Editorial',
      'Usar la plantilla Aurora',
    ])
    await cards[2]!.trigger('click')
    await vi.waitFor(() => expect(ui.view).toBe('editor'))
    expect(chooseTemplate).toHaveBeenCalledWith('editorial')
  })

  it('"See all templates" opens a blank CV on the style step', async () => {
    const { ui, button } = setup()
    await button(`Ver las ${templates.length} plantillas`).trigger('click')
    await vi.waitFor(() => expect(ui.step).toBe('style'))
    expect(ui.view).toBe('editor')
  })
})
