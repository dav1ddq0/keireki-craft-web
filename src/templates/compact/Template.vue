<script setup lang="ts">
/**
 * Compact — a two-column grid where the left rail carries dates and the right
 * carries content. Aimed at profiles with many entries: the fixed rail removes
 * the ragged date column that makes long single-column CVs hard to scan.
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
} from '@/templates/shared'

const props = defineProps<{ data: CVData }>()

const vars = computed(() => styleVars(props.data.style))
const language = computed(() => props.data.meta.language || 'es')
const sections = computed(() => resolveSections(props.data))
const contactLine = computed(() =>
  contactLines(props.data),
)
</script>

<template>
  <article class="compact" :style="vars">
    <header class="head">
      <div class="head-text">
        <h1 class="name">{{ data.personal.fullName }}</h1>
        <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
      </div>
      <div class="head-contact">
        <span v-for="(item, i) in contactLine" :key="i"><Breakable :text="item" /></span>
        <a v-for="link in data.personal.links" :key="link.id" :href="absoluteUrl(link.url)">
          <Breakable :text="link.label || displayUrl(link.url)" />
        </a>
      </div>
    </header>

    <section v-for="section in sections" :key="section.id" :data-section="section.kind" :data-page-break="section.breakBefore" class="section">
      <h2 class="section-title">{{ section.title }}</h2>

      <p v-if="section.kind === 'summary'" class="summary">{{ data.summary }}</p>

      <template v-else-if="section.kind === 'experience'">
        <div v-for="item in data.experience" :key="item.id" class="row">
          <div class="rail">{{ formatDateRange(item.startDate, item.endDate, language) }}</div>
          <div class="body">
            <p class="row-title">
              {{ item.position }}<span v-if="item.company" class="sep"> · {{ item.company }}</span>
              <span v-if="item.location" class="loc"> — {{ item.location }}</span>
            </p>
            <p v-if="item.description" class="row-text">{{ item.description }}</p>
            <ul v-if="item.highlights.length" class="highlights">
              <li v-for="(highlight, i) in item.highlights" :key="i">{{ highlight }}</li>
            </ul>
          </div>
        </div>
      </template>

      <template v-else-if="section.kind === 'education'">
        <div v-for="item in data.education" :key="item.id" class="row">
          <div class="rail">{{ formatDateRange(item.startDate, item.endDate, language) }}</div>
          <div class="body">
            <p class="row-title">
              {{ item.degree }}<span v-if="item.institution" class="sep"> · {{ item.institution }}</span>
            </p>
            <p v-if="item.description" class="row-text">{{ item.description }}</p>
          </div>
        </div>
      </template>

      <template v-else-if="section.kind === 'skills'">
        <div v-for="group in data.skills" :key="group.id" class="row">
          <div class="rail">{{ group.category }}</div>
          <div class="body">
            <p class="row-text">{{ skillNames(group).join(' · ') }}</p>
          </div>
        </div>
      </template>

      <template v-else-if="section.kind === 'languages'">
        <div v-for="lang in data.languages" :key="lang.id" class="row">
          <div class="rail">{{ lang.name }}</div>
          <div class="body">
            <p class="row-text">{{ lang.level }}</p>
          </div>
        </div>
      </template>

      <template v-else-if="section.custom">
        <div v-for="entry in section.custom.entries" :key="entry.id" class="row">
          <div class="rail">{{ entry.date }}</div>
          <div class="body">
            <p class="row-title">
              {{ entry.title }}<span v-if="entry.subtitle" class="sep"> · {{ entry.subtitle }}</span>
            </p>
            <p v-if="entry.description" class="row-text">{{ entry.description }}</p>
          </div>
        </div>
      </template>
    </section>
  </article>
</template>

<style scoped>
.compact {
  font-family: var(--cv-font);
  font-size: calc(9.6pt * var(--cv-font-scale));
  line-height: 1.35;
  color: #1a1a1a;
  padding: var(--cv-page-margin);
  --gap: calc(0.85em * var(--cv-spacing-scale));
  --rail: 23%;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5em;
  padding-bottom: 0.5em;
  border-bottom: 2px solid var(--cv-accent);
}

/* The name and headline may shrink below a long word's width, so the word breaks (spec 074). */
.head-text {
  min-width: 0;
}

.name {
  font-size: 1.85em;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
  /* A name longer than the line breaks inside the word, only where it cannot fit (spec 074). */
  overflow-wrap: break-word;
}

.headline {
  margin: 0.1em 0 0;
  font-weight: 600;
  color: var(--cv-accent-text);
}

.head-contact {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 0.86em;
  color: #555;
  text-align: right;
}

.head-contact a {
  color: inherit;
  text-decoration: none;
}

.section {
  margin-top: var(--gap);
}

.section-title {
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  color: var(--cv-accent-text);
  margin: 0 0 0.4em;
}

.summary {
  margin: 0 0 0 var(--rail);
  padding-left: 0.9em;
}

.row {
  display: grid;
  grid-template-columns: var(--rail) 1fr;
  gap: 0.9em;
  margin-bottom: calc(var(--gap) * 0.55);
  break-inside: avoid;
  page-break-inside: avoid;
}

.rail {
  font-size: 0.86em;
  color: #666;
  padding-top: 0.08em;
  overflow-wrap: anywhere;
}

.row-title {
  margin: 0;
  font-weight: 650;
}

.sep {
  font-weight: 500;
}

.loc {
  font-weight: 400;
  color: #666;
  font-size: 0.92em;
}

.row-text {
  margin: 0.12em 0 0;
}

.highlights {
  margin: 0.2em 0 0;
  padding-left: 1em;
}
</style>
