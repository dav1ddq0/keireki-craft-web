<script setup lang="ts">
/**
 * Monogram — a header in two tones: a square block cut by a diagonal, with a frame holding your
 * initials (or your photo), beside the name and the summary over a pale tint. Below, a pale sidebar
 * (contact, skills, languages) and the career in the main column, with education.
 *
 * The block's two tones, the tint and the sidebar are all derived from the accent, with the text
 * left in ink, so any accent stays legible. Education lives in the main column: paged.js drops
 * what follows a sidebar that overflows the page (see Cobalt).
 *
 * `data.personal.photo` arrives as a renderable URL — the preview container resolves the
 * `photo:{id}` reference before handing the data over.
 */
import { computed } from 'vue'
import type { CVData } from '@/types/cv'
import Breakable from '@/templates/Breakable.vue'
import LevelDots from '@/templates/LevelDots.vue'
import { CONTACT_ICONS, FILLED_ICONS, contactKind, linkKind } from '@/templates/contactIcons'
import { monogramLetters } from './initials'
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
  contactHeading,
} from '@/templates/shared'

const props = defineProps<{ data: CVData }>()

const vars = computed(() => styleVars(props.data.style))
const language = computed(() => props.data.meta.language || 'es')
const sections = computed(() => resolveSections(props.data))
const languages = computed(() => resolveLanguages(props.data))
const letters = computed(() => monogramLetters(props.data.personal.fullName))

/** More skills than this in one unnamed group go on a line instead of a bullet each. */
const MAX_BULLETS = 10

const SIDEBAR_KINDS = new Set(['skills', 'languages'])
const sidebarSections = computed(() => sections.value.filter((s) => SIDEBAR_KINDS.has(s.kind)))
const mainSections = computed(() => sections.value.filter((s) => !SIDEBAR_KINDS.has(s.kind) && s.kind !== 'summary'))
const summarySection = computed(() => sections.value.find((s) => s.kind === 'summary'))

const contactItems = computed(() =>
  contactLines(props.data).map((text) => ({ text, kind: contactKind(text, props.data.personal) })),
)
const contactTitle = computed(() => contactHeading(language.value))
</script>

