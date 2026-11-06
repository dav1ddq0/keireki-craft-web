<script setup lang="ts">
/**
 * Cobalt — a full-width tinted header carries a round photo and the name; below it a pale sidebar
 * (contact, skills, languages) and the career, with education, on the right. Section titles are heavy,
 * widely tracked capitals over a short accent rule.
 *
 * Header and sidebar are tints of the accent over paper, with the text left in ink, so legibility
 * does not depend on the accent the user picks. The photo overlaps the header's lower edge with a
 * ring in the header's tint. Without a photo the header is just the name, from the page margin.
 *
 * `data.personal.photo` arrives as a renderable URL — the preview container resolves the
 * `photo:{id}` reference before handing the data over.
 */
import { computed } from 'vue'
import type { CVData } from '@/types/cv'
import Breakable from '@/templates/Breakable.vue'
import LevelDots from '@/templates/LevelDots.vue'
import { CONTACT_ICONS, FILLED_ICONS, contactKind, linkKind } from '@/templates/contactIcons'
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

/** More skills than this in one unnamed group go on a line instead of a bullet each. */
const MAX_BULLETS = 10

const SIDEBAR_KINDS = new Set(['skills', 'languages'])
const sidebarSections = computed(() => sections.value.filter((s) => SIDEBAR_KINDS.has(s.kind)))
const mainSections = computed(() => sections.value.filter((s) => !SIDEBAR_KINDS.has(s.kind)))

const contactItems = computed(() =>
  contactLines(props.data).map((text) => ({ text, kind: contactKind(text, props.data.personal) })),
)
const contactTitle = computed(() => contactHeading(language.value))
</script>

<template>
  <article class="cobalt" :class="{ 'cobalt--photo': data.personal.photo }" :style="vars">
    <header class="head">
      <img v-if="data.personal.photo" class="photo" :src="data.personal.photo" alt="" />
      <div class="intro">
        <h1 class="name">{{ data.personal.fullName }}</h1>
        <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
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

          <p v-if="section.kind === 'summary'" class="summary">{{ data.summary }}</p>

          <ul v-else-if="section.kind === 'experience'" class="bullets bullets--entries">
            <li v-for="item in data.experience" :key="item.id" class="entry">
              <h3 class="entry-title">{{ item.position }}</h3>
              <p v-if="item.company || item.location" class="entry-meta">
                {{ item.company }}<template v-if="item.location"> · {{ item.location }}</template>
              </p>
              <p class="entry-meta">{{ formatDateRange(item.startDate, item.endDate, language) }}</p>
              <p v-if="item.description" class="entry-text">{{ item.description }}</p>
              <ul v-if="item.highlights.length" class="highlights">
                <li v-for="(highlight, i) in item.highlights" :key="i">{{ highlight }}</li>
              </ul>
            </li>
          </ul>

          <ul v-else-if="section.kind === 'education'" class="bullets bullets--entries">
            <li v-for="item in data.education" :key="item.id" class="entry">
              <h3 class="entry-title">{{ item.degree }}</h3>
              <p v-if="item.institution" class="entry-meta">{{ item.institution }}</p>
              <p class="entry-meta">{{ formatDateRange(item.startDate, item.endDate, language) }}</p>
              <p v-if="item.description" class="entry-text">{{ item.description }}</p>
            </li>
          </ul>

          <ul v-else-if="section.custom" class="bullets bullets--entries">
            <li v-for="entry in section.custom.entries" :key="entry.id" class="entry">
              <h3 class="entry-title">{{ entry.title }}</h3>
              <p v-if="entry.subtitle" class="entry-meta">{{ entry.subtitle }}</p>
              <p v-if="entry.date" class="entry-meta">{{ entry.date }}</p>
              <p v-if="entry.description" class="entry-text">{{ entry.description }}</p>
            </li>
          </ul>
        </section>
      </main>
    </div>
  </article>
</template>

