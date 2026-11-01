/**
 * The AI assistants offered to improve a text (spec 063). Every prompt is copied to the clipboard and
 * every assistant is opened with the prompt in its box (`?q=`), as the Europa Press AI menu does.
 * The link carries the prompt on ONE line: line breaks are folded to spaces, the copied one keeps them.
 */

export interface AiAssistant {
  id: 'claude' | 'chatgpt' | 'gemini'
  name: string
  /** The assistant's page, with no prompt. */
  url: string
  /** The link up to the prompt, which is appended encoded. `{lang}` is the interface language. */
  prefill: string
}

export const AI_ASSISTANTS: readonly AiAssistant[] = [
  { id: 'claude', name: 'Claude', url: 'https://claude.ai/new', prefill: 'https://claude.ai/new?q=' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/', prefill: 'https://chatgpt.com/?q=' },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app', prefill: 'https://gemini.google.com/app?hl={lang}&q=' },
]

/** Longest link we send; a longer prompt opens the plain page and relies on the copied prompt. */
export const MAX_LINK_LENGTH = 6000

/** Where to open the assistant: with the prompt in its box, or its plain page when the link would be too long. */
export function assistantLink(assistant: AiAssistant, prompt: string, lang = 'es'): string {
  const oneLine = prompt.replace(/\s*\n+\s*/g, ' ').trim()
  const link = assistant.prefill.replace('{lang}', lang) + encodeURIComponent(oneLine)
  return link.length <= MAX_LINK_LENGTH ? link : assistant.url
}
