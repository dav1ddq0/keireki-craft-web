/**
 * The AI assistants offered to improve a text (spec 063). Each one opens with the prompt already
 * in its box (`?q=`), and the prompt is also copied as a fallback. The text of one field therefore
 * travels in the URL to the assistant the user chose, and nothing else.
 */

export interface AiAssistant {
  id: 'claude' | 'chatgpt' | 'gemini'
  name: string
  /** The assistant's page, with no prompt. */
  url: string
  /** The page with the prompt as its `q` parameter. */
  withPrompt: string
}

export const AI_ASSISTANTS: readonly AiAssistant[] = [
  { id: 'claude', name: 'Claude', url: 'https://claude.ai/new', withPrompt: 'https://claude.ai/new?q=' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/', withPrompt: 'https://chatgpt.com/?q=' },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app', withPrompt: 'https://gemini.google.com/app?q=' },
]

/** Longest link we send; a longer prompt opens the plain page and relies on the copied prompt. */
export const MAX_LINK_LENGTH = 6000

/** Where to open the assistant: with the prompt in its box, or plain when the link would be too long. */
export function assistantLink(assistant: AiAssistant, prompt: string): string {
  const link = assistant.withPrompt + encodeURIComponent(prompt)
  return link.length <= MAX_LINK_LENGTH ? link : assistant.url
}
