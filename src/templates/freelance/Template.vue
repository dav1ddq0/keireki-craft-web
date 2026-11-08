<script setup lang="ts">
/**
 * Freelance — cards on a warm paper, each with a thin ink border and a hard ink shadow (spec 081).
 * The header card spans the page: the photo in black and white with a wireframe ring in the accent
 * behind it, the name very large in Dela Gothic One and the headline under it. Then two columns: on
 * the left the summary with the contact, the skills and the languages, with their levels as bars; on
 * the right education, experience and the custom sections, their entries two by two. A round patch of
 * wireframe in the accent sits in the first page's bottom-right corner, behind the cards.
 *
 * The name and section titles are always Dela Gothic One, the template's character; the font select
 * sets everything else. The paper is a pseudo-element of the root, so it repeats on every page.
 *
 * `data.personal.photo` arrives as a renderable URL — the preview container resolves the
 * `photo:{id}` reference before handing the data over.
 */
import { computed } from 'vue'
import type { CVData } from '@/types/cv'
import Breakable from '@/templates/Breakable.vue'
import { contactKind } from '@/templates/contactIcons'
import {
  absoluteUrl,
  contactLines,
  displayUrl,
  formatDateRange,
  groupHasLevels,
  levelAccessibleLabel,
  resolveLanguages,
  resolveSections,
  skillNames,
  styleVars,
} from '@/templates/shared'
import { PATCH_SHAPE, RING } from './shapes'

const props = defineProps<{ data: CVData }>()

const vars = computed(() => styleVars(props.data.style))
const language = computed(() => props.data.meta.language || 'es')
const sections = computed(() => resolveSections(props.data))
const languages = computed(() => resolveLanguages(props.data))
const fullName = computed(() => props.data.personal.fullName.trim())

/** The summary (with the contact), skills and languages in the left column; the rest on the right. */
const SIDE_KINDS = new Set(['summary', 'skills', 'languages'])
const sideSections = computed(() => sections.value.filter((s) => SIDE_KINDS.has(s.kind)))
const mainSections = computed(() => sections.value.filter((s) => !SIDE_KINDS.has(s.kind)))
const hasSummary = computed(() => sideSections.value.some((s) => s.kind === 'summary'))

const contactItems = computed(() =>
  contactLines(props.data).map((text) => ({ text, kind: contactKind(text, props.data.personal) })),
)
const hasContact = computed(() => contactItems.value.length > 0 || props.data.personal.links.length > 0)

/** Entries two by two: each pair is a row that keeps together across a page break. */
function pairs<T>(items: T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / 2) }, (_, i) => items.slice(i * 2, i * 2 + 2))
}
</script>

