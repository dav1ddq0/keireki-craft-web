<script setup lang="ts">
/**
 * Frame — a boxed header (accent border, photo, name, contact) over a single
 * column. Skills and languages close the page as a two-column block with bar
 * levels. Serif by default.
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

const BLOCK_KINDS = new Set(['skills', 'languages'])
const mainSections = computed(() => sections.value.filter((s) => !BLOCK_KINDS.has(s.kind)))
const blockSections = computed(() => sections.value.filter((s) => BLOCK_KINDS.has(s.kind)))

const contactItems = computed(() =>
  contactLines(props.data),
)

const languages = computed(() => resolveLanguages(props.data))
</script>

<template>
  <article class="frame" :style="vars">
    <header class="head">
      <img v-if="data.personal.photo" class="photo" :src="data.personal.photo" alt="" />
      <div class="head-text">
        <h1 class="name">{{ data.personal.fullName }}</h1>
        <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
        <p v-if="contactItems.length || data.personal.links.length" class="contact">
          <span v-for="(item, i) in contactItems" :key="i"><Breakable :text="item" /></span>
          <span v-for="link in data.personal.links" :key="link.id">
            <a :href="absoluteUrl(link.url)"><Breakable :text="link.label || displayUrl(link.url)" /></a>
          </span>
        </p>
      </div>
    </header>

    <section v-for="section in mainSections" :key="section.id" :data-section="section.kind" :data-page-break="section.breakBefore" class="section">
      <h2 class="section-title">{{ section.title }}</h2>

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
    </section>

    <div v-if="blockSections.length" class="block">
      <section v-for="section in blockSections" :key="section.id" :data-section="section.kind" class="block-section">
        <h2 class="section-title">{{ section.title }}</h2>

        <template v-if="section.kind === 'skills'">
          <div v-for="group in data.skills" :key="group.id" class="skill-group">
            <p v-if="group.category" class="skill-category">{{ group.category }}</p>
            <template v-if="groupHasLevels(group)">
              <div v-for="(item, i) in group.items" :key="i" class="row">
                <span>{{ item.name }}</span>
                <LevelDots
                  v-if="item.level"
                  variant="bars"
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
            <LevelDots v-if="lang.score !== null" variant="bars" :score="lang.score" :label="lang.label" />
          </div>
        </template>
      </section>
    </div>
  </article>
</template>

<style scoped>
.frame {
  font-family: var(--cv-font);
  font-size: calc(10pt * var(--cv-font-scale));
  line-height: 1.45;
  color: #1a1a1a;
  padding: var(--cv-page-margin);
  --gap: calc(1em * var(--cv-spacing-scale));
}

.head {
  display: flex;
  align-items: center;
  gap: 1.2em;
  padding: calc(var(--gap) * 0.9) calc(var(--gap) * 1.1);
  border: 2px solid var(--cv-accent);
  border-radius: 0.6em;
  break-inside: avoid;
}

.photo {
  width: 5.4em;
  height: 5.4em;
  flex: none;
  object-fit: cover;
  border-radius: 0.5em;
  background: #d1d5db;
}

.head-text {
  min-width: 0;
}

.name {
  font-size: 2.1em;
  font-weight: 700;
  line-height: 1.15;
  margin: 0;
  /* A name longer than the line breaks inside the word, only where it cannot fit (spec 074). */
  overflow-wrap: break-word;
}

.headline {
  margin: 0.15em 0 0;
  font-size: 1.05em;
  font-style: italic;
  color: var(--cv-accent-text);
}

.contact {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15em 1.1em;
  margin: 0.5em 0 0;
  font-size: 0.88em;
  color: #444;
}

.contact a {
  color: inherit;
  text-decoration: none;
}

.section {
  margin-top: calc(var(--gap) * 1.2);
}

.section-title {
  font-size: 1.05em;
  font-weight: 700;
  color: var(--cv-accent-text);
  margin: 0 0 0.6em;
  padding-bottom: 0.25em;
  border-bottom: 1px solid var(--cv-accent);
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
  font-weight: 700;
  margin: 0;
}

.entry-date {
  font-size: 0.86em;
  font-style: italic;
  color: #666;
  white-space: nowrap;
}

.entry-meta {
  margin: 0.1em 0 0;
  font-size: 0.9em;
  color: #666;
}

.entry-meta span + span::before {
  content: '·';
  margin: 0 0.45em;
}

.company {
  font-style: italic;
  color: #444;
}

.entry-text {
  margin: 0.3em 0 0;
}

.highlights {
  margin: 0.35em 0 0;
  padding-left: 1.1em;
}

.block {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14em, 1fr));
  gap: 0 calc(var(--gap) * 1.5);
  margin-top: calc(var(--gap) * 1.2);
}

.block-section {
  break-inside: avoid;
}

.skill-group + .skill-group {
  margin-top: 0.6em;
}

.skill-category {
  margin: 0 0 0.15em;
  font-weight: 700;
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
  padding: 0.2em 0;
  break-inside: avoid;
}
</style>