<template>
  <article class="monogram" :style="vars">
    <header class="head">
      <div class="mark">
        <svg class="tone" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="100,0 100,100 0,100" /></svg>
        <img v-if="data.personal.photo" class="photo" :src="data.personal.photo" alt="" />
        <div v-else-if="letters[0]" class="frame" aria-hidden="true">
          <span class="letter letter--first">{{ letters[0] }}</span>
          <svg class="slash" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 100L100 0" /></svg>
          <span v-if="letters[1]" class="letter letter--last">{{ letters[1] }}</span>
        </div>
      </div>

      <div class="intro">
        <h1 class="name">{{ data.personal.fullName }}</h1>
        <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
        <section v-if="summarySection" data-section="summary" class="summary">
          <h2 class="summary-title">{{ summarySection.title }}</h2>
          <p class="summary-text">{{ data.summary }}</p>
        </section>
      </div>
    </header>

    <div class="body">
      <aside class="sidebar" data-side>
        <section v-if="contactItems.length || data.personal.links.length" class="side-section">
          <h2 class="section-title">{{ contactTitle }}</h2>
          <p v-for="(item, i) in contactItems" :key="i" class="contact">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="CONTACT_ICONS[item.kind]" /></svg>
            <span><Breakable :text="item.text" /></span>
          </p>
          <p v-for="link in data.personal.links" :key="link.id" class="contact">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="CONTACT_ICONS[linkKind(link.url)]" :class="{ filled: FILLED_ICONS.has(linkKind(link.url)) }" /></svg>
            <a :href="absoluteUrl(link.url)"><Breakable :text="link.label || displayUrl(link.url)" /></a>
          </p>
        </section>

        <section v-for="section in sidebarSections" :key="section.id" :data-section="section.kind" class="side-section">
          <h2 class="section-title">{{ section.title }}</h2>

          <template v-if="section.kind === 'skills'">
            <div v-for="group in data.skills" :key="group.id" class="skill-group">
              <p v-if="group.category" class="skill-category">{{ group.category }}</p>
              <template v-if="groupHasLevels(group)">
                <div v-for="(item, i) in group.items" :key="i" class="level-row">
                  <span>{{ item.name }}</span>
                  <LevelDots v-if="item.level" :score="item.level" :label="levelAccessibleLabel(item.level, language)" />
                </div>
              </template>
              <!-- A named group, or one too long for a column of bullets, reads as a line: the sidebar must not outgrow the page, which would push the career onto a later one. -->
              <p v-else-if="group.category || group.items.length > MAX_BULLETS" class="skill-items">{{ skillNames(group).join(' · ') }}</p>
              <ul v-else class="bullets">
                <li v-for="name in skillNames(group)" :key="name">{{ name }}</li>
              </ul>
            </div>
          </template>

          <template v-else>
            <div v-for="lang in languages" :key="lang.id" class="level-row">
              <span>{{ lang.name }}<template v-if="lang.level && lang.score === null"> — {{ lang.level }}</template></span>
              <LevelDots v-if="lang.score !== null" :score="lang.score" :label="lang.label" />
            </div>
          </template>
        </section>
      </aside>

      <main class="main">
        <section v-for="section in mainSections" :key="section.id" :data-section="section.kind" :data-page-break="section.breakBefore" class="section">
          <h2 class="section-title">{{ section.title }}</h2>

          <template v-if="section.kind === 'experience'">
            <div v-for="item in data.experience" :key="item.id" class="entry">
              <h3 class="entry-title">{{ item.position }}</h3>
              <p v-if="item.company || item.location" class="entry-meta">
                {{ item.company }}<template v-if="item.location"> · {{ item.location }}</template>
              </p>
              <p class="entry-meta">{{ formatDateRange(item.startDate, item.endDate, language) }}</p>
              <p v-if="item.description" class="entry-text">{{ item.description }}</p>
              <ul v-if="item.highlights.length" class="highlights">
                <li v-for="(highlight, i) in item.highlights" :key="i">{{ highlight }}</li>
              </ul>
            </div>
          </template>

          <template v-else-if="section.kind === 'education'">
            <div v-for="item in data.education" :key="item.id" class="entry">
              <h3 class="entry-title">{{ item.degree }}</h3>
              <p v-if="item.institution" class="entry-meta">{{ item.institution }}</p>
              <p class="entry-meta">{{ formatDateRange(item.startDate, item.endDate, language) }}</p>
              <p v-if="item.description" class="entry-text">{{ item.description }}</p>
            </div>
          </template>

          <template v-else-if="section.custom">
            <div v-for="entry in section.custom.entries" :key="entry.id" class="entry">
              <h3 class="entry-title">{{ entry.title }}</h3>
              <p v-if="entry.subtitle" class="entry-meta">{{ entry.subtitle }}</p>
              <p v-if="entry.date" class="entry-meta">{{ entry.date }}</p>
              <p v-if="entry.description" class="entry-text">{{ entry.description }}</p>
            </div>
          </template>
        </section>
      </main>
    </div>
  </article>
</template>

