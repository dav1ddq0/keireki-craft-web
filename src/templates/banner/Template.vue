<script setup lang="ts">
/**
 * Banner — a rounded accent block carries name, headline, photo and contact;
 * below it, experience and education on the left, and summary, skills and
 * languages (with level dots) on the right.
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
} from '@/templates/shared'

const props = defineProps<{ data: CVData }>()

const vars = computed(() => styleVars(props.data.style))
const language = computed(() => props.data.meta.language || 'es')
const sections = computed(() => resolveSections(props.data))

const ASIDE_KINDS = new Set(['summary', 'skills', 'languages'])
const asideSections = computed(() => sections.value.filter((s) => ASIDE_KINDS.has(s.kind)))
const mainSections = computed(() => sections.value.filter((s) => !ASIDE_KINDS.has(s.kind)))

const contactItems = computed(() =>
  contactLines(props.data),
)

const languages = computed(() => resolveLanguages(props.data))
</script>

<template>
  <article class="banner" :style="vars">
    <header class="head">
      <img v-if="data.personal.photo" class="photo" :src="data.personal.photo" alt="" />
      <div class="head-text">
        <h1 class="name">{{ data.personal.fullName }}</h1>
        <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
      </div>
      <div v-if="contactItems.length || data.personal.links.length" class="contact">
        <p v-for="(item, i) in contactItems" :key="i"><Breakable :text="item" /></p>
        <p v-for="link in data.personal.links" :key="link.id">
          <a :href="absoluteUrl(link.url)"><Breakable :text="link.label || displayUrl(link.url)" /></a>
        </p>
      </div>
    </header>

    <aside class="aside" data-side>
      <section v-for="section in asideSections" :key="section.id" :data-section="section.kind" class="section">
        <h2 class="section-title">{{ section.title }}</h2>

        <p v-if="section.kind === 'summary'" class="summary">{{ data.summary }}</p>

        <template v-else-if="section.kind === 'skills'">
          <div v-for="group in data.skills" :key="group.id" class="skill-group">
            <p v-if="group.category" class="skill-category">{{ group.category }}</p>
            <template v-if="groupHasLevels(group)">
              <div v-for="(item, i) in group.items" :key="i" class="lang">
                <span class="lang-name">{{ item.name }}</span>
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
          <div v-for="lang in languages" :key="lang.id" class="lang">
            <span class="lang-name">
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

        <template v-if="section.kind === 'experience'">
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
.banner {
  display: grid;
  /* The side column comes first in the markup, so paged.js keeps it on page 1 (spec 032); dense
     packing puts the main column back in the free track beside it. */
  grid-auto-flow: row dense;
  grid-template-columns: 1fr 34%;
  align-content: start;
  column-gap: calc(var(--cv-page-margin) * 0.8);
  font-family: var(--cv-font);
  font-size: calc(10pt * var(--cv-font-scale));
  line-height: 1.45;
  color: #1a1a1a;
  padding: calc(var(--cv-page-margin) * 0.6);
  --gap: calc(1em * var(--cv-spacing-scale));
}

.head {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 1.2em;
  padding: calc(var(--cv-page-margin) * 0.7) var(--cv-page-margin);
  border-radius: 1.4em;
  background: var(--cv-accent);
  color: var(--cv-on-accent);
  break-inside: avoid;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.photo {
  width: 5.2em;
  height: 5.2em;
  flex: none;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid #fff;
  background: rgba(255, 255, 255, 0.2);
}

.head-text {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 2.1em;
  font-weight: 700;
  letter-spacing: -0.015em;
  margin: 0;
}

.headline {
  margin: 0.15em 0 0;
  font-size: 1.05em;
  opacity: 0.9;
}

.contact {
  font-size: 0.88em;
  text-align: right;
  overflow-wrap: anywhere;
}

.contact p {
  margin: 0 0 0.25em;
}

.contact a {
  color: inherit;
  text-decoration: none;
}

.main,
.aside {
  /* A word longer than the column breaks inside it, and only where it cannot fit (spec 074). */
  overflow-wrap: break-word;
  padding-top: calc(var(--cv-page-margin) * 0.5);
}

/* Explicit column: on a continuation page holding only this column, auto-placement would move it to the other track (spec 022). */
.main {
  grid-column: 1;
  padding-left: calc(var(--cv-page-margin) * 0.4);
}

.aside {
  grid-column: 2;
  padding-right: calc(var(--cv-page-margin) * 0.4);
}

.section {
  margin-top: calc(var(--gap) * 1.1);
}

.section-title {
  font-size: 1.1em;
  font-weight: 700;
  margin: 0 0 0.55em;
  padding-bottom: 0.3em;
  border-bottom: 1px dashed var(--cv-accent);
}

.summary {
  margin: 0;
  color: #555;
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
  color: var(--cv-accent-text);
}

.entry-text {
  margin: 0.3em 0 0;
}

.highlights {
  margin: 0.35em 0 0;
  padding-left: 1.1em;
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

.lang {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6em;
  padding: 0.3em 0;
  border-bottom: 1px dashed #d1d5db;
  break-inside: avoid;
}

/* It gives way to its level marks: a flex item is otherwise as wide as its longest word (spec 074). */
.lang-name {
  min-width: 0;
  font-size: 0.92em;
}
</style>
