import { describe, expect, it } from 'vitest'
import { AI_ASSISTANTS, MAX_LINK_LENGTH, assistantLink } from '@/core/aiAssistants'

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

  it('opens each one with the prompt as the only parameter, encoded', () => {
    const prompt = 'Mejora: "esto" & aquello\n\nTexto:\nñandú'
    for (const assistant of AI_ASSISTANTS) {
      const url = new URL(assistantLink(assistant, prompt))
      expect([...url.searchParams.keys()]).toEqual(['q'])
      expect(url.searchParams.get('q')).toBe(prompt)
      expect(url.origin + url.pathname).toBe(new URL(assistant.url).origin + new URL(assistant.url).pathname)
    }
  })

  it('opens the plain page, with no text in the link, when the prompt would make it too long', () => {
    const long = 'x'.repeat(MAX_LINK_LENGTH)
    for (const assistant of AI_ASSISTANTS) expect(assistantLink(assistant, long)).toBe(assistant.url)
  })
})
