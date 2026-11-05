# 071 · Amber, a dark side column with a timeline and a warm accent

**Status:** proposed

## What it does

A new template, **Amber**, inspired by a design the user shared (a PSD résumé with a charcoal side
column and an amber accent). The idea is taken; the proportions, details and code are our own, and
nothing from the PSD (images, icons, text) goes into the repository.

- **Side column**, dark (charcoal), on the left, with an accent triangle in its top corner behind
  the photo. It holds the photo, contact, **education** and **languages**.
- **Photo** round, with one square corner (a drop), in a white ring, at the top of the side column.
  Without a photo, the column starts with contact and the accent runs along its top edge instead of
  the triangle.
- **Header** over a pale grey band beside the photo: the name in its heaviest weight, its **last
  word in the accent**, and the headline below, letter-spaced. Neither is set in capitals: the PDF
  would carry the capitals, and an import would read the name in them.
- **Main column**: summary, experience, skills and the custom sections, in the CV's order.
- **Timeline**: a thin vertical line runs down each column; every section title has a short accent
  bar on it, and every entry a dot.
- **Section titles** in heavy capitals, with a small icon in a circle.
- **Skills** in two columns, with the level as a bar (the existing `bars` indicator).
- An accent triangle in the top right corner of the header (the bottom corner of the last page
  cannot be placed reliably once paginated).
- **Raleway**, new among the bundled fonts, is the default font, and is offered in the font select
  for every template.

## Why

The user asked for it: a bold two-column CV with a warm accent that the gallery doesn't have yet
(Cobalt and Monogram have pale side columns; Banner and Harbor have no timeline).

## Decisions (asked of the user)

- **Raleway is bundled** (`@fontsource/raleway`, OFL licence), not replaced by a font we already
  ship.
- **Side column as in the original**: contact, education and languages on the left; summary,
  experience and skills on the right.
- **References**, like any custom section, go in the **main column**: templates don't know which
  preset a section came from, and storing it would change the data model.
- **Inspired, not copied**: the PSD came from a stock site and the zip has no licence.

## Acceptance criteria

### The template
- [ ] It registers itself and shows in the gallery with its own thumbnail and a description in the
      nine interface languages.
- [ ] Contact, education and languages are in the side column; summary, experience, skills and the
      custom sections in the main one, in the order the user set.
- [ ] With a photo it shows in the drop frame; without one there is no empty frame. With an empty
      name, no header text is left behind.
- [ ] The last word of the name is in the accent; a one-word name is all in ink.
- [ ] The accent picker and the font select apply (`accentColor`, `customFont`); with a light accent
      (e.g. `#ffd86f`) the accented name stays readable on the white page (`--cv-accent-text`), and
      text on the accent shapes uses the readable ink.
- [ ] Skills show a bar with a level and the name alone without one (`skillLevels`).
- [ ] The side column reaches the foot of every page; if it cannot fit page one, the existing warning
      shows (spec 033).
- [ ] LinkedIn, GitHub and other links get their own icons (shared `contactIcons.ts`).

### Raleway
- [ ] It is served from the app (Latin and Latin Extended, with `unicode-range`), no third-party
      request; the CSP is unchanged.
- [ ] The font select offers it, marked as bundled; the direct PDF embeds it.

### Output
- [ ] The direct PDF and the print match the paged preview (`qa:pdf`), the diagonals included.
- [ ] An Amber PDF imports back complete (`qa:roundtrip`).
- [ ] Nothing overflows on the 360 px phone or the 1024 px laptop (`qa:consistency`).

### Quality
- [ ] `npm test`, `npm run build`, `qa:e2e`, `qa:pdf`, `qa:roundtrip`, `qa:consistency` pass.
- [ ] Screenshots with the sample CV, with and without a photo, light and dark accent.

## Out of scope

- **References in the side column**, as in the PSD: it needs the preset stored in the data model
  (a schema change and a migration). A separate spec if wanted.
- **Two phone numbers** or a second e-mail in contact: the model has one of each.
- **Android**: its templates are its own.
