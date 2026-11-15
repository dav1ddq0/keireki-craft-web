# 089 · My CVs marks what the search matched

**Status:** done

## What it does

On wide screens, the search in My CVs (spec 018) marks the letters that match in each card it keeps:
typing "na" marks the "Na" of "Nadia Martín Reyes", the "Na" of "Carlos Navarro" and the "na" of
"Fernández". The mark is a soft fill in the theme's primary container colour (option A of the design
canvas, chosen by the user).

## Why

Asked for by the user. Today the search filters the cards but does not say why a card stayed, which
is unclear when the query is short or matches the CV's title instead of the name.

## Acceptance criteria

- [x] Every occurrence of the query is marked, in the card's name line and in its title line; nothing
      is marked with the search empty.
- [x] Case and accents are ignored as the filter already does: "martin" marks "Martín" and
      "Martínez" as they are written, with their accent.
- [x] The search still looks at the name and the CV's title only (the template, the date and the
      buttons are not searched and not marked).
- [x] Each field is searched on its own: a card stays only if the query is in its name or in its
      title, so a card that stays always shows a mark. (Today "reyes desa", which runs from the name
      into the title, keeps the card with nothing to mark.)
- [x] The card does not change size or move: same font weight, no padding added by the mark.
- [x] Light and dark theme: the marked text keeps at least 4.5:1 contrast over its fill. In Windows
      high contrast (`forced-colors`) the mark uses the system's own highlight colours.
- [x] The text is read the same by a screen reader (the mark is a plain `<mark>`, no extra labels).
- [x] `npm test`, `npm run build`, `qa:e2e` as before. `qa:pdf` not run: no export is touched.

## Out of scope

- The phone list: it has no search today (only the wide-screen grid has one). Adding one is its own
  feature.
- Searching more fields (template, dates, CV content).
- Sorting the results by how well they match.
