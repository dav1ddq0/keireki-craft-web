<script setup lang="ts">
/**
 * Ledger — one column where every section is a row: its title as a label on the
 * left, its content on the right, separated by dashed rules. No photo; levels are
 * drawn as dashes. Plain reading order, so it stays friendly to ATS parsers.
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

const contactItems = computed(() =>
  contactLines(props.data),
)

const languages = computed(() => resolveLanguages(props.data))
</script>

<template>
  <article class="ledger" :style="vars">
    <header class="head">
      <h1 class="name">{{ data.personal.fullName }}</h1>
      <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
      <p v-if="contactItems.length || data.personal.links.length" class="contact">
        <span v-for="(item, i) in contactItems" :key="i"><Breakable :text="item" /></span>
        <span v-for="link in data.personal.links" :key="link.id">
          <a :href="absoluteUrl(link.url)"><Breakable :text="link.label || displayUrl(link.url)" /></a>
        </span>
      </p>
    </header>

    <section v-for="section in sections" :key="section.id" :data-section="section.kind" :data-page-break="section.breakBefore" class="section">
      <h2 class="label">{{ section.title }}</h2>

      <div class="content">
        <p v-if="section.kind === 'summary'" class="summary">{{ data.summary }}</p>

        <template v-else-if="section.kind === 'experience'">
          <div v-for="item in data.experience" :key="item.id" class="entry">
            <div class="entry-head">
              <h3 class="entry-title">{{ item.position }}</h3>
              <span class="entry-date">{{ formatDateRange(item.startDate, item.endDate, language) }}</span>
            </div>
            <p v-if="item.company || item.location" class="entry-meta">
              <span v-if="item.company" class="company">{{ item.company }}</span>
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
            <div class="entry-head">
              <h3 class="entry-title">{{ item.degree }}</h3>
              <span class="entry-date">{{ formatDateRange(item.startDate, item.endDate, language) }}</span>
            </div>
            <p v-if="item.institution" class="entry-meta">
              <span class="company">{{ item.institution }}</span>
            </p>
            <p v-if="item.description" class="entry-text">{{ item.description }}</p>
          </div>
        </template>

        <template v-else-if="section.kind === 'skills'">
          <div v-for="group in data.skills" :key="group.id" class="skill-group">
            <p v-if="group.category" class="skill-category">{{ group.category }}</p>
            <template v-if="groupHasLevels(group)">
              <div v-for="(item, i) in group.items" :key="i" class="row">
                <span>{{ item.name }}</span>
                <LevelDots
                  v-if="item.level"
                  variant="dashes"
                  :score="item.level"
                  :label="levelAccessibleLabel(item.level, language)"
                />
              </div>
            </template>
            <p v-else class="skill-items">{{ skillNames(group).join(' · ') }}</p>
          </div>
        </template>

        <template v-else-if="section.kind === 'languages'">
          <div v-for="lang in languages" :key="lang.id" class="row">
            <span>
              {{ lang.name }}<template v-if="lang.level && lang.score === null"> — {{ lang.level }}</template>
            </span>
            <LevelDots v-if="lang.score !== null" variant="dashes" :score="lang.score" :label="lang.label" />
          </div>
        </template>

        <template v-else-if="section.custom">
          <div v-for="entry in section.custom.entries" :key="entry.id" class="entry">
            <div class="entry-head">
              <h3 class="entry-title">{{ entry.title }}</h3>
              <span v-if="entry.date" class="entry-date">{{ entry.date }}</span>
            </div>
            <p v-if="entry.subtitle" class="entry-meta">
              <span class="company">{{ entry.subtitle }}</span>
            </p>
            <p v-if="entry.description" class="entry-text">{{ entry.description }}</p>
          </div>
        </template>
      </div>
    </section>
  </article>
</template>

<style scoped>
.ledger {
  font-family: var(--cv-font);
  font-size: calc(10pt * var(--cv-font-scale));
  line-height: 1.45;
  color: #1a1a1a;
  padding: var(--cv-page-margin);
  --gap: calc(1em * var(--cv-spacing-scale));
}

.name {
  font-size: 2.2em;
  font-weight: 700;
  letter-spacing: -0.015em;
  margin: 0;
}

.headline {
  margin: 0.1em 0 0;
  font-size: 1.1em;
  font-weight: 600;
  color: var(--cv-accent-text);
}

.contact {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2em 1.2em;
  margin: 0.5em 0 0;
  font-size: 0.9em;
  color: #444;
}

.contact a {
  color: inherit;
  text-decoration: none;
}

.section {
  display: grid;
  grid-template-columns: 23% 1fr;
  gap: 0 var(--gap);
  margin-top: var(--gap);
  padding-top: var(--gap);
  border-top: 1px dashed var(--cv-accent);
}

/* Beside its content in the section's grid, the title has no "next" to keep with: its
   break-after: avoid (print.css) spread to the whole section, so no break between sections was
   allowed and Chrome broke right after the header (spec 075). */
.label {
  break-after: auto;
  page-break-after: auto;
  margin: 0;
  font-size: 0.8em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cv-accent-text);
}

.summary {
  margin: 0;
}

.entry {
  margin-bottom: calc(var(--gap) * 0.75);
  break-inside: avoid;
  page-break-inside: avoid;
}

.entry-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1em;
}

.entry-title {
  font-size: 1.02em;
  font-weight: 650;
  margin: 0;
}

.entry-date {
  font-size: 0.86em;
  color: #666;
  white-space: nowrap;
}

.entry-meta {
  margin: 0.1em 0 0;
  font-size: 0.88em;
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

.skill-group {
  break-inside: avoid;
}

.skill-group + .skill-group {
  margin-top: 0.6em;
}

.skill-category {
  margin: 0 0 0.15em;
  font-weight: 650;
  font-size: 0.9em;
}

.skill-items {
  margin: 0;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1em;
  padding: 0.25em 0;
  border-bottom: 1px dashed #d1d5db;
  break-inside: avoid;
}
</style>
