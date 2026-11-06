# 074 · Long words stay in their column, in every template

**Status:** proposed

## What it does

A word longer than the column it is in (a German compound, an identifier, a run of characters with no
space) breaks inside that column, in every template, in the preview, the print and the direct PDF.
Today it runs past the column's edge: over the next column, past a coloured band (where white text
vanishes) or off the page. Spec 072 fixed this for Amber's side column only.

A probe that puts one long word in each field, one template at a time, finds (print path; a word
of real letters, wider than a run of one letter, so the 39-character row is the German word itself):

| Word length | Templates | What leaves its column |
|---|---|---|
| 39 characters (a real German compound) | facet, harbor, meridian, monogram | skill and language names in the side column |
| | aurora, meridian, modern | the full name (one word), which also widens the main column |
| | monograph | the full name |
| 64 characters | banner, chevron, cobalt, facet, frame, harbor, meridian, monogram | skill and language names in the side column; in banner and chevron also the summary there |
| | cobalt | also position, company, highlights and degree in the main column |
| | all but cobalt and monogram | the full name; in amber, aurora, compact, ledger, meridian and modern it widens its column too |

## Why

The text the user wrote is lost in the file they send: covered, invisible on the band, or cut at the
page edge. A long compound is ordinary in German, Dutch, Finnish or Basque, and the app ships the
interface and the CV in German and Basque.

## Acceptance criteria

- [ ] With a 39-character word in every field, nothing leaves its column in any of the 16 templates
      (print and direct PDF).
- [ ] With a 64-character word in every field, the same.
- [ ] A long word breaks only when it does not fit: names of skills and languages, titles and the
      full name are not cut into a few letters when a whole word would fit on its own line.
- [ ] No column widens to hold a long word: the side and main columns keep their width.
- [ ] Every template's ordinary sample CV looks the same as before (`qa:pdf` differences unchanged).
- [ ] `qa:pdf` gains a long-word case that runs the probe above in every template, so it cannot come
      back.
- [ ] `npm test`, `npm run build`, `qa:pdf`, `qa:consistency` pass.

## Out of scope

- Hyphenation (inserting "-" where the word breaks): `hyphens: auto` depends on the browser's
  dictionaries for each language and differs between the print and the direct PDF.
- E-mails and URLs, which already break at "@" and dots (spec 033).