<template>
  <article class="freelance" :class="{ 'freelance--photo': data.personal.photo }" :style="vars">
    <!-- First in the markup: the direct PDF paints in document order, so the cards cover it. -->
    <svg class="patch" :viewBox="PATCH_SHAPE.viewBox" aria-hidden="true">
      <path class="shape" :d="PATCH_SHAPE.disc" />
      <path class="mesh" :d="PATCH_SHAPE.grid" />
    </svg>

    <header v-if="fullName || data.personal.headline || data.personal.photo" class="card head">
      <svg v-if="data.personal.photo" class="ring" :viewBox="RING.viewBox" aria-hidden="true">
        <path class="shape" :d="RING.outer" />
        <path class="hole" :d="RING.hole" />
        <path class="mesh" :d="RING.grid" />
      </svg>
      <img v-if="data.personal.photo" class="photo" :src="data.personal.photo" alt="" />
      <div class="identity">
        <h1 v-if="fullName" class="name">{{ fullName }}</h1>
        <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
      </div>
    </header>

    <aside class="side" data-side>
      <section v-if="!hasSummary && hasContact" class="card" data-section="contact">
        <div class="contacts contacts--alone">
          <p v-for="(item, i) in contactItems" :key="i" class="contact" :class="{ 'contact--main': item.kind === 'mail' || item.kind === 'phone' }">
            <Breakable :text="item.text" />
          </p>
          <p v-for="link in data.personal.links" :key="link.id" class="contact">
            <a :href="absoluteUrl(link.url)"><Breakable :text="link.label || displayUrl(link.url)" /></a>
          </p>
        </div>
      </section>

      <section v-for="section in sideSections" :key="section.id" :data-section="section.kind" class="card">
        <h2 class="title">{{ section.title }}</h2>

        <template v-if="section.kind === 'summary'">
          <p class="summary">{{ data.summary }}</p>
          <div v-if="hasContact" class="contacts">
            <p v-for="(item, i) in contactItems" :key="i" class="contact" :class="{ 'contact--main': item.kind === 'mail' || item.kind === 'phone' }">
              <Breakable :text="item.text" />
            </p>
            <p v-for="link in data.personal.links" :key="link.id" class="contact">
              <a :href="absoluteUrl(link.url)"><Breakable :text="link.label || displayUrl(link.url)" /></a>
            </p>
          </div>
        </template>

        <template v-else-if="section.kind === 'skills'">
          <div v-for="group in data.skills" :key="group.id" class="group">
            <p v-if="group.category" class="skill-category">{{ group.category }}</p>
            <ul v-if="groupHasLevels(group)" class="levels">
              <li v-for="(item, i) in group.items" :key="i" class="level-row" :class="{ 'level-row--plain': !item.level }">
                <span class="level-name">{{ item.name }}</span>
                <span v-if="item.level" class="bar" role="img" :aria-label="levelAccessibleLabel(item.level, language)">
                  <span class="bar-track" />
                  <span class="bar-fill" :style="{ width: `${item.level * 20}%` }" />
                </span>
              </li>
            </ul>
            <p v-else class="skill-items">{{ skillNames(group).join(' · ') }}</p>
          </div>
        </template>

        <ul v-else class="levels">
          <li v-for="lang in languages" :key="lang.id" class="lang-row">
            <span class="lang-name">{{ lang.name }}</span>
            <span v-if="lang.score" class="bar" role="img" :aria-label="lang.label">
              <span class="bar-track" />
              <span class="bar-fill" :style="{ width: `${lang.score * 20}%` }" />
            </span>
            <span v-if="lang.level" class="lang-level">{{ lang.level }}</span>
          </li>
        </ul>
      </section>
    </aside>

    <main class="main">
      <section v-for="section in mainSections" :key="section.id" :data-section="section.kind" :data-page-break="section.breakBefore" class="card">
        <h2 class="title">{{ section.title }}</h2>

        <template v-if="section.kind === 'experience'">
          <div v-for="(pair, p) in pairs(data.experience)" :key="p" class="pair">
            <div v-for="item in pair" :key="item.id" class="entry">
              <h3 class="entry-title">{{ item.position }}</h3>
              <p class="entry-dates">{{ formatDateRange(item.startDate, item.endDate, language) }}</p>
              <p v-if="item.company || item.location" class="entry-meta">
                {{ item.company }}<template v-if="item.company && item.location"> · </template>{{ item.location }}
              </p>
              <p v-if="item.description" class="entry-text">{{ item.description }}</p>
              <ul v-if="item.highlights.length" class="highlights">
                <li v-for="(highlight, i) in item.highlights" :key="i">{{ highlight }}</li>
              </ul>
            </div>
          </div>
        </template>

        <template v-else-if="section.kind === 'education'">
          <div v-for="(pair, p) in pairs(data.education)" :key="p" class="pair">
            <div v-for="item in pair" :key="item.id" class="entry">
              <h3 class="entry-title">{{ item.degree }}</h3>
              <p class="entry-dates">{{ formatDateRange(item.startDate, item.endDate, language) }}</p>
              <p v-if="item.institution" class="entry-meta">{{ item.institution }}</p>
              <p v-if="item.description" class="entry-text">{{ item.description }}</p>
            </div>
          </div>
        </template>

        <template v-else-if="section.custom">
          <div v-for="(pair, p) in pairs(section.custom.entries)" :key="p" class="pair">
            <div v-for="entry in pair" :key="entry.id" class="entry">
              <h3 class="entry-title">{{ entry.title }}</h3>
              <p v-if="entry.date" class="entry-dates">{{ entry.date }}</p>
              <p v-if="entry.subtitle" class="entry-meta">{{ entry.subtitle }}</p>
              <p v-if="entry.description" class="entry-text">{{ entry.description }}</p>
            </div>
          </div>
        </template>
      </section>
    </main>
  </article>
