<script setup lang="ts">
/**
 * Retro — the sheet sits in a frame in the accent whose lower part turns to ink (spec 080). A greeting
 * over a large slab-serif name, the headline in a black tab, the photo in a thick ink ring with an ink
 * triangle pointing at it from the frame, the contact in one row. The summary in a pale band across
 * the sheet; then the main column (experience, education in two columns, custom sections) and a pale
 * side column on the right where the skills (by group) and the languages hang under black tabs.
 *
 * The name and section titles are always Roboto Slab, the template's character; the font select sets
 * everything else. The frame, the sheet and the side band are pseudo-elements of the root, so they
 * repeat on every page (spec 033).
 *
 * `data.personal.photo` arrives as a renderable URL — the preview container resolves the
 * `photo:{id}` reference before handing the data over.
 */
import { computed } from 'vue'
import type { CVData } from '@/types/cv'
import Breakable from '@/templates/Breakable.vue'
import LevelDots from '@/templates/LevelDots.vue'
import { CONTACT_ICONS, FILLED_ICONS, contactKind, linkKind } from '@/templates/contactIcons'
import { greeting } from './greeting'
import {
  absoluteUrl,
  contactLines,
  displayUrl,
  formatDateRange,
  levelAccessibleLabel,
  resolveLanguages,
  resolveSections,
  styleVars,
} from '@/templates/shared'

const props = defineProps<{ data: CVData }>()

const vars = computed(() => styleVars(props.data.style))
const language = computed(() => props.data.meta.language || 'es')
const sections = computed(() => resolveSections(props.data))
const languages = computed(() => resolveLanguages(props.data))
const fullName = computed(() => props.data.personal.fullName.trim())

/** The summary goes in the band under the header; skills and languages in the side column. */
const SIDE_KINDS = new Set(['skills', 'languages'])
const summary = computed(() => sections.value.find((s) => s.kind === 'summary'))
const sideSections = computed(() => sections.value.filter((s) => SIDE_KINDS.has(s.kind)))
const mainSections = computed(() => sections.value.filter((s) => s.kind !== 'summary' && !SIDE_KINDS.has(s.kind)))

const contactItems = computed(() =>
  contactLines(props.data).map((text) => ({ text, kind: contactKind(text, props.data.personal) })),
)

const CHEVRON = 'M9 5l7 7-7 7'
</script>

