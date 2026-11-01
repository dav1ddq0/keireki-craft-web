# 063 · Improve a text with AI: Plan

## Approach

Copy-and-open, as in the options considered: the app builds a prompt (pure function), copies it,
and opens the assistant's home page. No network access from the app, so the local-first promise and
the CSP stay as they are. The UI is one small component reused by the four fields.

## Implementation

1. `src/core/aiPrompt.ts`: `buildImprovePrompt(kind, text, language)`; a template per CV language
   (en, es, fr, it, pt, de) and per kind (`summary`, `experience`, `education`, `custom`). Pure,
   tested. Falls back to English for an unknown language.
2. `src/core/aiAssistants.ts`: the list `{ id, name, url }` (home pages, no query string).
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

- **Copy, do not send**: a `?q=` link would be one click shorter but puts the CV text in the URL
  (history, logs) and breaks when a provider changes the parameter. Rejected.
- **Home pages only**: no provider-specific parameters to maintain.
- **Prompt in the CV's language**: the user's text is in that language, and the answer should be.
- **Per-field, not whole CV**: less personal data in the prompt and better results.

## Risks

- **Provider URLs change or redirect**: keep them in one list; none of the three is verified yet, check each in
  the browser during task 7.
- **Clipboard blocked** (permissions, insecure context): fallback box.
- **The model invents achievements**: the prompt forbids it explicitly; the user reviews what they
  paste back. State it in the notice.
- **New outward links**: `rel="noopener noreferrer"`; the CSP does not apply to navigation.
