import { describe, expect, it } from 'vitest'
import { AI_ASSISTANTS, MAX_LINK_LENGTH, assistantLink } from '@/core/aiAssistants'

const by = (id: string) => AI_ASSISTANTS.find((a) => a.id === id)!

describe('AI assistants (spec 063)', () => {
  it('offers Claude, ChatGPT and Gemini', () => {
    expect(AI_ASSISTANTS.map((a) => a.id)).toEqual(['claude', 'chatgpt', 'gemini'])
  })

  it('has a plain https page for each, with no query string', () => {
    for (const { url } of AI_ASSISTANTS) {
      const parsed = new URL(url)
      expect(parsed.protocol).toBe('https:')
      expect(parsed.search).toBe('')
    }
  })

  it('opens each one with the prompt as `q`, encoded, on one line', () => {
    const prompt = 'Mejora: "esto" & aquello\n\nTexto:\nñandú\n- uno\n- dos'
    for (const assistant of AI_ASSISTANTS) {
      const url = new URL(assistantLink(assistant, prompt, 'es'))
      expect(url.origin + url.pathname).toBe(new URL(assistant.url).origin + new URL(assistant.url).pathname)
      expect(url.searchParams.get('q')).toBe('Mejora: "esto" & aquello Texto: ñandú - uno - dos')
      expect(url.href).not.toContain('%0A')
    }
  })

  it('tells Gemini the interface language, as the Europa Press menu does', () => {
    expect(new URL(assistantLink(by('gemini'), 'x', 'fr')).searchParams.get('hl')).toBe('fr')
    expect(new URL(assistantLink(by('claude'), 'x', 'fr')).searchParams.has('hl')).toBe(false)
  })

  it('opens the plain page, with no text in the link, when the prompt would make it too long', () => {
    for (const assistant of AI_ASSISTANTS) expect(assistantLink(assistant, 'x'.repeat(MAX_LINK_LENGTH))).toBe(assistant.url)
  })
})