</template>

<style scoped>
.freelance {
  position: relative;
  isolation: isolate;
  display: grid;
  /* minmax(0, …): a long word breaks inside the column instead of widening it (spec 074). */
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  /* The side column before the main one in the markup: paged.js splits in DOM order, so the side
     column stays on page 1 and only the main column flows on (spec 032). */
  grid-template-rows: auto 1fr;
  column-gap: var(--card-gap);
  box-sizing: border-box;
  padding: var(--cv-page-margin) calc(var(--cv-page-margin) + var(--lift)) var(--cv-page-margin) var(--cv-page-margin);
  font-family: var(--cv-font);
  font-size: calc(9.5pt * var(--cv-font-scale));
  line-height: 1.4;
  color: var(--ink);
  min-height: 100%;
  /* The live preview is one long sheet: paper all the way down, not only the first page's. */
  background: var(--paper);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
  --gap: calc(1em * var(--cv-spacing-scale));
  --card-gap: calc(4mm * var(--cv-spacing-scale));
  --ink: #111;
  --muted: #3d3d3d;
  --paper: #f3f0eb;
  --display: 'Dela Gothic One', 'Arial Black', Impact, sans-serif;
  --line: 0.35mm;
  /* How far the hard shadow sits down and to the right of a card. */
  --lift: 1mm;
  --pad: 4.2mm;
  --photo: 42mm;
}

/* The paper, in one box so that it repeats on every page and the direct PDF, which paints in
   document order, draws it before everything else (spec 031). */
.freelance::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  width: 210mm;
  height: 297mm;
  background: var(--paper);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* paged.js unsets ::before and the top padding on a fragment that continues from the last page; the
   paper must be on every page, and the cards must start inside the margin. */
.freelance[data-split-from]::before {
  content: '' !important;
}

.freelance[data-split-from] {
  padding-top: var(--cv-page-margin) !important;
}

/* Behind the cards (z-index under the in-flow content, over the paper), in the first page's corner. */
.patch {
  position: absolute;
  z-index: -1;
  top: calc(297mm - 58mm);
  right: 0;
  width: 64mm;
  height: 58mm;
}

.shape {
  fill: var(--cv-accent);
}

.hole {
  fill: var(--paper);
}

.mesh {
  fill: none;
  stroke: var(--paper);
  stroke-width: 1.3;
  stroke-linejoin: round;
}

/* ---- cards ---- */