<template>
  <article class="retro" :class="{ 'retro--photo': data.personal.photo }" :style="vars">
    <header class="head">
      <svg class="zigzag" viewBox="0 0 10 40" aria-hidden="true"><polyline points="6,0 2,10 8,20 2,30 6,40" /></svg>
      <div class="identity">
        <p v-if="fullName" class="greeting">{{ greeting(language) }}</p>
        <h1 v-if="fullName" class="name">{{ fullName }}</h1>
        <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
      </div>
      <div v-if="data.personal.photo" class="photo-ring">
        <img class="photo" :src="data.personal.photo" alt="" />
      </div>
      <svg v-if="data.personal.photo" class="pointer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="100,0 100,100 0,50" /></svg>

      <div v-if="contactItems.length || data.personal.links.length" class="contacts">
        <p v-for="(item, i) in contactItems" :key="i" class="contact">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="CONTACT_ICONS[item.kind]" /></svg>
          <span><Breakable :text="item.text" /></span>
        </p>
        <p v-for="link in data.personal.links" :key="link.id" class="contact">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="CONTACT_ICONS[linkKind(link.url)]" :class="{ filled: FILLED_ICONS.has(linkKind(link.url)) }" /></svg>
          <a :href="absoluteUrl(link.url)"><Breakable :text="link.label || displayUrl(link.url)" /></a>
        </p>
      </div>
    </header>

    <section v-if="summary" class="band" data-section="summary">
      <svg class="notch" viewBox="0 0 24 12" aria-hidden="true"><polygon points="0,0 24,0 12,11" /><polyline points="0,0.5 12,11 24,0.5" /></svg>
      <h2 class="band-title">{{ summary.title }}</h2>
      <p class="summary">{{ data.summary }}</p>
    </section>

    <aside class="side" data-side>
      <section v-for="section in sideSections" :key="section.id" :data-section="section.kind" class="side-block">
        <h2 class="tab">
          <span class="tab-text">{{ section.title }}</span>
          <svg class="tab-point" viewBox="0 0 20 10" aria-hidden="true"><polygon points="0,0 20,0 10,10" /></svg>
        </h2>

        <template v-if="section.kind === 'skills'">
          <div v-for="group in data.skills" :key="group.id" class="side-group">
            <p v-if="group.category" class="skill-category">{{ group.category }}</p>
            <ul class="bullets">
              <li v-for="(item, i) in group.items" :key="i" class="bullet">
                <span class="bullet-name">{{ item.name }}</span>
                <LevelDots v-if="item.level" :score="item.level" :label="levelAccessibleLabel(item.level, language)" />
              </li>
            </ul>
          </div>
        </template>

        <template v-else>
          <ul class="bullets">
            <li v-for="lang in languages" :key="lang.id" class="bullet">
              <span class="bullet-name">{{ lang.name }}</span>
              <span v-if="lang.level" class="bullet-level"> ({{ lang.level }})</span>
            </li>
          </ul>
        </template>
      </section>
    </aside>

    <main class="main">
      <section v-for="section in mainSections" :key="section.id" :data-section="section.kind" :data-page-break="section.breakBefore" class="block">
        <h2 class="title">{{ section.title }}</h2>

        <template v-if="section.kind === 'experience'">
          <div v-for="item in data.experience" :key="item.id" class="entry">
            <div class="entry-head">
              <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path :d="CHEVRON" /></svg>
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
        </template>

        <div v-else-if="section.kind === 'education'" class="schools">
          <div v-for="item in data.education" :key="item.id" class="entry school">
            <div class="entry-head">
              <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path :d="CHEVRON" /></svg>
              <h3 class="entry-title">{{ item.degree }}</h3>
            </div>
            <p v-if="item.institution" class="school-meta">{{ item.institution }}</p>
            <p class="school-meta school-dates">{{ formatDateRange(item.startDate, item.endDate, language) }}</p>
            <p v-if="item.description" class="entry-text school-text">{{ item.description }}</p>
          </div>
        </div>

        <template v-else-if="section.custom">
          <div v-for="entry in section.custom.entries" :key="entry.id" class="entry">
            <div class="entry-head">
              <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path :d="CHEVRON" /></svg>
              <h3 class="entry-title">{{ entry.title }}</h3>
              <span v-if="entry.date" class="entry-dates">{{ entry.date }}</span>
            </div>
            <p v-if="entry.subtitle" class="entry-meta">{{ entry.subtitle }}</p>
            <p v-if="entry.description" class="entry-text">{{ entry.description }}</p>
          </div>
        </template>
      </section>
    </main>
  </article>
</template>

