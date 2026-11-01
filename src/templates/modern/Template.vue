<script setup lang="ts">
/**
 * Modern — sidebar layout, the only built-in template that renders a photo.
 *
 * `data.personal.photo` arrives as a *renderable URL*: the preview container
 * resolves the `photo:{id}` IndexedDB reference into an object URL before
 * handing the data over, so the template stays free of storage concerns.
 */
import { computed } from 'vue'
import type { CVData } from '@/types/cv'
import Breakable from '@/templates/Breakable.vue'
import {
  absoluteUrl,
  displayUrl,
  formatDateRange,
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

/** Sections that read better narrow go to the sidebar; the rest stay in the main column. */
const SIDEBAR_KINDS = new Set(['skills', 'languages'])
const sidebarSections = computed(() => sections.value.filter((s) => SIDEBAR_KINDS.has(s.kind)))
const mainSections = computed(() => sections.value.filter((s) => !SIDEBAR_KINDS.has(s.kind)))

const contactItems = computed(() =>
  contactLines(props.data),
)
const contactTitle = computed(() => contactHeading(language.value))
</script>

<template>
  <article class="modern" :style="vars">
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
            <p class="side-item">{{ skillNames(group).join(', ') }}</p>
          </div>
        </template>

        <template v-else>
          <p v-for="lang in data.languages" :key="lang.id" class="side-item">
            {{ lang.name }}<template v-if="lang.level"> — {{ lang.level }}</template>
          </p>
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
.modern {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: 32% 1fr;
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
.modern::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  width: 32%;
  height: 297mm;
  background: var(--cv-accent);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* paged.js unsets ::before on continuation fragments (so text decorations do not repeat); the band
   must repeat on every page. */
.modern[data-split-from]::before {
  content: '' !important;
}

/* Explicit column: on a continuation page holding only this column, auto-placement would move it to the other track (spec 022). */
.sidebar {
  grid-column: 1;
  background: var(--cv-accent);
  color: #fff;
  padding: var(--cv-page-margin) calc(var(--cv-page-margin) * 0.7);
  /* The band must reach the paper edge on every printed page. */
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.photo {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 50%;
  margin-bottom: var(--gap);
  background: rgba(255, 255, 255, 0.2);
}

.side-section {
  margin-bottom: var(--gap);
  break-inside: avoid;
}

.side-title {
  font-size: 0.82em;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  margin: 0 0 0.5em;
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

.main {
  grid-column: 2;
  padding: var(--cv-page-margin);
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
  margin: 0 0 0.6em;
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
</style>
