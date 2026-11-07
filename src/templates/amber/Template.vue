<script setup lang="ts">
/**
 * Amber — a charcoal side column on the left (photo in a drop frame, contact, education, languages)
 * and a main column (summary, experience, skills, custom sections) under a pale header band. A thin
 * timeline runs down each column: an accent bar marks every section title, a dot every entry.
 * The last word of the name and the corner triangles carry the accent (spec 071).
 *
 * The column stays charcoal whatever the accent: the accent only colours shapes and the name, whose
 * readable variant (`--cv-accent-text`) is used on the white page. Education lives in the side
 * column, as the user chose: if the column cannot fit page one, the preview warns (spec 033).
 *
 * `data.personal.photo` arrives as a renderable URL — the preview container resolves the
 * `photo:{id}` reference before handing the data over.
 */
import { computed } from 'vue'
import type { CVData } from '@/types/cv'
import Breakable from '@/templates/Breakable.vue'
import LevelDots from '@/templates/LevelDots.vue'
import { CONTACT_ICONS, FILLED_ICONS, contactKind, linkKind } from '@/templates/contactIcons'
import { splitName } from './name'
import {
  absoluteUrl,
  contactHeading,
  contactLines,
  displayUrl,
  formatDateRange,
  groupHasLevels,
  levelAccessibleLabel,
  resolveLanguages,
  resolveSections,
  skillNames,
  styleVars,
  type ResolvedSection,
} from '@/templates/shared'

const props = defineProps<{ data: CVData }>()

const vars = computed(() => styleVars(props.data.style))
const language = computed(() => props.data.meta.language || 'es')
const sections = computed(() => resolveSections(props.data))
const languages = computed(() => resolveLanguages(props.data))
const name = computed(() => splitName(props.data.personal.fullName))

const SIDE_KINDS = new Set(['education', 'languages'])
const sideSections = computed(() => sections.value.filter((s) => SIDE_KINDS.has(s.kind)))
const mainSections = computed(() => sections.value.filter((s) => !SIDE_KINDS.has(s.kind)))

const contactItems = computed(() =>
  contactLines(props.data).map((text) => ({ text, kind: contactKind(text, props.data.personal) })),
)
const contactTitle = computed(() => contactHeading(language.value))

/** Stroke paths (24 px grid) for the badge beside each section title; our own drawings. */
const SECTION_ICONS: Record<ResolvedSection['kind'] | 'contact', string> = {
  contact: CONTACT_ICONS.mail,
  summary: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
  experience: 'M3.5 8h17v11.5h-17zM8.5 8V5h7v3M3.5 13h17',
  education: 'M2 9.5l10-5 10 5-10 5zM6 11.5v5c3.5 2.2 8.5 2.2 12 0v-5',
  skills: 'M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z',
  languages: 'M4 5h16v11H10l-5 4v-4H4z',
  custom: 'M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z',
}
</script>

