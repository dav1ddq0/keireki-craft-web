# 063 · Improve a text with AI: Plan

## Approach

Copy, plus open-with-prompt where the assistant supports it: the app builds a prompt (pure
function), copies it, and opens the assistant; only ChatGPT also gets it in `?q=` (the other two
ignore it, checked by hand). The app itself makes no request, so the CSP stays as it is. The UI is one small component reused by the four fields.

## Implementation

1. `src/core/aiPrompt.ts`: `buildImprovePrompt(kind, text, language)`; a template per CV language
   (en, es, fr, it, pt, de) and per kind (`summary`, `experience`, `education`, `custom`). Pure,
   tested. Falls back to English for an unknown language.
2. `src/core/aiAssistants.ts`: the list `{ id, name, url, prefill? }` and `assistantLink`, which adds
   the encoded prompt for assistants with `prefill` (ChatGPT) and falls back to the plain page above
   6000 characters.
3. `src/components/ui/AiImproveButton.vue`: button + menu (a popover on desktop, `BottomSheet` on
   the phone), copy with `navigator.clipboard.writeText`, fallback box with the prompt, notice
   announced in a live region. Props: `text`, `kind`.
4. Use it in `StepSummary.vue`, `StepExperience.vue`, `StepEducation.vue`, `StepCustom.vue` beside
   each textarea (BaseField slot), passing `cv.data.meta.language`-equivalent content language.
5. i18n strings in the six UI languages (`ai.*`: button, reason when empty, copied, paste hint,
   fallback title); the key guard (spec 008) keeps them complete.
6. Tests: prompt (only the field's text, no other data, every language, fallback), button (disabled
   when empty, copies and opens, clipboard failure shows the box). Browser check in `qa/`.
7. Docs: README line (no data leaves the browser); spec verification; roadmap.

## Decisions

- **`?q=` only where it works** (owner's decision after trying it): Claude and Gemini ignored it,
  so sending text in their URL would cost privacy for nothing. ChatGPT fills its box, so it gets
  the prompt in the link too; the copy covers it if that changes.
- **Length cap**: long prompts open the plain page, so a link never grows past what browsers and
  servers accept.
- **Prompt in the CV's language**: the user's text is in that language, and the answer should be.
- **Per-field, not whole CV**: less personal data in the prompt and better results.

## Risks

- **Provider URLs or `?q=` change, or Gemini ignores `q`**: keep them in one list; none of the three is verified for prefill yet, check each in
  the browser during task 7.
- **Clipboard blocked** (permissions, insecure context): fallback box.
- **The model invents achievements**: the prompt forbids it explicitly; the user reviews what they
  paste back. State it in the notice.
- **New outward links**: `rel="noopener noreferrer"`; the CSP does not apply to navigation.
