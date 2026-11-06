<script setup lang="ts">
/**
 * Facet — geometric corner shapes (a quarter circle and a triangle, inline SVG,
 * decorative and hidden from assistive technology) frame the top of the first page.
 * Name on the left, round photo on the right; main column on the left and, behind a
 * ruled divider, a side column with contact, summary, skills and languages.
 *
 * `data.personal.photo` arrives as a renderable URL, same as in `modern`.
 */
import { computed } from 'vue'
import type { CVData } from '@/types/cv'
import LevelDots from '@/templates/LevelDots.vue'
import Breakable from '@/templates/Breakable.vue'
import {
  absoluteUrl,
  displayUrl,
  formatDateRange,
  groupHasLevels,
  levelAccessibleLabel,
  resolveLanguages,
  resolveSections,
  skillNames,
  styleVars,
  contactLines,
  contactHeading,
} from '@/templates/shared'

const props = defineProps<{ data: CVData }>()

const vars = computed(() => styleVars(props.data.style))
const language = computed(() => props.data.meta.language || 'es')
const sections = computed(() => resolveSections(props.data))

const ASIDE_KINDS = new Set(['skills', 'languages'])
const contactTitle = computed(() => contactHeading(language.value))
const asideSections = computed(() => sections.value.filter((s) => ASIDE_KINDS.has(s.kind)))
const mainSections = computed(() => sections.value.filter((s) => !ASIDE_KINDS.has(s.kind)))

const contactItems = computed(() =>
  contactLines(props.data),
)

const languages = computed(() => resolveLanguages(props.data))
</script>

<template>
  <article class="facet" :style="vars">
    <header class="head">
      <svg class="corner tl" viewBox="0 0 100 100" aria-hidden="true"><path d="M0 0 H100 A100 100 0 0 1 0 100 Z" /></svg>
      <svg class="corner tr" viewBox="0 0 100 100" aria-hidden="true"><polygon points="0,0 100,0 100,100" /></svg>
      <img v-if="data.personal.photo" class="photo" :src="data.personal.photo" alt="" />
      <div class="titles">
        <h1 class="name">{{ data.personal.fullName }}</h1>
        <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
      </div>
    </header>

    <aside class="aside" data-side>
      <section v-if="contactItems.length || data.personal.links.length" class="section">
        <h2 class="section-title">{{ contactTitle }}</h2>
        <p v-for="(item, i) in contactItems" :key="i" class="contact-item"><Breakable :text="item" /></p>
        <p v-for="link in data.personal.links" :key="link.id" class="contact-item">
          <a :href="absoluteUrl(link.url)"><Breakable :text="link.label || displayUrl(link.url)" /></a>
        </p>
      </section>

      <section v-for="section in asideSections" :key="section.id" :data-section="section.kind" class="section">
        <h2 class="section-title">{{ section.title }}</h2>

        <template v-if="section.kind === 'skills'">
          <div v-for="group in data.skills" :key="group.id" class="skill-group">
            <p v-if="group.category" class="skill-category">{{ group.category }}</p>
            <template v-if="groupHasLevels(group)">
              <div v-for="(item, i) in group.items" :key="i" class="row">
                <span>{{ item.name }}</span>
                <LevelDots
                  v-if="item.level"
                  :score="item.level"
                  :label="levelAccessibleLabel(item.level, language)"
                />
              </div>
            </template>
            <p v-else class="skill-items">{{ skillNames(group).join(', ') }}</p>
          </div>
        </template>

        <template v-else>
          <div v-for="lang in languages" :key="lang.id" class="row">
            <span>
              {{ lang.name }}<template v-if="lang.level && lang.score === null"> — {{ lang.level }}</template>
            </span>
            <LevelDots v-if="lang.score !== null" :score="lang.score" :label="lang.label" />
          </div>
        </template>
      </section>
    </aside>

    <div class="main">
      <section v-for="section in mainSections" :key="section.id" :data-section="section.kind" :data-page-break="section.breakBefore" class="section">
        <h2 class="section-title">{{ section.title }}</h2>

        <p v-if="section.kind === 'summary'" class="summary">{{ data.summary }}</p>

        <template v-else-if="section.kind === 'experience'">
          <div v-for="item in data.experience" :key="item.id" class="entry">
            <h3 class="entry-title">{{ item.position }}</h3>
            <p class="entry-meta">
              <span v-if="item.company" class="company">{{ item.company }}</span>
              <span>{{ formatDateRange(item.startDate, item.endDate, language) }}</span>
              <span v-if="item.location">{{ item.location }}</span>
            </p>
            <p v-if="item.description" class="entry-text">{{ item.description }}</p>
            <ul v-if="item.highlights.length" class="highlights">
              <li v-for="(highlight, i) in item.highlights" :key="i">{{ highlight }}</li>
            </ul>
          </div>
        </template>

        <template v-else-if="section.kind === 'education'">
          <div v-for="item in data.education" :key="item.id" class="entry">
            <h3 class="entry-title">{{ item.degree }}</h3>
            <p class="entry-meta">
              <span v-if="item.institution" class="company">{{ item.institution }}</span>
              <span>{{ formatDateRange(item.startDate, item.endDate, language) }}</span>
            </p>
            <p v-if="item.description" class="entry-text">{{ item.description }}</p>
          </div>
        </template>

        <template v-else-if="section.custom">
          <div v-for="entry in section.custom.entries" :key="entry.id" class="entry">
            <h3 class="entry-title">{{ entry.title }}</h3>
            <p v-if="entry.subtitle || entry.date" class="entry-meta">
              <span v-if="entry.subtitle" class="company">{{ entry.subtitle }}</span>
              <span v-if="entry.date">{{ entry.date }}</span>
            </p>
            <p v-if="entry.description" class="entry-text">{{ entry.description }}</p>
          </div>
        </template>
      </section>
    </div>
  </article>