.card {
  box-sizing: border-box;
  min-width: 0;
  padding: var(--pad);
  border: var(--line) solid var(--ink);
  background: var(--paper);
  box-shadow: var(--lift) var(--lift) 0 0 var(--ink);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* paged.js drops the padding where it cuts a card: both pieces keep their room inside the border. */
.card[data-split-from] {
  padding-top: var(--pad) !important;
}

.card[data-split-to] {
  padding-bottom: var(--pad) !important;
}

/* When a card's title cannot stay with its first entries at the foot of a page, paged.js moves both
   on and leaves the card there empty: no border and shadow round nothing. */
.card:not(:has(> *)) {
  display: none;
}

.side > .card + .card,
.main > .card + .card {
  margin-top: var(--card-gap);
}

/* Explicit tracks: a continuation page holding only one column must not move it to the other (spec 022). */
.head {
  position: relative;
  grid-column: 1 / -1;
  grid-row: 1;
  display: flex;
  align-items: center;
  margin-bottom: var(--card-gap);
  padding: 0;
  overflow: hidden;
}

.freelance--photo .head {
  min-height: 46mm;
}

/* The ring rises from behind the photo's right edge. */
.ring {
  position: absolute;
  top: 2.5mm;
  left: calc(var(--photo) - 11mm);
  width: 33mm;
  height: 36mm;
}

.photo {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: var(--photo);
  height: 100%;
  object-fit: cover;
  filter: grayscale(1);
}

.identity {
  min-width: 0;
  padding: 6mm 7mm 5.5mm;
}

.freelance--photo .identity {
  padding-left: calc(var(--photo) + 26mm);
}

.name {
  margin: 0;
  font-family: var(--display);
  font-size: 3.2em;
  /* Dela Gothic One has one weight: a bold would be drawn by thickening it. */
  font-weight: 400;
  line-height: 1.02;
  letter-spacing: -0.01em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.headline {
  margin: 0.35em 0 0;
  font-size: 1.7em;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.02em;
  overflow-wrap: anywhere;
}

.side {
  grid-column: 1;
  grid-row: 2;
  min-width: 0;
}

.main {
  grid-column: 2;
  grid-row: 2;
  min-width: 0;
}

.title {
  margin: 0 0 0.5em;
  font-family: var(--display);
  font-size: 1.65em;
  font-weight: 400;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

/* ---- the left column ---- */

.summary {
  margin: 0;
  white-space: pre-line;
  overflow-wrap: break-word;
}

.contacts {
  margin-top: calc(var(--gap) * 1.1);
}

.contacts--alone {
  margin-top: 0;
}

.contact {
  margin: 0 0 0.15em;
  overflow-wrap: anywhere;
}

.contact--main {
  font-size: 1.1em;
  font-weight: 600;
}

.contact a {
  color: inherit;
  text-decoration: none;
}

.side .card {
  break-inside: avoid;
}

.group + .group {
  margin-top: calc(var(--gap) * 0.6);
}

/* Set a little smaller than the skills under it: that is how a PDF import tells a group's name from a
   skill (as in Amber and Retro). */
.skill-category {
  margin: 0 0 0.35em;
  font-size: 0.9em;
  font-weight: 700;
  color: var(--muted);
  overflow-wrap: break-word;
}

.skill-items {
  margin: 0;
  overflow-wrap: break-word;
}

.levels {
  margin: 0;
  padding: 0;
  list-style: none;
}

.level-row,
.lang-row {
  display: grid;
  align-items: center;
  column-gap: 0.9em;
  margin-bottom: calc(var(--gap) * 0.35);
}

.level-row:last-child,
.lang-row:last-child {
  margin-bottom: 0;
}

.level-row {
  grid-template-columns: minmax(0, 42%) minmax(0, 1fr);
}

.level-row--plain {
  grid-template-columns: minmax(0, 1fr);
}

.lang-row {
  grid-template-columns: minmax(0, 30%) minmax(0, 1fr) auto;
}

.level-name,
.lang-name {
  overflow-wrap: break-word;
}

.lang-name {
  font-weight: 700;
}

.lang-level {
  grid-column: 3;
  max-width: 9em;
  text-align: right;
  overflow-wrap: break-word;
}

/* A thin line the whole way, the level a thick stroke over it. */
.bar {
  position: relative;
  display: block;
  height: 1.1mm;
}

.bar-track {
  position: absolute;
  top: calc(50% - 0.12mm);
  left: 0;
  right: 0;
  height: 0.25mm;
  background: var(--ink);
}

.bar-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background: var(--ink);
}

.bar-track,
.bar-fill {
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* ---- the right column: entries two by two ---- */

.pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  /* Wider than two of the titles' type sizes: a PDF import reads text closer than that as one line
     across both entries (spec 040), and the rows further apart than the lines of one entry. */
  column-gap: 2.4em;
  margin-bottom: calc(var(--gap) * 1.3);
  break-inside: avoid;
  page-break-inside: avoid;
}

.pair:last-child {
  margin-bottom: 0;
}

.entry {
  min-width: 0;
}

.entry-title {
  margin: 0;
  font-size: 1.12em;
  font-weight: 600;
  line-height: 1.2;
  /* A word longer than the column breaks instead of widening it (spec 074). */
  min-width: 0;
  overflow-wrap: break-word;
}

.entry-dates {
  margin: 0.2em 0 0;
}

.entry-meta {
  margin: 0.15em 0 0;
  font-size: 0.9em;
  font-weight: 600;
  overflow-wrap: break-word;
}

.entry-text {
  margin: 0.3em 0 0;
  font-size: 0.88em;
  color: var(--muted);
  overflow-wrap: break-word;
}

.highlights {
  margin: 0.3em 0 0;
  padding-left: 1.1em;
  font-size: 0.88em;
  color: var(--muted);
  overflow-wrap: break-word;
}

.highlights li {
  margin-bottom: 0.15em;
}
</style>
