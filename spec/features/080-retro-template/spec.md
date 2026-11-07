# 080 · Retro, a framed page with slab headings and black tabs

**Status:** proposed

## What it does

A new template, **Retro**, inspired by a design the user shared (a mint frame, slab-serif headings,
black tabs). The idea is redrawn in CSS; the proportions, details and code are our own.

- **Frame**: the page sits inside a frame in the accent (mint by default) whose lower part turns to
  ink, with a thin ink line around the white sheet. On every page when paginated.
- **Header**: a short greeting above the name (see decisions), the name in a heavy slab serif, very
  large; the headline in a black tab under it. The photo round, in a thick ink ring, at the top
  right, with an ink triangle pointing at it from the frame. A small zig-zag mark at the top edge.
  Without a photo, no empty ring and no triangle; the name takes the width.
- **Contact** in one row under the header, right-aligned, each with its icon (shared
  `contactIcons.ts`), over a thin rule with a small notch under the summary title.
- **Summary** ("About me") in a pale accent band across the page: the title, in two lines and
  right-aligned, then a vertical ink bar, then the text.
- **Main column**: experience, education and the custom sections, in the CV's order. Entries begin
  with a chevron; the dates on the right in bold. **Education in two columns** with a dotted divider.
- **Side column**, in a pale accent, on the right: **each skill group is a black tab with its
  category** ("Skills", "Software" in the original), its skills as a bullet list (the level as text,
  e.g. "(Avanzado)", where `skillLevels` gives one); then **languages**, as a tab with "Idioma
  (Nivel)" bullets.
- **Section titles** in the slab serif, large, in ink.
- Supports `photo`, `sidebar`, `accentColor`, `customFont`, `multiPage`, `skillLevels`.

## Why

The user asked for it: a playful, framed CV with a retro feel that the gallery doesn't have (Frame
has a border but no tabs or band; Amber and Cobalt have side columns but no frame).

## Decisions

- **Both fonts are bundled** (the owner's choice): `@fontsource/roboto-slab` and
  `@fontsource/montserrat`, pinned to `5.3.0` like the others, served from the app, embedded
  in the direct PDF and offered in the font select for every template.
- **Slab headings, chosen text font**: the name and the section titles are always Roboto Slab (the
  template's character); the font select sets everything else, Montserrat by default.
- **The greeting stays** (the owner's choice), in the CV's language: «¡Hola! Soy», "Hello! I'm",
  «Bonjour ! Je suis»… in the nine CV languages. A PDF import does not take it as part of the name.
- **Not in the home carousel** (the owner's choice): Retro shows in the gallery like any template.

## Acceptance criteria

### The template
- [ ] It registers itself and shows in the gallery with its own thumbnail and a description in the
      nine interface languages.
- [ ] Summary in the band; experience, education and custom sections in the main column; skill groups
      and languages in the side column, in the order the user set.
- [ ] With a photo it shows in the ring with the triangle; without one, no empty ring or triangle.
      With an empty name or headline, nothing is left behind (no empty black tab).
- [ ] Each skill group is a tab with its category; without a category, the tab reads the section's
      title. Levels show as text where given, the name alone otherwise.
- [ ] The accent picker and the font select apply; with a dark accent the frame and band stay
      readable (text on the accent uses the readable ink).
- [ ] The frame is on every page; the side column reaches the foot of every page; if it cannot fit
      page one, the existing warning shows (spec 033).
- [ ] LinkedIn, GitHub and other links get their own icons.

- [ ] The greeting is in the CV's language; with an empty name there is no greeting either.

### Fonts
- [ ] Roboto Slab and Montserrat are served from the app (Latin and Latin Extended, with
      `unicode-range`), no third-party request; the CSP is unchanged.
- [ ] The font select offers both, marked as bundled; the direct PDF embeds them.

### Output
- [ ] The direct PDF and the print match the paged preview (`qa:pdf`), the frame and tabs included.
- [ ] A Retro PDF imports back complete (`qa:roundtrip`), the name included and without the greeting.
- [ ] Nothing overflows on the 360 px phone or the 1024 px laptop (`qa:consistency`).

### Quality
- [ ] `npm test`, `npm run build`, `qa:e2e`, `qa:pdf`, `qa:roundtrip`, `qa:consistency` pass.
- [ ] Screenshots with the sample CV, with and without a photo, the default accent and a dark one.

## Out of scope

- The original's percentages next to software ("(100%)"): levels are the model's words, not numbers.
- Two phone numbers or a second e-mail: the model has one of each.
- Android: its templates are its own.