<style scoped>
.cobalt {
  position: relative;
  isolation: isolate;
  font-family: var(--cv-font);
  font-size: calc(10pt * var(--cv-font-scale));
  line-height: 1.55;
  color: #1a1a1a;
  min-height: 100%;
  --gap: calc(1em * var(--cv-spacing-scale));
  --band: color-mix(in srgb, var(--cv-accent) 24%, #fff);
  --tint: color-mix(in srgb, var(--cv-accent) 8%, #fff);
}

/*
 * The sidebar's tint, the full height of the sheet on every page (spec 033): paginated, the sidebar
 * itself ends with its content and is only on page 1, but the band must repeat. Behind the content.
 */
.cobalt::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  width: 42%;
  height: 297mm;
  background: var(--tint);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* paged.js unsets ::before on continuation fragments; the band must repeat on every page. */
.cobalt[data-split-from]::before {
  content: '' !important;
}

.body {
  display: grid;
  grid-template-columns: 42% 1fr;
}

.head {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 42% 1fr;
  align-items: center;
  min-height: 46mm;
  background: var(--band);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.intro {
  grid-column: 2;
  padding: calc(var(--cv-page-margin) * 0.8) var(--cv-page-margin) calc(var(--cv-page-margin) * 0.8) 0;
}

.cobalt--photo .head {
  min-height: 68mm;
}

/* No photo: the name starts at the page margin, over the whole header. */
.cobalt:not(.cobalt--photo) .intro {
  grid-column: 1 / -1;
  padding-left: var(--cv-page-margin);
}

.photo {
  position: absolute;
  top: 12.5mm;
  left: 8%;
  width: 26%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 50%;
  /* The ring in the header's tint, which shows below the header's edge. */
  box-shadow: 0 0 0 1.3mm var(--band);
  background: #fff;
}

.name {
  margin: 0;
  font-size: 3.5em;
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.01em;
  color: var(--cv-accent-text);
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.headline {
  margin: 0.7em 0 0;
  font-size: 1.05em;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--cv-accent-text);
}

/* Explicit columns: a continuation page holding only one of them must not move it to the other track (spec 022). */
.sidebar {
  /* A word longer than the column breaks inside it, and only where it cannot fit (spec 074). */
  overflow-wrap: break-word;
  grid-column: 1;
  background: var(--tint);
  padding: calc(var(--cv-page-margin) * 0.9) calc(var(--cv-page-margin) * 0.75) var(--cv-page-margin) var(--cv-page-margin);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.main {
  grid-column: 2;
  padding: calc(var(--cv-page-margin) * 0.9) var(--cv-page-margin) var(--cv-page-margin) calc(var(--cv-page-margin) * 0.75);
}

.cobalt--photo .sidebar,
.cobalt--photo .main {
  padding-top: calc(var(--cv-page-margin) * 0.9 + 3mm);
}

.side-section {
  margin-bottom: calc(var(--gap) * 1.6);
  break-inside: avoid;
}

.section {
  margin-bottom: calc(var(--gap) * 1.6);
}

.section-title {
  margin: 0 0 1.3em;
  font-size: 1.25em;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  line-height: 1.2;
  color: var(--cv-accent-text);
}

/* The short rule under each title. */
.section-title::after {
  content: '';
  display: block;
  width: 4.5em;
  height: 0.22em;
  margin-top: 0.55em;
  background: var(--cv-accent);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.contact {
  display: flex;
  align-items: center;
  gap: 0.9em;
  margin: 0 0 0.9em;
  overflow-wrap: anywhere;
}

.contact a {
  color: inherit;
  text-decoration: none;
}

.icon {
  flex: none;
  box-sizing: content-box;
  width: 1.1em;
  height: 1.1em;
  padding: 0.5em;
  border-radius: 50%;
  background: var(--cv-accent);
  fill: none;
  stroke: var(--cv-on-accent);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* A filled mark spans the whole 24-unit box; scaled to the 18 units the stroked icons take. */
.icon .filled {
  fill: var(--cv-on-accent);
  stroke: none;
  transform: scale(0.78);
  transform-origin: center;
  transform-box: fill-box;
}

.bullets {
  margin: 0;
  padding-left: 1.5em;
  list-style: disc;
}

.bullets li {
  margin-bottom: 0.3em;
}

.bullets--entries > li {
  margin-bottom: calc(var(--gap) * 1.2);
  break-inside: avoid;
  page-break-inside: avoid;
}

.bullets--entries > li:last-child {
  margin-bottom: 0;
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

/* The name gives way to its level marks: a flex item is otherwise as wide as its longest word (spec 074). */
.level-row > span:first-child {
  min-width: 0;
}

.entry-title {
  margin: 0;
  font-size: 1em;
  font-weight: 700;
  color: #000;
}

.main .entry-title {
  text-transform: uppercase;
}

.entry-meta {
  margin: 0.15em 0 0;
}

.entry-text {
  margin: 0.8em 0 0;
}

.highlights {
  margin: 0.4em 0 0;
  padding-left: 1.1em;
}

.highlights li {
  margin-bottom: 0.18em;
}

.summary {
  margin: 0;
  text-align: justify;
}
</style>
