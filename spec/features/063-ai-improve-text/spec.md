# 063 · Improve a text with AI

**Status:** proposed

## What it does

Next to the free-text fields of the CV (professional summary, and the description of each
experience, education and custom-section entry) there is an "AI" button. It opens a small menu with
three assistants (Claude, ChatGPT, Gemini). Choosing one:

1. copies to the clipboard a ready prompt that asks to improve the wording of **that field's text
   only**, keeping the facts, and
2. opens the assistant in a new tab, with a short notice: "Prompt copied. Paste it there."

The user pastes the improved text back by hand. The prompt is written in the **CV's content
language** (not the interface's), so the answer comes back in the language of the CV.

## Why

Many people know what they did but not how to word it. The assistants do this well, but the user
has to know what to ask for. A tested prompt one click away makes the result better and more
consistent, and it keeps the app's promise: **nothing leaves the browser until the user pastes it
somewhere themselves**. No request is made, no CSP change, no text in a URL (history, logs).

## Acceptance criteria

- [ ] The button appears on: summary, experience description, education description, custom entry
      description. Not on names, contacts or dates.
- [ ] The button is disabled, with a stated reason, while the field is empty.
- [ ] The menu lists three assistants (Claude, ChatGPT, Gemini). Choosing one copies the prompt and opens the assistant in a
      new tab (`noopener`, `noreferrer`); the notice confirms the copy.
- [ ] The prompt contains only the text of that field (and its kind: summary / experience…), never
      name, e-mail, phone, address or other fields.
- [ ] The prompt asks to keep every fact, not to invent figures, dates, employers or technologies,
      to keep the format (paragraph or list) and to answer in the CV's language.
- [ ] The prompt exists in the six CV languages (en, es, fr, it, pt, de) and follows the CV's
      language, not the interface's.
- [ ] If the clipboard is not available, the prompt is shown in a selectable box instead, so the
      feature never fails silently.
- [ ] No network request is made by the app: `qa:security` passes without a new exception.
- [ ] Keyboard and screen reader: the button has a name, the menu follows the menu pattern, the
      copy notice is announced. On the phone the menu is a bottom sheet.
- [ ] No change to `types/cv.ts`, so no migration.

## Out of scope

- Pasting the answer back with one click or replacing the field (later: needs undo-aware UX).
- Sending text through a URL parameter (`?q=`) or any API: it would move personal data out of the
  browser without the user's hand in it.
- Calling a model from the app, API keys, or on-device models.
- Improving the whole CV at once, or reviewing it against a job offer.
- Tone selection.
