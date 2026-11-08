# 081 · Freelance, cards with a hard shadow and a heavy display name

**Status:** draft

## What it does

A new template, **Freelance**, inspired by a design the user shared (cards on a warm paper, a heavy
display name, a wireframe shape in coral). The idea is redrawn in CSS; the proportions, details and
code are our own.

- **Paper**: the page is a warm off-white; every block sits in a **card** with a thin ink border and
  a hard ink shadow offset down and to the right (no blur).
- **Header card** across the page: the photo on the left, in **black and white**, filling the card's
  height and resting on its bottom edge; behind it, a **wireframe shape** (a sphere of grid lines)
  in the accent. On the right, the name in Dela Gothic One, very large, over two lines when it is
  long, and the headline under it in Work Sans. Without a photo, no empty space and no shape behind
  it; the name takes the width.
- **Left column**: **About me** (the summary, then the phone and e-mail in bold, and the other
  contacts), **Skills** (each skill with its level as a thick ink bar over a thin line) and
  **Languages** (the name in bold, the bar, the level as written).
- **Right column**: **Education** and **Experience**, each entry in **two columns** inside its card:
  the position or degree in bold, the dates under it, then the company or institution and the text,
  smaller. The custom sections follow in the same column.
- A second **wireframe shape**, in the accent, at the page's bottom-right corner, running off the
  edge behind the cards.
- **Section titles** in Dela Gothic One, in ink.
- Supports `photo`, `sidebar`, `accentColor`, `customFont`, `multiPage`, `skillLevels`.

## Why

The user asked for it: a bold, card-based CV the gallery doesn't have (Frame has one border round
the page; Retro has a frame and tabs; none has cards with a hard shadow or a display face).

## Decisions

- **Both fonts are bundled** (the owner's choice): `@fontsource/dela-gothic-one` and
  `@fontsource/work-sans`, pinned to `5.3.0` like the others, served from the app, embedded in the
  direct PDF and offered in the font select for every template.
- **Display titles, chosen text font**: the name and the section titles are always Dela Gothic One
  (the template's character); the font select sets everything else, Work Sans by default.
- **The photo in black and white** (the owner's choice), in the preview, the print and the direct
  PDF: the direct PDF learns to draw an image with `filter: grayscale(…)` in grey.
- **Experience in two columns, as in the design** (the owner's choice), like education.
- **Skills under one card** with the section's title, each group's name above its skills, a little
  smaller (as in Amber and Retro: a PDF import finds the skills by the section's title and tells a
  group from a skill by its size). Without a level, the skill shows its name alone, with no bar.
- **Languages' bar** from the level text when it is one the app recognises (`languageLevelScore`:
  "Native", "C1"…); otherwise the level as written, with no bar.
- **Not in the home carousel** (the owner's choice): Freelance shows in the gallery like any template.
- **The PDF import learns to read it** (the owner's choice), for any template: entries set two by two
  are read whole, row by row, the left one first (a column with no headings of its own, about as wide
  as the one on its left, is the second half of that column's pairs); a name large enough to wrap is
  joined from its two lines; and a keyword that ends a word broken at its hyphen ("Full-" / "Stack")
  is part of a title, not a section's heading.

## Acceptance criteria

### The template
- [ ] It registers itself and shows in the gallery with its own thumbnail and a description in the
      nine interface languages.
- [ ] Summary and contacts, skills and languages in the left column; education, experience and
      custom sections in the right one, in the order the user set.
- [ ] Every section is a card with its border and hard shadow; the header card spans the page.
- [ ] With a photo it shows in black and white with the wireframe shape behind it; without one, no
      empty space and no shape. With an empty name or headline, nothing is left behind.
- [ ] Experience and education entries in two columns; a long entry grows its row, the next row
      starts under the taller of the two.
- [ ] Skill levels as bars where given, the name alone otherwise; languages with a bar when their
      level is recognised, the level text always.
- [ ] The accent picker sets both wireframe shapes; the font select sets the text, not the titles.
- [ ] A card that runs on to the next page keeps its border and shadow on both pages; the left
      column on page one, with the existing warning if it cannot fit (spec 033).

### Fonts
- [ ] Dela Gothic One and Work Sans are served from the app (Latin and Latin Extended, with
      `unicode-range`), no third-party request; the CSP is unchanged.
- [ ] The font select offers both, marked as bundled; the direct PDF embeds them.

### Output
- [ ] The direct PDF and the print match the paged preview (`qa:pdf`), the cards, shapes and the
      grey photo included.
- [ ] A Freelance PDF imports back complete (`qa:roundtrip`), the two-column entries included.
- [ ] Nothing overflows on the 360 px phone or the 1024 px laptop (`qa:consistency`).

### Quality
- [ ] `npm test`, `npm run build`, `qa:e2e`, `qa:pdf`, `qa:roundtrip`, `qa:consistency` pass.
- [ ] Screenshots with the sample CV, with and without a photo, the default accent and a dark one.

## Out of scope

- A cut-out photo (the person without their background): the photo is the rectangle the user gave.
- The shapes' colour gradient: the direct PDF draws no gradients; they are in the accent, solid.
- Android: its templates are its own.
