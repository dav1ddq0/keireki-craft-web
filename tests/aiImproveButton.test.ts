// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AiImproveButton from '@/components/ui/AiImproveButton.vue'
import { useCvStore } from '@/stores/cv'

const TEXT = 'Lideré un equipo de cuatro personas en el rediseño de la plataforma de pagos.'

let copied: string[]
let opened: Array<[string?, string?, string?]>

function stubBrowser(clipboardWorks = true) {
  copied = []
  opened = []
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: vi.fn(async (text: string) => {
        if (!clipboardWorks) throw new Error('denied')
        copied.push(text)
      }),
    },
  })
  vi.stubGlobal('open', (...args: [string?, string?, string?]) => {
    opened.push(args)
    return null
  })
}

const mountButton = (text = TEXT, kind: 'experience' | 'summary' = 'experience') =>
  mount(AiImproveButton, { props: { text, kind }, attachTo: document.body })

beforeEach(() => {
  setActivePinia(createPinia())
  document.body.innerHTML = ''
  stubBrowser()
})

describe('AiImproveButton (spec 063)', () => {
  it('copies a CV-improvement prompt with this field only and opens Claude with that same prompt', async () => {
    useCvStore().data.meta.language = 'es'
    const wrapper = mountButton()
    await wrapper.get('.trigger').trigger('click')
    const claude = wrapper.findAll('[role="menuitem"]')[0]!
    await claude.trigger('click')
    await flushPromises()

    expect(copied).toHaveLength(1)
    expect(copied[0]).toContain('Mejora la redacción de la descripción de un puesto de mi CV')
    expect(copied[0]!.endsWith(`Texto:\n${TEXT}`)).toBe(true)
    expect(copied[0]).not.toMatch(/Europa ?Press|noticia|europapress/i)

    const oneLine = copied[0]!.replace(/\s*\n+\s*/g, ' ')
    expect(opened).toEqual([[`https://claude.ai/new?q=${encodeURIComponent(oneLine)}`, '_blank', 'noopener']])
    expect(wrapper.get('[role="status"]').text()).toBe('Claude abierto con el prompt. También está copiado: pégalo si no aparece.')
  })

  it('writes the prompt in the CV language, not the interface language', async () => {
    useCvStore().data.meta.language = 'de'
    const wrapper = mountButton()
    await wrapper.get('.trigger').trigger('click')
    await wrapper.findAll('[role="menuitem"]')[1]!.trigger('click')
    await flushPromises()
    expect(copied[0]).toContain('Antworte auf Deutsch')
    expect(opened[0]![0]).toBe(`https://chatgpt.com/?q=${encodeURIComponent(copied[0]!.replace(/\s*\n+\s*/g, ' '))}`)
    expect(wrapper.get('[role="status"]').text()).toBe('ChatGPT abierto con el prompt. También está copiado: pégalo si no aparece.')
  })

  it('is an icon-only button named by its label, with the same text as a tooltip', () => {
    const trigger = mountButton().get('.trigger')
    expect(trigger.text()).toBe('')
    expect(trigger.attributes('aria-label')).toBe('Mejorar con IA')
    expect(trigger.attributes('title')).toBe('Mejorar con IA')
  })

  it('is disabled with a stated reason while the field is empty', () => {
    const wrapper = mountButton('   ')
    const trigger = wrapper.get('.trigger')
    expect(trigger.attributes('disabled')).toBeDefined()
    expect(trigger.attributes('title')).toBe('Escribe un texto para poder mejorarlo con IA')
    expect(wrapper.get(`#${trigger.attributes('aria-describedby')}`).text()).toBe('Escribe un texto para poder mejorarlo con IA')
  })

  it('shows the prompt to copy by hand when the clipboard fails (the tab is already open)', async () => {
    stubBrowser(false)
    const wrapper = mountButton()
    await wrapper.get('.trigger').trigger('click')
    await wrapper.findAll('[role="menuitem"]')[2]!.trigger('click')
    await flushPromises()
    expect(opened).toHaveLength(1)
    const box = wrapper.get('.manual textarea').element as HTMLTextAreaElement
    expect(box.value).toContain(TEXT)
    await wrapper.get('.item--primary').trigger('click')
    expect(opened).toHaveLength(2)
    expect(opened[0]![0]).toMatch(/^https:\/\/gemini\.google\.com\/app\?hl=es&q=/)
  })

  it('moves between the options with the arrows and closes with Escape', async () => {
    const wrapper = mountButton()
    await wrapper.get('.trigger').trigger('click')
    await flushPromises()
    const items = wrapper.findAll('[role="menuitem"]')
    expect(document.activeElement).toBe(items[0]!.element)
    await wrapper.get('.body').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1]!.element)
    await wrapper.get('.body').trigger('keydown', { key: 'Escape' })
    expect(wrapper.get('.popup').attributes('hidden')).toBeDefined()
    expect(document.activeElement).toBe(wrapper.get('.trigger').element)
  })
})
