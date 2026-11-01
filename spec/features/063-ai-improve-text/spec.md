# 063 · Improve a text with AI

**Status:** implemented ✅ (the assistants' prefill still to be checked by hand, see Verification)

## What it does

Next to the free-text fields of the CV (professional summary, and the description of each
experience, education and custom-section entry) there is an icon-only "AI" button, like the Copy one: the text "Improve with AI" shows as a tooltip on hover. It opens a small menu with
three assistants (Claude, ChatGPT, Gemini). Choosing one:

1. opens the assistant in a new tab with a ready prompt already in its box (`?q=`), asking to
   improve the wording of **that field's text only**, keeping the facts, and
2. also copies the prompt to the clipboard, in case the assistant ignores the link's prompt, with a
   short notice: "Opened with the prompt. It is also copied: paste it if it does not show."

The user pastes the improved text back by hand. The prompt is written in the **CV's content
language** (not the interface's), so the answer comes back in the language of the CV.

## Why

Many people know what they did but not how to word it. The assistants do this well, but the user
has to know what to ask for. A tested prompt one click away makes the result better and more
consistent. Decision of the owner (changed from the first draft): the prompt travels in the link so
the user does not have to paste. The cost is that **the text of that one field is sent, in the URL,
to the assistant the user chose**, only on the user's click. The app itself makes no request and
needs no CSP change.

## Acceptance criteria

- [x] The button appears on: summary, experience description, education description, custom entry
      description. Not on names, contacts or dates.
- [x] The button is disabled, with a stated reason, while the field is empty.
- [x] The menu lists three assistants (Claude, ChatGPT, Gemini). Choosing one opens it in a new tab
      (`noopener`, `noreferrer`) with the prompt as its `q` parameter, and copies the prompt too;
      the notice says so.
- [x] A prompt that would make the link longer than 6000 characters opens the plain page (no text
      in the link) and relies on the copied prompt.
- [x] The only text that leaves is the prompt, and only when the user chooses an assistant. The prompt contains only the text of that field (and its kind: summary / experience…), never
      name, e-mail, phone, address or other fields.
- [x] The prompt asks to keep every fact, not to invent figures, dates, employers or technologies,
      to keep the format (paragraph or list) and to answer in the CV's language.
- [x] The prompt exists in the six CV languages (en, es, fr, it, pt, de) and follows the CV's
      language, not the interface's.
- [x] If the clipboard is not available, the prompt is shown in a selectable box with an "Open"
      button (which still opens the assistant with the prompt), so the feature never fails silently.
- [x] No network request is made by the app (the assistant opens in a new tab): `qa:security` passes without a new exception.
- [x] Keyboard and screen reader: the button has a name, the menu follows the menu pattern, the
      copy notice is announced. On the phone the menu is a bottom sheet.
- [x] No change to `types/cv.ts`, so no migration.

## Out of scope

- Pasting the answer back with one click or replacing the field (later: needs undo-aware UX).
- Any API call from the app, API keys, or sending text without the user choosing an assistant.
- Calling a model from the app, or on-device models.
- Improving the whole CV at once, or reviewing it against a job offer.
- Tone selection.

## Verification

`tests/aiPrompt.test.ts` (the prompt in six languages, only the field's text), `aiAssistants.test.ts`
(links, length cap), `aiImproveButton.test.ts` (copy, link, fallback, keyboard, disabled reason, icon
button) and the `ai` block of `qa/e2e` (Chromium, desktop and phone: the clipboard holds the CV prompt,
the new tab is `claude.ai/new` with the same prompt as its only `q`). `npm test` 849, `qa:e2e`
141/141, `qa:security` 55/55 with no new exception, `qa:consistency` 13/13, typecheck and build clean.

**Not verified:** that Claude, ChatGPT and Gemini actually fill their box from `?q=` (it needs each
site with a signed-in session; Gemini is the doubtful one). The copied prompt is the fallback if one
does not. To be checked by hand and, if one fails, switched to copy-only for that assistant.
