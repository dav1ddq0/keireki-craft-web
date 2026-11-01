/**
 * The AI assistants offered to improve a text (spec 063). Every prompt is copied to the clipboard.
 * Only ChatGPT fills its box from the link (`?q=`, checked by hand); Claude and Gemini open their
 * plain page and the user pastes. So only for ChatGPT does the text of one field travel in a URL.
 */

export interface AiAssistant {
  id: 'claude' | 'chatgpt' | 'gemini'
  name: string
  /** The assistant's page, with no prompt. */
  url: string
  /** Set when the assistant fills its box from this link followed by the encoded prompt. */
  prefill?: string
}

export const AI_ASSISTANTS: readonly AiAssistant[] = [
  { id: 'claude', name: 'Claude', url: 'https://claude.ai/new' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/', prefill: 'https://chatgpt.com/?q=' },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app' },
]

/** Longest link we send; a longer prompt opens the plain page and relies on the copied prompt. */
export const MAX_LINK_LENGTH = 6000

/** Where to open the assistant: with the prompt in its box if it supports that, else its plain page. */
export function assistantLink(assistant: AiAssistant, prompt: string): string {
  if (!assistant.prefill) return assistant.url
  const link = assistant.prefill + encodeURIComponent(prompt)
  return link.length <= MAX_LINK_LENGTH ? link : assistant.url
}
