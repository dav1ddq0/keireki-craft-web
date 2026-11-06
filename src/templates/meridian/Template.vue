<script setup lang="ts">
/**
 * Meridian — accent-coloured sidebar (photo, contact, languages with level dots,
 * skills) and a main column whose Experience and Education run along a timeline.
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

const SIDEBAR_KINDS = new Set(['skills', 'languages'])
const sidebarSections = computed(() => sections.value.filter((s) => SIDEBAR_KINDS.has(s.kind)))
const mainSections = computed(() => sections.value.filter((s) => !SIDEBAR_KINDS.has(s.kind)))

const contactItems = computed(() =>
  contactLines(props.data),
)
const contactTitle = computed(() => contactHeading(language.value))

const languages = computed(() => resolveLanguages(props.data))
</script>

<template>
  <article class="meridian" :style="vars">
    <aside class="sidebar" data-side>
      <img v-if="data.personal.photo" class="photo" :src="data.personal.photo" alt="" />

      <section v-if="contactItems.length || data.personal.links.length" class="side-section">
        <h2 class="side-title">{{ contactTitle }}</h2>
        <p v-for="(item, i) in contactItems" :key="i" class="side-item"><Breakable :text="item" /></p>
        <p v-for="link in data.personal.links" :key="link.id" class="side-item">
          <a :href="absoluteUrl(link.url)"><Breakable :text="link.label || displayUrl(link.url)" /></a>
        </p>
      </section>

      <section v-for="section in sidebarSections" :key="section.id" :data-section="section.kind" class="side-section">
        <h2 class="side-title">{{ section.title }}</h2>

        <template v-if="section.kind === 'skills'">
          <div v-for="group in data.skills" :key="group.id" class="side-group">
            <p v-if="group.category" class="side-group-title">{{ group.category }}</p>
            <template v-if="groupHasLevels(group)">
              <div v-for="(item, i) in group.items" :key="i" class="lang">
                <p class="side-item lang-name">{{ item.name }}</p>
                <LevelDots variant="bars"
                  v-if="item.level"
                  :score="item.level"
                  :label="levelAccessibleLabel(item.level, language)"
                />
              </div>
            </template>
            <p v-else class="side-item">{{ skillNames(group).join(', ') }}</p>
          </div>
        </template>

        <template v-else>
          <div v-for="lang in languages" :key="lang.id" class="lang">
            <p class="side-item lang-name">
              {{ lang.name }}<template v-if="lang.level && lang.score === null"> — {{ lang.level }}</template>
            </p>
            <LevelDots variant="bars" v-if="lang.score !== null" :score="lang.score" :label="lang.label" />
          </div>
        </template>
      </section>
    </aside>

    <main class="main">
      <header class="head">
        <h1 class="name">{{ data.personal.fullName }}</h1>
        <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
      </header>

      <section v-for="section in mainSections" :key="section.id" :data-section="section.kind" :data-page-break="section.breakBefore" class="section">
        <h2 class="section-title">{{ section.title }}</h2>

        <p v-if="section.kind === 'summary'" class="summary">{{ data.summary }}</p>

        <div v-else-if="section.kind === 'experience'" class="timeline">
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
        </div>

        <div v-else-if="section.kind === 'education'" class="timeline">
          <div v-for="item in data.education" :key="item.id" class="entry">
            <h3 class="entry-title">{{ item.degree }}</h3>
            <p class="entry-meta">
              <span v-if="item.institution" class="company">{{ item.institution }}</span>
              <span>{{ formatDateRange(item.startDate, item.endDate, language) }}</span>
            </p>
            <p v-if="item.description" class="entry-text">{{ item.description }}</p>
          </div>
        </div>

        <div v-else-if="section.custom" class="timeline">
          <div v-for="entry in section.custom.entries" :key="entry.id" class="entry">
            <h3 class="entry-title">{{ entry.title }}</h3>
            <p v-if="entry.subtitle || entry.date" class="entry-meta">
              <span v-if="entry.subtitle" class="company">{{ entry.subtitle }}</span>
              <span v-if="entry.date">{{ entry.date }}</span>
            </p>
            <p v-if="entry.description" class="entry-text">{{ entry.description }}</p>
          </div>
        </div>
      </section>
    </main>
  </article>
</template>

<style scoped>
.meridian {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: 31% 1fr;
  font-family: var(--cv-font);
  font-size: calc(10pt * var(--cv-font-scale));
  line-height: 1.45;
  color: #1a1a1a;
  min-height: 100%;
  --gap: calc(1em * var(--cv-spacing-scale));
}

/*
 * The sidebar's band, the full height of the sheet on every page (spec 033). Paginated, each page
 * starts this article's fragment at the top of the sheet, but the sidebar itself ends with its
 * content and is only on page 1. Behind the content; on screen it sits under the sidebar's own
 * background, which already reaches the bottom.
 */