<style scoped>
.monogram {
  position: relative;
  isolation: isolate;
  font-family: var(--cv-font);
  font-size: calc(10pt * var(--cv-font-scale));
  line-height: 1.55;
  color: #1a1a1a;
  min-height: 100%;
  --gap: calc(1em * var(--cv-spacing-scale));
  --dark: color-mix(in srgb, var(--cv-accent) 78%, #000);
  --tint: color-mix(in srgb, var(--cv-accent) 15%, #fff);
}

/*
 * The sidebar's tint, the full height of the sheet on every page (spec 033): paginated, the sidebar
 * itself ends with its content and is only on page 1, but the band must repeat. Behind the content.
 */
.monogram::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  width: 37%;
  height: 297mm;
  background: var(--tint);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* paged.js unsets ::before on continuation fragments; the band must repeat on every page. */
.monogram[data-split-from]::before {
  content: '' !important;
}

.head {
  display: grid;
  grid-template-columns: 37% 1fr;
  background: var(--tint);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* A square: the diagonal splits it into a dark upper-left and a brighter lower-right (two solid shapes, not a gradient, so the direct PDF draws it too). */
.mark {
  position: relative;
  aspect-ratio: 1;
  background: var(--dark);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.tone {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.tone polygon {
  fill: var(--cv-accent);
}

.frame {
  position: absolute;
  inset: 20%;
  border: 0.22em solid #fff;
  font-size: 2.6em;
}

.letter {
  position: absolute;
  line-height: 1;
  color: #fff;
}

.letter--first {
  top: 0.22em;
  left: 0.3em;
}

.letter--last {
  right: 0.3em;
  bottom: 0.22em;
}

.slash {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.slash path {
  fill: none;
  stroke: #fff;
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

.photo {
  position: absolute;
  inset: 16%;
  width: 68%;
  height: 68%;
  object-fit: cover;
  border: 0.22em solid #fff;
  background: #fff;
}

.intro {
  align-self: center;
  padding: calc(var(--cv-page-margin) * 0.8) var(--cv-page-margin);
}

.name {
  margin: 0;
  font-size: 2.7em;
  font-weight: 600;
  line-height: 1.1;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.headline {
  margin: 0.4em 0 0;
  font-style: italic;
  color: #444;
}

.summary {
  margin-top: 0.9em;
  padding-top: 0.9em;
  border-top: 1px solid #1a1a1a;
}

.summary-title {
  margin: 0 0 0.35em;
  font-size: 0.85em;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.summary-text {
  margin: 0;
  font-size: 0.95em;
}

.body {
  display: grid;
  grid-template-columns: 37% 1fr;
}

/* Explicit columns: a continuation page holding only one of them must not move it to the other track (spec 022). */
.sidebar {
  grid-column: 1;
  background: var(--tint);
  padding: var(--cv-page-margin) calc(var(--cv-page-margin) * 0.5) var(--cv-page-margin) var(--cv-page-margin);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.main {
  grid-column: 2;
  padding: var(--cv-page-margin);
}

.side-section {
  margin-bottom: calc(var(--gap) * 1.4);
  padding-bottom: calc(var(--gap) * 1.2);
  border-bottom: 1px solid #1a1a1a;
  break-inside: avoid;
}

.side-section:last-child {
  border-bottom: 0;
}

.section {
  margin-bottom: calc(var(--gap) * 1.6);
}

.section-title {
  margin: 0 0 0.9em;
  font-size: 1.15em;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1.2;
}

.contact {
  display: flex;
  align-items: flex-start;
  gap: 0.8em;
  margin: 0 0 0.7em;
  overflow-wrap: anywhere;
}

.contact a {
  color: inherit;
  text-decoration: none;
}

.icon {
  flex: none;
  box-sizing: content-box;
  width: 0.95em;
  height: 0.95em;
  padding: 0.3em;
  background: var(--dark);
  fill: none;
  stroke: #fff;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* A filled mark spans the whole 24-unit box; scaled to the 18 units the stroked icons take. */
.icon .filled {
  fill: #fff;
  stroke: none;
  transform: scale(0.78);
  transform-origin: center;
  transform-box: fill-box;
}

.bullets {
  margin: 0;
  padding-left: 1.3em;
  list-style: disc;
}

.bullets li {
  margin-bottom: 0.3em;
}

.skill-group + .skill-group {
  margin-top: 0.8em;
}

/* Set a little smaller than the items under it: that is how a PDF import tells a group's name from a skill. */
.skill-category {
  margin: 0 0 0.2em;
  font-size: 0.9em;
  font-weight: 700;
}

.skill-items {
  margin: 0;
}

.level-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8em;
  margin-bottom: 0.35em;
}

.entry {
  margin-bottom: calc(var(--gap) * 1.1);
  break-inside: avoid;
  page-break-inside: avoid;
}

.entry:last-child {
  margin-bottom: 0;
}

.entry-title {
  margin: 0;
  font-size: 1em;
  font-weight: 700;
  font-style: italic;
}

.entry-meta {
  margin: 0.1em 0 0;
  color: #444;
}

.entry-text {
  margin: 0.5em 0 0;
}

.highlights {
  margin: 0.4em 0 0;
  padding-left: 1.2em;
}

.highlights li {
  margin-bottom: 0.25em;
}
</style>
