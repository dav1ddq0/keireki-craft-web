<script setup lang="ts">
/**
 * Harbor — a dark neutral sidebar on the right (photo, contact, skills and
 * languages with star levels) and a main column with accent headings. The accent
 * stays out of the sidebar except for its top edge, so any accent colour keeps
 * enough contrast against the dark band.
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
  <article class="harbor" :style="vars">
    <header class="head">
      <h1 class="name">{{ data.personal.fullName }}</h1>
      <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
    </header>

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
                <LevelDots
                  v-if="item.level"
                  variant="stars"
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
            <LevelDots v-if="lang.score !== null" variant="stars" :score="lang.score" :label="lang.label" />
          </div>
        </template>
      </section>
    </aside>

    <main class="main">
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
    </main>
  </article>
</template>

<style scoped>
.harbor {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: 1fr 31%;
  /* Name, then the sidebar, then the main column, in the markup: paged.js splits in DOM order, so
     the sidebar stays on page 1 and only the main column flows on (spec 032). The name row comes
     first so text extraction still reads the name before the contact details. */
  grid-template-rows: auto 1fr;
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
.harbor::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  z-index: -1;
  width: 31%;
  height: 297mm;
  background: #1f2937;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* paged.js unsets ::before on continuation fragments (so text decorations do not repeat); the band
   must repeat on every page. */
.harbor[data-split-from]::before {
  content: '' !important;
}

.sidebar {
  grid-column: 2;
  grid-row: 1 / span 2;
  background: #1f2937;
  color: #fff;
  border-top: 0.45em solid var(--cv-accent);
  padding: var(--cv-page-margin) calc(var(--cv-page-margin) * 0.7);
  --dots-color: #fff;
  /* The band must reach the paper edge on every printed page. */
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.photo {
  display: block;
  width: 70%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 50%;
  margin: 0 auto var(--gap);
  background: rgba(255, 255, 255, 0.2);
}

.side-section {
  margin-bottom: var(--gap);
  break-inside: avoid;
}

.side-title {
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  margin: 0 0 0.55em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.35);
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
  margin-bottom: 0.3em;
}

/* `overflow-wrap: anywhere` (from .side-item) would let the name shrink to a few letters
   before the level marks wrapped below it; break-word only breaks a word that cannot fit. */
.lang-name {
  margin: 0;
  overflow-wrap: break-word;
}

/* Explicit column: on a continuation page holding only this column, auto-placement would move it to the other track (spec 022). */
.head {
  grid-column: 1;
  grid-row: 1;
  padding: var(--cv-page-margin) var(--cv-page-margin) 0;
}

.main {
  grid-column: 1;
  grid-row: 2;
  padding: 0 var(--cv-page-margin) var(--cv-page-margin);
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
  margin: 0 0 0.6em;
  padding-left: 0.6em;
  border-left: 0.3em solid var(--cv-accent);
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