<template>
  <article class="amber" :class="{ 'amber--photo': data.personal.photo }" :style="vars">
    <header class="head">
      <svg class="corner" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,0 100,0 100,100" /></svg>
      <h1 v-if="name.lead" class="name">{{ name.lead }}<template v-if="name.last">{{ ' ' }}<span class="name-last">{{ name.last }}</span></template></h1>
      <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
    </header>

    <aside class="side" data-side>
      <svg v-if="data.personal.photo" class="side-corner" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,0 100,0 0,100" /></svg>
      <div v-if="data.personal.photo" class="photo-frame">
        <img class="photo" :src="data.personal.photo" alt="" />
      </div>

      <div class="rail">
        <section v-if="contactItems.length || data.personal.links.length" class="block">
          <h2 class="title">
            <span class="badge"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="SECTION_ICONS.contact" /></svg></span>
            {{ contactTitle }}
          </h2>
          <p v-for="(item, i) in contactItems" :key="i" class="contact">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="CONTACT_ICONS[item.kind]" /></svg>
            <span><Breakable :text="item.text" /></span>
          </p>
          <p v-for="link in data.personal.links" :key="link.id" class="contact">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="CONTACT_ICONS[linkKind(link.url)]" :class="{ filled: FILLED_ICONS.has(linkKind(link.url)) }" /></svg>
            <a :href="absoluteUrl(link.url)"><Breakable :text="link.label || displayUrl(link.url)" /></a>
          </p>
        </section>

        <section v-for="section in sideSections" :key="section.id" :data-section="section.kind" class="block">
          <h2 class="title">
            <span class="badge"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="SECTION_ICONS[section.kind]" /></svg></span>
            {{ section.title }}
          </h2>

          <template v-if="section.kind === 'education'">
            <div v-for="item in data.education" :key="item.id" class="entry">
              <h3 class="entry-title">{{ item.degree }}</h3>
              <p v-if="item.institution" class="side-meta side-meta--strong">{{ item.institution }}</p>
              <p class="side-meta">{{ formatDateRange(item.startDate, item.endDate, language) }}</p>
              <p v-if="item.description" class="side-meta">{{ item.description }}</p>
            </div>
          </template>

          <template v-else>
            <div v-for="lang in languages" :key="lang.id" class="level-row">
              <span class="level-name">{{ lang.name }}<template v-if="lang.level && lang.score === null"> — {{ lang.level }}</template></span>
              <LevelDots v-if="lang.score !== null" :score="lang.score" :label="lang.label" />
            </div>
          </template>
        </section>
      </div>
    </aside>

    <main class="main">
      <section v-for="section in mainSections" :key="section.id" :data-section="section.kind" :data-page-break="section.breakBefore" class="block">
        <h2 class="title">
          <span class="badge"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="SECTION_ICONS[section.kind]" /></svg></span>
          {{ section.title }}
        </h2>

        <p v-if="section.kind === 'summary'" class="summary">{{ data.summary }}</p>

        <template v-else-if="section.kind === 'experience'">
          <div v-for="item in data.experience" :key="item.id" class="entry">
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
        </template>

        <template v-else-if="section.kind === 'skills'">
          <div v-for="group in data.skills" :key="group.id" class="skill-group">
            <p v-if="group.category" class="skill-category">{{ group.category }}</p>
            <div v-if="groupHasLevels(group)" class="skill-grid">
              <div v-for="(item, i) in group.items" :key="i" class="level-row">
                <span class="level-name">{{ item.name }}</span>
                <LevelDots v-if="item.level" variant="bars" :score="item.level" :label="levelAccessibleLabel(item.level, language)" />
              </div>
            </div>
            <p v-else class="skill-items">{{ skillNames(group).join(' · ') }}</p>
          </div>
        </template>

        <template v-else-if="section.custom">
          <div v-for="entry in section.custom.entries" :key="entry.id" class="entry">
            <div class="entry-head">
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
.amber {
  position: relative;
  isolation: isolate;
  display: grid;
  /* minmax(0, …): a long word breaks inside the column instead of widening it (spec 074). */
  grid-template-columns: 36% minmax(0, 1fr);
  /* Header, then the side column, then the main one, in the markup: paged.js splits in DOM order, so
     the side column stays on page 1 and only the main column flows on (spec 032); the header comes
     first so text extraction reads the name before the contact details. */
  grid-template-rows: auto 1fr;
  font-family: var(--cv-font);
  font-size: calc(10pt * var(--cv-font-scale));
  line-height: 1.5;
  color: #1a1a1a;
  min-height: 100%;
  --gap: calc(1em * var(--cv-spacing-scale));
  --charcoal: #2b2b2e;
  --line: 0.12em;
}

/*
 * The side column's band, the full height of the sheet on every page (spec 033): paginated, the
 * column itself ends with its content and is only on page 1, but the band must repeat.
 */
.amber::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  width: 36%;
  height: 297mm;
  background: var(--charcoal);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* paged.js unsets ::before on continuation fragments; the band must repeat on every page. */
.amber[data-split-from]::before {
  content: '' !important;
}

