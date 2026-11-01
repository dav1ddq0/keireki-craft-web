<script setup lang="ts">
/**
 * Aurora — two columns with a *tinted* sidebar rather than a saturated one.
 *
 * The band is the accent at ~8% over paper, with body text left in ink. That is
 * deliberate: Modern paints white on a user-chosen accent, so a pale accent
 * makes the contact column unreadable with no warning. Here legibility does not
 * depend on which color the user picks, and the page costs a fraction of the
 * toner.
 *
 * `data.personal.photo` arrives as a renderable URL — the preview container
 * resolves the `photo:{id}` reference before handing the data over.
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

const SIDEBAR_KINDS = new Set(['skills', 'languages'])
const sidebarSections = computed(() => sections.value.filter((s) => SIDEBAR_KINDS.has(s.kind)))
const mainSections = computed(() => sections.value.filter((s) => !SIDEBAR_KINDS.has(s.kind)))

const contactItems = computed(() =>
  contactLines(props.data),
)
const contactTitle = computed(() => contactHeading(language.value))
</script>

<template>
  <article class="aurora" :style="vars">
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
            <p class="side-item">{{ skillNames(group).join(' · ') }}</p>
          </div>
        </template>

        <template v-else>
          <p v-for="lang in data.languages" :key="lang.id" class="side-item">
            <span class="lang-name">{{ lang.name }}</span>
            <span v-if="lang.level" class="lang-level">{{ lang.level }}</span>
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
            <div class="entry-head">
              <h3 class="entry-title">{{ item.position }}</h3>
              <span class="entry-dates">{{ formatDateRange(item.startDate, item.endDate, language) }}</span>
            </div>
            <p v-if="item.company || item.location" class="entry-meta">
              {{ item.company }}<template v-if="item.location"> · {{ item.location }}</template>
            </p>
            <p v-if="item.description" class="entry-text">{{ item.description }}</p>
            <ul v-if="item.highlights.length" class="highlights">
              <li v-for="(highlight, i) in item.highlights" :key="i">{{ highlight }}</li>
            </ul>
          </div>
        </template>

        <template v-else-if="section.kind === 'education'">
          <div v-for="item in data.education" :key="item.id" class="entry">
            <div class="entry-head">
              <h3 class="entry-title">{{ item.degree }}</h3>
              <span class="entry-dates">{{ formatDateRange(item.startDate, item.endDate, language) }}</span>
            </div>
            <p v-if="item.institution" class="entry-meta">{{ item.institution }}</p>
            <p v-if="item.description" class="entry-text">{{ item.description }}</p>
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
.aurora {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: 33% 1fr;
  font-family: var(--cv-font);
  font-size: calc(10pt * var(--cv-font-scale));
  line-height: 1.5;
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
.aurora::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  width: 33%;
  height: 297mm;
  background: color-mix(in srgb, var(--cv-accent) 8%, #fff);
  border-right: 1px solid var(--cv-accent);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* paged.js unsets ::before on continuation fragments (so text decorations do not repeat); the band
   must repeat on every page. */
.aurora[data-split-from]::before {
  content: '' !important;
}

/* Explicit column: on a continuation page holding only this column, auto-placement would move it to the other track (spec 022). */
.sidebar {
  grid-column: 1;
  /* Tint over paper, not a saturated fill: readable with any accent the user
     picks, and a fraction of the ink. */
  background: color-mix(in srgb, var(--cv-accent) 8%, #fff);
  border-right: 1px solid var(--cv-accent);
  padding: var(--cv-page-margin) calc(var(--cv-page-margin) * 0.75);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.photo {
  width: 72%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 50%;
  display: block;
  margin: 0 auto var(--gap);
  border: 1px solid var(--cv-accent);
}

.side-section {
  margin-bottom: var(--gap);
  break-inside: avoid;
}

.side-title {
  font-size: 0.76em;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 600;
  color: var(--cv-accent-text);
  margin: 0 0 0.6em;
}

.side-item {
  margin: 0 0 0.35em;
  font-size: 0.88em;
  color: #444;
  overflow-wrap: anywhere;
}

.side-item a {
  color: inherit;
  text-decoration: none;
}

.side-group + .side-group {
  margin-top: 0.6em;
}

.side-group-title {
  margin: 0 0 0.1em;
  font-weight: 600;
  font-size: 0.86em;
  color: #1a1a1a;
}

.lang-name {
  font-weight: 600;
  color: #1a1a1a;
}

.lang-level::before {
  content: '·';
  margin: 0 0.4em;
  color: #999;
}

.main {
  grid-column: 2;
  padding: var(--cv-page-margin);
}

.name {
  margin: 0;
  font-size: 2.15em;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.headline {
  margin: 0.3em 0 0;
  font-size: 0.92em;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cv-accent-text);
}

.section {
  margin-top: calc(var(--gap) * 1.25);
}

.section-title {
  font-size: 0.76em;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 600;
  color: var(--cv-accent-text);
  margin: 0 0 0.65em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid color-mix(in srgb, var(--cv-accent) 35%, #fff);
}

.summary {
  margin: 0;
}

.entry {
  margin-bottom: calc(var(--gap) * 0.8);
  break-inside: avoid;
  page-break-inside: avoid;
}

.entry:last-child {
  margin-bottom: 0;
}

.entry-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1em;
}

.entry-title {
  margin: 0;
  font-size: 1.02em;
  font-weight: 650;
}

.entry-dates {
  font-size: 0.82em;
  color: #666;
  white-space: nowrap;
}

.entry-meta {
  margin: 0.08em 0 0;
  font-size: 0.88em;
  font-weight: 500;
  color: #555;
}

.entry-text {
  margin: 0.35em 0 0;
}

.highlights {
  margin: 0.35em 0 0;
  padding-left: 1.05em;
}

.highlights li {
  margin-bottom: 0.18em;
}
</style>