<style scoped>
.retro {
  position: relative;
  isolation: isolate;
  display: grid;
  /* minmax(0, …): a long word breaks inside the column instead of widening it (spec 074). */
  grid-template-columns: minmax(0, 1fr) var(--side);
  /* Header, band, then the side column before the main one in the markup: paged.js splits in DOM
     order, so the side column stays on page 1 and only the main column flows on (spec 032). */
  grid-template-rows: auto auto 1fr;
  box-sizing: border-box;
  padding: var(--frame) var(--frame) var(--frame-foot);
  font-family: var(--cv-font);
  font-size: calc(10pt * var(--cv-font-scale));
  line-height: 1.4;
  color: #1a1a1a;
  min-height: 100%;
  /* The frame's ink part is a shadow that runs past the page's foot; unpaginated (the live preview),
     nothing else cuts it, so the root does. Paginated, see below. */
  overflow: clip;
  --gap: calc(1em * var(--cv-spacing-scale));
  --ink: #111;
  --muted: #555;
  --slab: 'Roboto Slab', Rockwell, Georgia, serif;
  --frame: 9mm;
  --frame-foot: 9mm;
  --ring: 40mm;
  /* How far the ring rises over the sheet's top edge. */
  --ring-rise: 2.5mm;
  --side: 53mm;
  --inset: calc(var(--cv-page-margin) * 0.55);
  --band: color-mix(in srgb, var(--cv-accent) 18%, #fff);
  --side-bg: color-mix(in srgb, var(--cv-accent) 34%, #fff);
}

/*
 * The white sheet, the side column's band (its right border) and the frame around it, in one box so
 * that it repeats on every page and the direct PDF, which paints in document order, draws it before
 * the text (spec 031). The frame is three solid shadows of the sheet: a thin ink line, the ink lower
 * part (the sheet moved down until its top reaches the 70 % line, spread over the frame's sides) and
 * the accent all round. Past the page's edge they are cut off: by the page when paginated, by
 * the root's `overflow: clip` in the live preview.
 */
.retro::before {
  content: '';
  position: absolute;
  top: var(--frame);
  left: var(--frame);
  z-index: -1;
  box-sizing: border-box;
  width: calc(210mm - 2 * var(--frame));
  height: calc(297mm - var(--frame) - var(--frame-foot));
  border-right: var(--side) solid var(--side-bg);
  background: #fff;
  box-shadow:
    0 0 0 0.3mm var(--ink),
    0 208mm 0 var(--frame) var(--ink),
    0 0 0 var(--frame-foot) var(--cv-accent);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* Paginated (print, direct PDF, paged view), the page's edge cuts the frame; a fragment can be shorter
   than its page, and clipping it there would cut the frame short. */
.cv-page--paged .retro {
  overflow: visible;
}

/* paged.js unsets ::before and the top padding on a fragment that continues from the last page; the
   sheet must be on every page, and the text must start inside it. */
.retro[data-split-from]::before {
  content: '' !important;
}

.retro[data-split-from] {
  padding-top: calc(var(--frame) + var(--inset)) !important;
}

/* Explicit tracks: a continuation page holding only one column must not move it to the other (spec 022). */
.head {
  position: relative;
  grid-column: 1 / -1;
  grid-row: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 1.6em;
  padding: var(--inset) var(--inset) 0;
  background: #fff;
}

.zigzag {
  position: absolute;
  top: -0.9em;
  left: 26%;
  width: 0.7em;
  height: 2.6em;
  fill: none;
  stroke: var(--ink);
  stroke-width: 1.4;
  stroke-linejoin: miter;
}

.identity {
  min-width: 0;
}

.greeting {
  margin: 0;
  font-size: 1.35em;
  line-height: 1.2;
}

.name {
  margin: 0;
  font-family: var(--slab);
  font-size: 2.9em;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.01em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.headline {
  justify-self: start;
  width: fit-content;
  max-width: 100%;
  box-sizing: border-box;
  margin: 0.55em 0 0;
  padding: 0.15em 1.2em;
  font-size: 1.15em;
  font-weight: 700;
  line-height: 1.3;
  color: #fff;
  background: var(--ink);
  overflow-wrap: anywhere;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* The ring rides a little over the sheet's top edge, onto the frame. */
.photo-ring {
  align-self: start;
  width: var(--ring);
  aspect-ratio: 1;
  margin-top: calc(-1 * var(--inset) - var(--ring-rise));
}

.photo {
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: 2.8mm solid var(--ink);
  border-radius: 50%;
  background: #fff;
}

/* The triangle on the frame pointing at the photo: its base on the sheet's outer edge. */
.pointer {
  position: absolute;
  /* Half as tall as the ring, level with its centre; its base on the page's edge, its tip 2 mm short of the ring. */
  top: calc(var(--ring) / 4 - var(--ring-rise));
  right: calc(-1 * var(--frame));
  width: calc(var(--frame) + var(--inset) - 2mm);
  height: calc(var(--ring) / 2);
}

.pointer polygon {
  fill: var(--ink);
}

.contacts {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.4em 1.4em;
  margin-top: calc(var(--gap) * 0.7);
  padding-bottom: calc(var(--gap) * 0.7);
}

.contact {
  display: flex;
  align-items: center;
  gap: 0.5em;
  min-width: 0;
  margin: 0;
  font-size: 0.92em;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.contact a {
  color: inherit;
  text-decoration: none;
}

.icon {
  flex: none;
  width: 1.25em;
  height: 1.25em;
  fill: none;
  stroke: var(--ink);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* A filled mark spans the whole 24-unit box; scaled to the 18 units the stroked icons take. */
.icon .filled {
  fill: var(--ink);
  stroke: none;
  transform: scale(0.78);
  transform-origin: center;
  transform-box: fill-box;
}

/* The summary band, under a thin ink rule with a notch. */
.band {
  position: relative;
  grid-column: 1 / -1;
  grid-row: 2;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  column-gap: 1.6em;
  padding: var(--gap) calc(var(--inset) * 1.5) var(--gap) calc(var(--inset) * 1.5);
  background: var(--band);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* The rule over the band, from margin to margin. */
.band::before {
  content: '';
  position: absolute;
  top: 0;
  left: var(--inset);
  right: var(--inset);
  border-top: 0.3mm solid var(--ink);
}

.notch {
  position: absolute;
  top: -0.3mm;
  left: calc(var(--inset) + 12%);
  width: 2.4em;
  height: 1.2em;
}

.notch polygon {
  fill: var(--band);
}

.notch polyline {
  fill: none;
  stroke: var(--ink);
  stroke-width: 0.9;
}

.band-title {
  margin: 0;
  padding-right: 0.6em;
  border-right: 0.25em solid var(--ink);
  font-family: var(--slab);
  max-width: 9em;
  font-size: 2.1em;
  font-weight: 700;
  line-height: 1;
  text-align: right;
  text-wrap: balance;
  overflow-wrap: break-word;
}

.summary {
  margin: 0;
  color: var(--muted);
}

.side {
  grid-column: 2;
  grid-row: 3;
  padding: calc(var(--gap) * 1.2) var(--inset) var(--inset);
  --dots-color: var(--ink);
}

.side-block + .side-block {
  margin-top: calc(var(--gap) * 1.4);
}

.side-group + .side-group {
  margin-top: calc(var(--gap) * 0.8);
}

/* Set a little smaller than the skills under it: that is how a PDF import tells a group's name from a
   skill (as in Amber). */
.skill-category {
  margin: 0 0 0.3em;
  font-size: 0.9em;
  font-weight: 700;
  color: var(--muted);
  overflow-wrap: break-word;
}

.side-block,
.side-group {
  break-inside: avoid;
}

.tab {
  position: relative;
  margin: 0 0 0.8em;
  padding: 0.15em 0.6em;
  font-family: var(--slab);
  font-size: 1.25em;
  font-weight: 400;
  line-height: 1.3;
  text-align: center;
  color: #fff;
  background: var(--ink);
  overflow-wrap: anywhere;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.tab-point {
  position: absolute;
  bottom: -0.45em;
  left: calc(50% - 0.45em);
  width: 0.9em;
  height: 0.45em;
}

.tab-point polygon {
  fill: var(--ink);
}

.bullets {
  margin: 0;
  padding: 0 0 0 1.4em;
}

.bullet {
  margin-bottom: 0.25em;
  overflow-wrap: break-word;
}

.bullet::marker {
  font-size: 1.1em;
}

.bullet:last-child {
  margin-bottom: 0;
}

.bullet-name {
  margin-right: 0.5em;
  font-weight: 700;
}

.bullet-level {
  color: var(--muted);
}

.main {
  grid-column: 1;
  grid-row: 3;
  padding: var(--gap) calc(var(--inset) * 0.9) var(--inset) var(--inset);
}

.block {
  margin-bottom: calc(var(--gap) * 0.8);
  padding-bottom: calc(var(--gap) * 0.8);
  border-bottom: 0.3mm solid var(--ink);
}

.block:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.title {
  margin: 0 0 0.4em;
  font-family: var(--slab);
  font-size: 1.55em;
  font-weight: 700;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.entry {
  margin-bottom: calc(var(--gap) * 0.75);
  break-inside: avoid;
  page-break-inside: avoid;
}

.entry:last-child {
  margin-bottom: 0;
}

.entry-head {
  display: flex;
  align-items: baseline;
  gap: 0.6em;
}

.chevron {
  flex: none;
  align-self: center;
  width: 1em;
  height: 1em;
  fill: none;
  stroke: var(--ink);
  stroke-width: 3.2;
  stroke-linecap: square;
}

.entry-title {
  flex: 1;
  margin: 0;
  font-size: 1.08em;
  font-weight: 700;
  /* Beside the dates: a word longer than the line breaks, so it does not push them out (spec 074). */
  min-width: 0;
  overflow-wrap: break-word;
}

.entry-dates {
  flex: none;
  font-size: 0.98em;
  font-weight: 700;
}

.entry-meta {
  margin: 0.15em 0 0 1.6em;
  font-size: 0.92em;
  font-weight: 600;
}

.entry-text {
  margin: 0.25em 0 0 1.6em;
  color: var(--muted);
}

.highlights {
  margin: 0.3em 0 0 1.6em;
  padding-left: 1.2em;
  color: var(--muted);
}

.highlights li {
  margin-bottom: 0.2em;
}

/* Education in two columns, a dotted line between them. */
.schools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: calc(var(--gap) * 1.2) 0;
}

.school:nth-child(odd) {
  padding-right: 1.2em;
}

.school:nth-child(even) {
  padding-left: 1.2em;
  border-left: 0.35mm dotted var(--ink);
}

.school .entry-title {
  font-size: 1.05em;
}

.school-meta {
  margin: 0.1em 0 0 1.6em;
  font-size: 0.9em;
  font-weight: 600;
}

.school-dates {
  margin-top: 0;
  font-weight: 400;
  color: var(--muted);
}

.school-text {
  font-size: 0.92em;
}
</style>
