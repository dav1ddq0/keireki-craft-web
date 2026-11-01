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

  it('puts the prompt in the link only for ChatGPT, the one that fills its box from it', () => {
    expect(AI_ASSISTANTS.filter((a) => a.prefill).map((a) => a.id)).toEqual(['chatgpt'])
    const prompt = 'Mejora: "esto" & aquello\n\nTexto:\nñandú'
    const url = new URL(assistantLink(by('chatgpt'), prompt))
    expect(url.origin + url.pathname).toBe('https://chatgpt.com/')
    expect([...url.searchParams.keys()]).toEqual(['q'])
    expect(url.searchParams.get('q')).toBe(prompt)
  })

  it('opens Claude and Gemini on their plain page, with no text in the link', () => {
    for (const id of ['claude', 'gemini']) expect(assistantLink(by(id), 'secreto')).toBe(by(id).url)
  })

  it('opens ChatGPT plain when the prompt would make the link too long', () => {
    expect(assistantLink(by('chatgpt'), 'x'.repeat(MAX_LINK_LENGTH))).toBe(by('chatgpt').url)
  })
})
