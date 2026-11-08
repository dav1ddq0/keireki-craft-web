<script setup lang="ts">
/**
 * Minimalist — two papers in tints of the accent: the main column on the left, the side column on the
 * right in a deeper tint (spec 083). The side holds the photo in a circle, the name large and in
 * italic, the headline, then the contact (with the links) and the languages, each under a title set
 * on a band of the main paper. The main column holds the summary, education two by two, experience,
 * the skills in two columns (a circle with the initials, the name and a bar) and the custom sections
 * on a timeline; small ink squares mark the entries.
 *
 * Section titles are always Montserrat, in capitals; the font select sets everything else. Both papers
 * are a pseudo-element of the root, so they repeat on every page (spec 033).
 *
 * `data.personal.photo` arrives as a renderable URL — the preview container resolves the
 * `photo:{id}` reference before handing the data over.
 */
import { computed } from 'vue'
import type { CVData } from '@/types/cv'
import Breakable from '@/templates/Breakable.vue'
import { CONTACT_ICONS, contactKind } from '@/templates/contactIcons'
import {
  absoluteUrl,
  contactHeading,
  contactLines,
  displayUrl,
  formatDateRange,
  levelAccessibleLabel,
  resolveLanguages,
  resolveSections,
  styleVars,
} from '@/templates/shared'
import { initials } from './initials'

const props = defineProps<{ data: CVData }>()

const vars = computed(() => styleVars(props.data.style))
const language = computed(() => props.data.meta.language || 'es')
const sections = computed(() => resolveSections(props.data))
const languages = computed(() => resolveLanguages(props.data))
const fullName = computed(() => props.data.personal.fullName.trim())

/** Languages in the side column, under the contact; everything else in the main one. */
const SIDE_KINDS = new Set(['languages'])
const sideSections = computed(() => sections.value.filter((s) => SIDE_KINDS.has(s.kind)))
const mainSections = computed(() => sections.value.filter((s) => !SIDE_KINDS.has(s.kind)))

const contactItems = computed(() =>
  contactLines(props.data).map((text) => ({ text, kind: contactKind(text, props.data.personal) })),
)
const contactTitle = computed(() => contactHeading(language.value))
const hasContact = computed(() => contactItems.value.length > 0 || props.data.personal.links.length > 0)

/** Entries two by two: each pair is a row that keeps together across a page break. */
function pairs<T>(items: T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / 2) }, (_, i) => items.slice(i * 2, i * 2 + 2))
}
</script>

