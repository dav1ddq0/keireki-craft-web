# 083 · Minimalist, a dusty rose page with the side column on the right

**Status:** draft

## What it does

A new template, **Minimalist**, inspired by a design the user shared (a pale rose page, a deeper rose
side column on the right, a round photo and a large italic name). The idea is redrawn in CSS; the
proportions, details and code are our own.

- **Two papers**: the main column, on the left and wider, on a pale tint of the accent; the side
  column, on the right, on a deeper tint of it, from the top of the page to the bottom, on every page.
- **Side column, top**: the photo in a **circle**; under it the name, large, in **italic**, over two
  lines when it is long; the headline under it, italic and letter-spaced. Without a photo, the name
  starts at the top.
- **Side sections**: each title sits on a **band** of the main column's pale paper across the side
  column, the content under it on the side's tint.
  - **Contact**: phone, e-mail, location and the other contact details, each with its icon; then the
    links, each with its label in bold italic and its address under it, after a small square.
  - **Languages**: the name, a bar when the level is one the app recognises, the level as written.
- **Main column**: titles in capitals, bold.
  - **About me** (the summary), in grey.
  - **Education**, entries **two by two**: a small square, the degree in italic, the dates and the
    institution, smaller and grey.
  - **Experience**: a small square, the position in italic with the dates beside it, the company and
    the text under it in grey.
  - **Custom sections** as a **timeline**: a vertical line with a small square on it for each entry,
    the date in italic, the title and the text beside it.
  - **Skills** in **two columns**: each skill a **circle with its initials** (two letters) and, beside
    it, its name and its level as a thick ink bar over a pale track; without a level, the circle and
    the name. A group's name above its skills, a little smaller.
- **Titles** in Montserrat, in capitals; the name and the text in the font chosen, Raleway by default.
- Supports `photo`, `sidebar`, `accentColor`, `customFont`, `multiPage`, `skillLevels`.

## Why

The user asked for it: a soft, quiet CV with the side column on the right (Modern, Amber and Retro
keep it on the left; Freelance draws cards) and the name set in a light italic.

## Decisions

- **Name**: Minimalist (the owner's choice), id `minimalist`.
- **Fonts already bundled** (the owner's choice): Montserrat for the titles (the closest to the
  design's capitals) and Raleway for the text and the name, both in the app since specs 080 and 071.
  No new dependency, `package.json` unchanged.
- **Skills with a circle and their initials** (the owner's choice): the first letter of the skill's
  first two words, or its first two letters when it is one word ("Photoshop" → "Ph", "Adobe
  Illustrator" → "AI"), in the accent with its readable text colour; a level as a bar.
- **The accent sets the papers**: the main paper and the side's are tints of it (mixed with white,
  which the direct PDF already draws, as Amber and Retro), so a pale accent and a dark one both give a
  soft page; the skill circles are the accent itself. The ink (titles, squares, bars) stays dark grey.
- **Skills in the main column**, as in the design; the side keeps contact and languages.
- **Links inside Contact**, under the contact details, with no title of their own (the model has no
  "Follow me" section; a title only for them would be a new word in nine languages and a heading the
  PDF import does not know).
- **Not in the home carousel** (the owner's choice).

## Acceptance criteria

### The template
- [x] It registers itself and shows in the gallery with its own thumbnail and a description in the
      nine interface languages.
- [x] Photo, name and headline, contact and languages in the right column; summary, education,
      experience, skills and custom sections in the left one, in the order the user set.
- [x] Both papers reach the foot of every page, the side column's on the right of each.
- [x] With a photo it shows in a circle; without one, no empty space. With an empty name or headline,
      nothing is left behind.
- [x] Side titles on their pale band; main titles in capitals, in Montserrat; the font select sets
      the text and the name, not the titles.
- [x] Education entries two by two; experience with its squares; custom sections on a timeline.
- [x] Skills in two columns with a circle and initials each; a bar where a level is given, none
      otherwise; languages with a bar when their level is recognised, the level text always.
- [x] The accent picker sets both papers and the circles, and the text stays readable on them.
- [x] The side column on page one, with the existing warning if it cannot fit (spec 033).

### Output
- [x] The direct PDF and the print match the paged preview (`qa:pdf`), the papers, circles, squares
      and timeline included.
- [x] A Minimalist PDF imports back complete (`qa:roundtrip`): the skills' initials are not taken for
      skills, the two-by-two entries are read whole.
- [x] Nothing overflows on the 360 px phone or the 1024 px laptop (`qa:consistency`).

### Quality
- [x] `npm test`, `npm run build`, `qa:e2e`, `qa:pdf`, `qa:roundtrip`, `qa:consistency` pass.
- [x] Screenshots with the sample CV, with and without a photo, the default accent and a dark one.

## Verification

`npm test` (`minimalistTemplate.test.ts`: the side column on the right, the photo circle and an empty
CV, the bands and the links in Contact, pairs, squares and the timeline, skill circles with their
initials and bars, language bars, Montserrat titles, both papers on every page, and the initials of
thirteen names; a side column with only its languages, the levels at its edge and a name across their
strip in `pdfLayout.test.ts`; initials left out, a wrapped headline and the space after an opening
quote in `pdfImport.test.ts` and `pdfLayout.test.ts`; in a clean copy, since the local Vitest cache
keeps the registry from before `minimalist/`), `vue-tsc`, `npm run build`. `qa:pdf minimalist` 33/33
(sample, photo, long, break, long name, long words, a growing side column), `qa:roundtrip` 532/532
(every template; Minimalist: name, headline, e-mail, experience 2/2, education, skills 12/12 without
their initials, languages 3/3), `qa:e2e` 231/231, `qa:consistency` 13/13 over 425 views, `qa:security`
57/57. Screenshots of the sample with a photo and without one, with the default accent and a dark one,
of a three-page CV in the direct PDF and of the gallery card.

Beyond the plan: the first roundtrip found the skills as "Ty TypeScript" and the side column not read
as one (one known heading; its levels looked like a third column, which the name crossed), so name,
headline and languages were lost; and a headline that wraps in the side column, with the space a
printed PDF leaves after its opening quote. Task 2 fixed the import for all of them (see the plan).
The import also takes an e-mail for two links ("lucja.oster", "example.com") in every template; that
was so before this spec and is left as it is.

## Out of scope

- The QR code: it would be a picture of a link the CV already has.
- Interests with icons: the model has no interests section; a custom section shows on the timeline.
- Skill percentages and a logo per program: levels are the model's 1–5; the circle shows initials.
- Android: its templates are its own.
