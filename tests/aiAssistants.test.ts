import { describe, expect, it } from 'vitest'
import { AI_ASSISTANTS } from '@/core/aiAssistants'

describe('AI assistants (spec 063)', () => {
  it('offers Claude, ChatGPT and Gemini', () => {
    expect(AI_ASSISTANTS.map((a) => a.id)).toEqual(['claude', 'chatgpt', 'gemini'])
  })

  it('links to plain https pages with no query string, so no CV text can travel in a URL', () => {
    for (const { url } of AI_ASSISTANTS) {
      const parsed = new URL(url)
      expect(parsed.protocol).toBe('https:')
      expect(parsed.search).toBe('')
      expect(parsed.hash).toBe('')
    }
  })
})