.meridian::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  width: 31%;
  height: 297mm;
  background: var(--cv-accent);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* paged.js unsets ::before on continuation fragments (so text decorations do not repeat); the band
   must repeat on every page. */
.meridian[data-split-from]::before {
  content: '' !important;
}

/* Explicit column: on a continuation page holding only this column, auto-placement would move it to the other track (spec 022). */
.sidebar {
  /* A word longer than the column breaks inside it, and only where it cannot fit (spec 074). */
  overflow-wrap: break-word;
  grid-column: 1;
  background: var(--cv-accent);
  color: var(--cv-on-accent);
  padding: var(--cv-page-margin) calc(var(--cv-page-margin) * 0.7);
  --dots-color: var(--cv-on-accent);
  /* The band must reach the paper edge on every printed page. */
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.photo {
  display: block;
  width: 78%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 50%;
  margin: 0 auto var(--gap);
  border: 3px solid #fff;
  background: rgba(255, 255, 255, 0.2);
}

.side-section {
  margin-bottom: var(--gap);
  break-inside: avoid;
}

.side-title {
  font-size: 0.82em;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  margin: 0 0 0.55em;
}

.side-item {
  margin: 0 0 0.3em;
  font-size: 0.9em;
  overflow-wrap: anywhere;
}

.side-item a {
  color: inherit;
  text-decoration: none;
}

.side-group + .side-group {
  margin-top: 0.5em;
}

.side-group-title {
  margin: 0 0 0.1em;
  font-weight: 650;
  font-size: 0.88em;
  opacity: 0.85;
}

.lang {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.1em 0.6em;
  margin-bottom: 0.35em;
}

/* `overflow-wrap: anywhere` (from .side-item) would let the name shrink to a few letters
   before the level marks wrapped below it; break-word only breaks a word that cannot fit, and
   `min-width: 0` lets it be narrower than that word, so the word breaks (spec 074). */
.lang-name {
  min-width: 0;
  margin: 0;
  overflow-wrap: break-word;
}

.main {
  grid-column: 2;
  padding: var(--cv-page-margin);
}

.name {
  font-size: 2.2em;
  font-weight: 700;
  letter-spacing: -0.015em;
  margin: 0;
}

.headline {
  margin: 0.15em 0 0;
  font-size: 1.05em;
  color: var(--cv-accent-text);
  font-weight: 600;
}

.section {
  margin-top: calc(var(--gap) * 1.2);
}

.section-title {
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  color: var(--cv-accent-text);
  margin: 0 0 0.7em;
  padding-bottom: 0.35em;
  border-bottom: 1px solid var(--cv-accent);
}

.summary {
  margin: 0;
}

/* Timeline: a rail on the left, one marker per entry. */
.timeline {
  position: relative;
  padding-left: 1.2em;
  border-left: 2px solid color-mix(in srgb, var(--cv-accent) 35%, transparent);
  margin-left: 0.3em;
}

.entry {
  position: relative;
  margin-bottom: calc(var(--gap) * 0.75);
  break-inside: avoid;
  page-break-inside: avoid;
}

.entry::before {
  content: '';
  position: absolute;
  left: calc(-1.2em - 1px - 0.3em);
  top: 0.35em;
  width: 0.6em;
  height: 0.6em;
  border-radius: 50%;
  background: var(--cv-accent);
  box-shadow: 0 0 0 0.2em #fff;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
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
</style>