</template>

<style scoped>
.facet {
  display: grid;
  /* The side column comes first in the markup, so paged.js keeps it on page 1 (spec 032); dense
     packing puts the main column back in the free track beside it. */
  grid-auto-flow: row dense;
  grid-template-columns: 1fr 33%;
  align-content: start;
  font-family: var(--cv-font);
  font-size: calc(10pt * var(--cv-font-scale));
  line-height: 1.45;
  color: #1a1a1a;
  --gap: calc(1em * var(--cv-spacing-scale));
}

.head {
  position: relative;
  min-height: 11em;
  grid-column: 1 / -1;
  padding: 6.4em var(--cv-page-margin) 0;
  break-inside: avoid;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.corner {
  position: absolute;
  top: 0;
  display: block;
  fill: var(--cv-accent);
}

.corner.tl {
  left: 0;
  width: 7em;
  height: 7em;
}

.corner.tr {
  right: 0;
  width: 8em;
  height: 8em;
  opacity: 0.5;
}

.photo {
  position: absolute;
  top: 1.4em;
  right: calc(var(--cv-page-margin) + 0.6em);
  width: 6em;
  height: 6em;
  object-fit: cover;
  border-radius: 50%;
  border: 4px solid #fff;
  background: #d1d5db;
}

.name {
  font-size: 2.2em;
  font-weight: 700;
  line-height: 1.12;
  margin: 0;
}

.headline {
  margin: 0.2em 0 0;
  font-size: 1.1em;
  font-weight: 600;
  color: var(--cv-accent-text);
}

/* Explicit column: on a continuation page holding only this column, auto-placement would move it to the other track (spec 022). */
.main {
  grid-column: 1;
  padding: 0 calc(var(--cv-page-margin) * 0.7) var(--cv-page-margin) var(--cv-page-margin);
}

.aside {
  /* A word longer than the column breaks inside it, and only where it cannot fit (spec 074). */
  overflow-wrap: break-word;
  grid-column: 2;
  margin-right: var(--cv-page-margin);
  margin-bottom: var(--cv-page-margin);
  padding-left: calc(var(--cv-page-margin) * 0.7);
  border-left: 2px solid var(--cv-accent);
}

.section {
  margin-top: calc(var(--gap) * 1.1);
}

.section-title {
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  color: var(--cv-accent-text);
  margin: 0 0 0.55em;
}

.summary {
  margin: 0;
}

.entry {
  margin-bottom: calc(var(--gap) * 0.75);
  break-inside: avoid;
  page-break-inside: avoid;
}

.entry-title {
  font-size: 1.02em;
  font-weight: 650;
  margin: 0;
}

.entry-meta {
  margin: 0.1em 0 0;
  font-size: 0.86em;
  color: #666;
}

.entry-meta span + span::before {
  content: '·';
  margin: 0 0.45em;
}

.company {
  font-weight: 600;
  color: #444;
}

.entry-text {
  margin: 0.3em 0 0;
}

.highlights {
  margin: 0.35em 0 0;
  padding-left: 1.1em;
}

.contact-item {
  margin: 0 0 0.25em;
  font-size: 0.9em;
  overflow-wrap: anywhere;
}

.contact-item a {
  color: inherit;
  text-decoration: none;
}

.skill-group + .skill-group {
  margin-top: 0.5em;
}

.skill-category {
  margin: 0 0 0.1em;
  font-weight: 650;
  font-size: 0.9em;
}

.skill-items {
  margin: 0;
  font-size: 0.92em;
  overflow-wrap: anywhere;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6em;
  padding: 0.25em 0;
  font-size: 0.92em;
  break-inside: avoid;
}

/* The name gives way to its level marks: a flex item is otherwise as wide as its longest word (spec 074). */
.row > span:first-child {
  min-width: 0;
}
</style>
