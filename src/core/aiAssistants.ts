/**
 * The AI assistants offered to improve a text (spec 063). Home pages only, with no query string: the
 * app copies the prompt and the user pastes it, so nothing about the CV travels in a URL.
 */

export interface AiAssistant {
  id: 'claude' | 'chatgpt' | 'gemini'
  name: string
  url: string
}

export const AI_ASSISTANTS: readonly AiAssistant[] = [
  { id: 'claude', name: 'Claude', url: 'https://claude.ai/new' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/' },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app' },
]