<template>
  <article class="minimalist" :class="{ 'minimalist--photo': data.personal.photo }" :style="vars">
    <aside class="side" data-side>
      <header v-if="fullName || data.personal.headline || data.personal.photo" class="identity">
        <img v-if="data.personal.photo" class="photo" :src="data.personal.photo" alt="" />
        <h1 v-if="fullName" class="name">{{ fullName }}</h1>
        <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
      </header>

      <section v-if="hasContact" class="side-block" data-section="contact">
        <h2 class="band">{{ contactTitle }}</h2>
        <div class="side-body">
          <p v-for="(item, i) in contactItems" :key="i" class="contact">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="CONTACT_ICONS[item.kind]" /></svg>
            <span><Breakable :text="item.text" /></span>
          </p>
          <div v-if="data.personal.links.length" class="links">
            <p v-for="link in data.personal.links" :key="link.id" class="link">
              <span class="square" aria-hidden="true" />
              <span class="link-text">
                <span v-if="link.label" class="link-label">{{ link.label }}</span>
                <a :href="absoluteUrl(link.url)" class="link-url"><Breakable :text="displayUrl(link.url)" /></a>
              </span>
            </p>
          </div>
        </div>
      </section>

      <section v-for="section in sideSections" :key="section.id" :data-section="section.kind" class="side-block">
        <h2 class="band">{{ section.title }}</h2>
        <ul class="side-body langs">
          <li v-for="lang in languages" :key="lang.id" class="lang-row">
            <span class="lang-name">{{ lang.name }}</span>
            <span v-if="lang.score" class="bar" role="img" :aria-label="lang.label">
              <span class="bar-fill" :style="{ width: `${lang.score * 20}%` }" />
            </span>
            <span v-if="lang.level" class="lang-level">{{ lang.level }}</span>
          </li>
        </ul>
      </section>
    </aside>

    <main class="main">
      <section v-for="section in mainSections" :key="section.id" :data-section="section.kind" :data-page-break="section.breakBefore" class="block">
        <h2 class="title">{{ section.title }}</h2>

        <p v-if="section.kind === 'summary'" class="summary">{{ data.summary }}</p>

        <template v-else-if="section.kind === 'education'">
          <div v-for="(pair, p) in pairs(data.education)" :key="p" class="pair">
            <div v-for="item in pair" :key="item.id" class="entry">
              <span class="square" aria-hidden="true" />
              <div class="entry-body">
                <h3 class="entry-title">{{ item.degree }}</h3>
                <p class="entry-dates">{{ formatDateRange(item.startDate, item.endDate, language) }}</p>
                <p v-if="item.institution" class="entry-meta">{{ item.institution }}</p>
                <p v-if="item.description" class="entry-text">{{ item.description }}</p>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="section.kind === 'experience'">
          <div v-for="item in data.experience" :key="item.id" class="entry">
            <span class="square" aria-hidden="true" />
            <div class="entry-body">
              <div class="entry-head">
                <h3 class="entry-title">{{ item.position }}</h3>
                <span class="entry-dates">{{ formatDateRange(item.startDate, item.endDate, language) }}</span>
              </div>
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

        <template v-else-if="section.kind === 'skills'">
          <div v-for="group in data.skills" :key="group.id" class="group">
            <p v-if="group.category" class="skill-category">{{ group.category }}</p>
            <ul class="skills">
              <li v-for="(item, i) in group.items" :key="i" class="skill">
                <span class="circle" aria-hidden="true">{{ initials(item.name) }}</span>
                <span class="skill-body">
                  <span class="skill-name">{{ item.name }}</span>
                  <span v-if="item.level" class="bar" role="img" :aria-label="levelAccessibleLabel(item.level, language)">
                    <span class="bar-fill" :style="{ width: `${item.level * 20}%` }" />
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </template>

        <div v-else-if="section.custom" class="timeline">
          <div v-for="entry in section.custom.entries" :key="entry.id" class="entry tl-entry">
            <span class="square tl-square" aria-hidden="true" />
            <p v-if="entry.date" class="tl-date">{{ entry.date }}</p>
            <div class="tl-body">
              <h3 class="entry-title">{{ entry.title }}</h3>
              <p v-if="entry.subtitle" class="entry-meta">{{ entry.subtitle }}</p>
              <p v-if="entry.description" class="entry-text">{{ entry.description }}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  </article>
</template>