/* Explicit tracks: a continuation page holding only one column must not move it to the other (spec 022). */
.head {
  position: relative;
  grid-column: 2;
  grid-row: 1;
  margin: calc(var(--cv-page-margin) * 0.6) 0 0 1.6em;
  padding: calc(var(--gap) * 1.6) var(--cv-page-margin) calc(var(--gap) * 1.6) 1.8em;
  border-left: var(--line) solid #444;
  background: color-mix(in srgb, #1a1a1a 7%, #fff);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.corner {
  position: absolute;
  top: 0;
  right: 0;
  width: 2.6em;
  height: 2.6em;
}

.corner polygon,
.side-corner polygon {
  fill: var(--cv-accent);
}

.name {
  margin: 0;
  font-size: 2.5em;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: 0.01em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.name-last {
  color: var(--cv-accent-text);
}

.headline {
  margin: 0.45em 0 0;
  color: #444;
  letter-spacing: 0.18em;
}

.side {
  position: relative;
  grid-column: 1;
  grid-row: 1 / span 2;
  padding: var(--cv-page-margin) calc(var(--cv-page-margin) * 0.6) var(--cv-page-margin) calc(var(--cv-page-margin) * 0.7);
  background: var(--charcoal);
  color: #fff;
  --dots-color: #fff;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* Without a photo there is no triangle to start the column: the accent runs along its top edge. */
.amber:not(.amber--photo) .side {
  border-top: 0.45em solid var(--cv-accent);
}

.side-corner {
  position: absolute;
  top: 0;
  left: 0;
  width: 75%;
  height: 11em;
}

/* A drop: a round photo in a white ring, with the ring's lower left corner squared by a white quarter. */
.photo-frame {
  position: relative;
  width: 62%;
  aspect-ratio: 1;
  margin: 0 auto calc(var(--gap) * 1.6);
}

.photo-frame::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 50%;
  height: 50%;
  background: #fff;
}

.photo {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: 0.35em solid #fff;
  border-radius: 50%;
  background: #fff;
}

/* The timeline: a thin line down each column; sections and entries hang from it. */
.rail {
  margin-left: 0.4em;
  padding-left: 1.4em;
  border-left: var(--line) solid #6b6b70;
  --pad: 1.4em;
}

.main {
  grid-column: 2;
  grid-row: 2;
  margin-left: 1.6em;
  padding: calc(var(--gap) * 1.8) var(--cv-page-margin) var(--cv-page-margin) 1.8em;
  border-left: var(--line) solid #444;
  --pad: 1.8em;
}

.block {
  position: relative;
  margin-bottom: calc(var(--gap) * 1.8);
}

.side .block {
  break-inside: avoid;
}

.block:last-child {
  margin-bottom: 0;
}

/* The accent bar on the line, level with the title. */
.block::before {
  content: '';
  position: absolute;
  top: 0.15em;
  left: calc(-1 * var(--pad) - 0.26em);
  width: 0.4em;
  height: 1.7em;
  border-radius: 0.2em;
  background: var(--cv-accent);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.title {
  display: flex;
  align-items: center;
  gap: 0.45em;
  margin: 0 0 0.75em;
  font-size: 1.3em;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.badge {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 1.3em;
  height: 1.3em;
  border-radius: 50%;
  background: var(--cv-accent);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.badge svg {
  width: 0.78em;
  height: 0.78em;
  fill: none;
  stroke: var(--cv-on-accent);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.contact {
  display: flex;
  align-items: flex-start;
  gap: 0.7em;
  margin: 0 0 0.6em;
  font-size: 0.92em;
  overflow-wrap: anywhere;
}

.contact a {
  color: inherit;
  text-decoration: none;
}

.icon {
  flex: none;
  width: 1.1em;
  height: 1.1em;
  margin-top: 0.15em;
  fill: none;
  stroke: #fff;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* A filled mark spans the whole 24-unit box; scaled to the 18 units the stroked icons take. */
.icon .filled {
  fill: #fff;
  stroke: none;
  transform: scale(0.78);
  transform-origin: center;
  transform-box: fill-box;
}

.entry {
  position: relative;
  margin-bottom: calc(var(--gap) * 1.1);
  break-inside: avoid;
  page-break-inside: avoid;
}

.entry:last-child {
  margin-bottom: 0;
}

/* The dot on the line, level with the entry's title. */
.entry::before {
  content: '';
  position: absolute;
  top: 0.4em;
  left: calc(-1 * var(--pad) - 0.335em);
  width: 0.55em;
  height: 0.55em;
  border-radius: 50%;
  background: var(--cv-accent);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.entry-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1em;
}

.entry-title {
  margin: 0;
  font-size: 1.05em;
  font-weight: 700;
  /* Beside the dates: a word longer than the line breaks, so it does not push them out (spec 074). */
  min-width: 0;
  overflow-wrap: break-word;
}

.entry-dates {
  flex: none;
  font-size: 0.9em;
  font-weight: 600;
}

.entry-meta {
  margin: 0.1em 0 0;
  font-style: italic;
  color: #444;
}

.entry-text {
  margin: 0.4em 0 0;
  color: #444;
}

.highlights {
  margin: 0.35em 0 0;
  padding-left: 1.2em;
  color: #444;
}

.highlights li {
  margin-bottom: 0.2em;
}

/* A word longer than the column breaks inside it: past the charcoal band, white text vanishes (spec 072). */
.side .entry {
  overflow-wrap: anywhere;
}

.side-meta {
  margin: 0.15em 0 0;
  font-size: 0.88em;
  color: #ccc;
}

.side-meta--strong {
  font-weight: 600;
  color: #fff;
}

.summary {
  margin: 0;
  color: #444;
}

.skill-group + .skill-group {
  margin-top: 0.8em;
}

/* Set a little smaller than the items under it: that is how a PDF import tells a group's name from a skill. */
.skill-category {
  margin: 0 0 0.3em;
  font-size: 0.9em;
  font-weight: 700;
}

.skill-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35em 1.6em;
}

.skill-items {
  margin: 0;
}

.level-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.1em 0.6em;
  margin-bottom: 0.35em;
}

.skill-grid .level-row {
  margin-bottom: 0;
}

/* `break-word`, not `anywhere`: the name must not shrink to a few letters before the marks wrap.
   `min-width: 0` lets a flex item narrower than its longest word, so that word breaks (spec 072). */
.level-name {
  min-width: 0;
  font-size: 0.92em;
  font-weight: 600;
  overflow-wrap: break-word;
}
</style>