<style scoped>
.minimalist {
  position: relative;
  isolation: isolate;
  display: grid;
  /* minmax(0, …): a long word breaks inside the column instead of widening it (spec 074). */
  grid-template-columns: minmax(0, 1fr) var(--side);
  /* The side column before the main one in the markup: paged.js splits in DOM order, so the side
     column stays on page 1 and only the main column flows on (spec 032); and text extraction reads the
     name first. */
  grid-template-rows: 1fr;
  box-sizing: border-box;
  padding: var(--cv-page-margin) 0 var(--cv-page-margin) var(--cv-page-margin);
  font-family: var(--cv-font);
  font-size: calc(9.5pt * var(--cv-font-scale));
  line-height: 1.45;
  color: var(--ink);
  min-height: 100%;
  /* The live preview is one long sheet: the main paper all the way down. */
  background: var(--paper);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
  --gap: calc(1em * var(--cv-spacing-scale));
  --ink: #2e2e2e;
  --muted: #6b6b6b;
  --titles: 'Montserrat', 'Segoe UI', system-ui, sans-serif;
  --side: 78mm;
  --side-pad: 7mm;
  --photo: 30mm;
  --paper: color-mix(in srgb, var(--cv-accent) 14%, #fff);
  --side-bg: color-mix(in srgb, var(--cv-accent) 26%, #fff);
}

/* Both papers in one box, a page tall, so they repeat on every page and the direct PDF, which paints
   in document order, draws them before everything else (spec 031); the side's as a right border. */
.minimalist::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  box-sizing: border-box;
  width: 210mm;
  height: 297mm;
  border-right: var(--side) solid var(--side-bg);
  background: var(--paper);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* paged.js unsets ::before and the top padding on a fragment that continues from the last page; the
   papers must be on every page, and the text must start inside the margin. */
.minimalist[data-split-from]::before {
  content: '' !important;
}

.minimalist[data-split-from] {
  padding-top: var(--cv-page-margin) !important;
}

/* ---- the side column ---- */

/* Explicit tracks: a continuation page holding only one column must not move it to the other (spec 022).
   The column reaches the page's top and foot over the root's margin, so the live preview's long sheet
   has its tint all the way down too. */
.side {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  margin: calc(-1 * var(--cv-page-margin)) 0;
  padding: var(--cv-page-margin) 0;
  background: var(--side-bg);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.identity {
  padding: 0 var(--side-pad) calc(var(--gap) * 1.4);
}

.photo {
  display: block;
  width: var(--photo);
  height: var(--photo);
  margin-bottom: calc(var(--gap) * 1.2);
  border-radius: 50%;
  object-fit: cover;
}

.name {
  margin: 0;
  font-size: 2.9em;
  font-style: italic;
  font-weight: 400;
  line-height: 1.04;
  color: #444;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.headline {
  margin: 0.4em 0 0;
  font-size: 1.15em;
  font-style: italic;
  line-height: 1.3;
  letter-spacing: 0.08em;
  color: #555;
  overflow-wrap: anywhere;
}

.side-block {
  break-inside: avoid;
}

.side-block + .side-block {
  margin-top: calc(var(--gap) * 0.4);
}

/* A side title on a band of the main paper, across the column. */
.band {
  margin: 0;
  padding: 0.55em var(--side-pad);
  font-family: var(--titles);
  font-size: 1.15em;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  background: var(--paper);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
  overflow-wrap: anywhere;
}

.side-body {
  margin: 0;
  padding: calc(var(--gap) * 0.9) var(--side-pad);
}

.contact {
  display: flex;
  align-items: flex-start;
  gap: 0.8em;
  margin: 0 0 0.45em;
  overflow-wrap: anywhere;
}

.contact > span {
  min-width: 0;
}

.icon {
  flex: none;
  width: 1.2em;
  height: 1.2em;
  fill: none;
  stroke: var(--ink);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.links {
  margin-top: calc(var(--gap) * 0.8);
}

.link {
  display: flex;
  align-items: flex-start;
  gap: 0.8em;
  margin: 0 0 0.45em;
}

.link .square {
  margin-top: 0.55em;
}

.link-text {
  min-width: 0;
  overflow-wrap: anywhere;
}

.link-label {
  display: block;
  font-style: italic;
  font-weight: 700;
}

.link-url {
  color: inherit;
  text-decoration: none;
}

.langs {
  list-style: none;
}

.lang-row {
  display: grid;
  grid-template-columns: minmax(0, 32%) minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 0.8em;
  margin-bottom: 0.4em;
}

.lang-row:last-child {
  margin-bottom: 0;
}

.lang-name {
  overflow-wrap: break-word;
}

.lang-level {
  grid-column: 3;
  max-width: 8em;
  font-size: 0.88em;
  color: var(--muted);
  text-align: right;
  overflow-wrap: break-word;
}

/* ---- the main column ---- */

.main {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
  padding-right: 8mm;
}

.block + .block {
  margin-top: calc(var(--gap) * 1.5);
}

.title {
  margin: 0 0 0.7em;
  font-family: var(--titles);
  font-size: 1.3em;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.summary {
  margin: 0;
  color: var(--muted);
  white-space: pre-line;
  overflow-wrap: break-word;
}

/* A small ink square marks each entry. */
.square {
  flex: none;
  display: block;
  width: 0.55em;
  height: 0.55em;
  background: var(--ink);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.entry {
  display: flex;
  align-items: flex-start;
  gap: 0.75em;
  margin-bottom: calc(var(--gap) * 0.9);
}

.entry:last-child {
  margin-bottom: 0;
}

.entry > .square {
  margin-top: 0.4em;
}

.entry-body {
  flex: 1;
  min-width: 0;
}

.entry-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 1em;
}

.entry-title {
  margin: 0;
  font-size: 1.08em;
  font-style: italic;
  font-weight: 600;
  line-height: 1.25;
  /* A word longer than the column breaks instead of widening it (spec 074). */
  min-width: 0;
  overflow-wrap: break-word;
}

.entry-dates {
  margin: 0.1em 0 0;
  font-style: italic;
  color: var(--ink);
}

.entry-head .entry-dates {
  margin: 0;
}

.entry-meta {
  margin: 0.15em 0 0;
  font-size: 0.92em;
  color: var(--muted);
  overflow-wrap: break-word;
}

.entry-text {
  margin: 0.25em 0 0;
  font-size: 0.92em;
  color: var(--muted);
  overflow-wrap: break-word;
}

.highlights {
  margin: 0.25em 0 0;
  padding-left: 1.1em;
  font-size: 0.92em;
  color: var(--muted);
  overflow-wrap: break-word;
}

.highlights li {
  margin-bottom: 0.1em;
}

/* Education two by two. */
.pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  /* Wider than two of the titles' type sizes: a PDF import reads text closer than that as one line
     across both entries (spec 040), and the rows further apart than the lines of one entry. */
  column-gap: 2.4em;
  margin-bottom: calc(var(--gap) * 1.1);
  break-inside: avoid;
  page-break-inside: avoid;
}

.pair:last-child {
  margin-bottom: 0;
}

.pair .entry {
  margin-bottom: 0;
}

/* Skills in two columns: a circle with the initials, the name and its bar. */
.group + .group {
  margin-top: calc(var(--gap) * 0.8);
}

/* Set a little smaller than the skills under it: that is how a PDF import tells a group's name from a
   skill (as in Amber and Retro). */
.skill-category {
  margin: 0 0 0.45em;
  font-size: 0.9em;
  font-weight: 700;
  color: var(--muted);
  overflow-wrap: break-word;
}

.skills {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: 2.4em;
  row-gap: 0.5em;
  margin: 0;
  padding: 0;
  list-style: none;
}

.skill {
  display: flex;
  align-items: center;
  gap: 0.75em;
  min-width: 0;
}

.circle {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.3em;
  height: 2.3em;
  border-radius: 50%;
  font-size: 0.9em;
  font-weight: 600;
  line-height: 1;
  color: var(--cv-on-accent);
  background: var(--cv-accent);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.skill-body {
  flex: 1;
  min-width: 0;
}

.skill-name {
  display: block;
  overflow-wrap: break-word;
}

/* A pale track the whole way, the level a thick ink stroke over it. */
.bar {
  position: relative;
  display: block;
  height: 1mm;
  margin-top: 0.25em;
  background: #fff;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.lang-row .bar {
  margin-top: 0;
}

.bar-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background: var(--ink);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* Custom sections on a timeline: a thin rule, a square on it for each entry, the date beside it. */
.timeline {
  border-left: 0.3mm solid var(--ink);
  margin-left: 0.25em;
}

.tl-entry {
  position: relative;
  display: grid;
  grid-template-columns: 6.5em minmax(0, 1fr);
  column-gap: 0.9em;
  padding-left: 1.1em;
}

.tl-square {
  position: absolute;
  top: 0.4em;
  left: calc(-0.275em - 0.15mm);
}

.tl-date {
  grid-column: 1;
  margin: 0;
  font-style: italic;
  overflow-wrap: break-word;
}

.tl-body {
  grid-column: 2;
  min-width: 0;
}
</style>
