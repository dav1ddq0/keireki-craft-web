<script setup lang="ts">
/**
 * Classic — single column, ATS-first.
 *
 * Contract (spec §4): exactly one prop, no local state, no store access,
 * no mutation of `data`, and every color/font comes from CSS variables.
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
const sections = computed(() => resolveSections(props.data))
const language = computed(() => props.data.meta.language || 'es')
const contactLine = computed(() =>
  contactLines(props.data),
)
</script>

<template>
  <article class="classic" :style="vars">
    <header class="head">
      <h1 class="name">{{ data.personal.fullName }}</h1>
      <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
      <p v-if="contactLine.length" class="contact">
        <span v-for="(item, i) in contactLine" :key="i"><Breakable :text="item" /></span>
      </p>
      <p v-if="data.personal.links.length" class="contact">
        <a v-for="link in data.personal.links" :key="link.id" :href="absoluteUrl(link.url)">
          <Breakable :text="link.label || displayUrl(link.url)" />
        </a>
      </p>
    </header>

    <section v-for="section in sections" :key="section.id" :data-section="section.kind" :data-page-break="section.breakBefore" class="section">
      <h2 class="section-title">{{ section.title }}</h2>

      <p v-if="section.kind === 'summary'" class="summary">{{ data.summary }}</p>

      <template v-else-if="section.kind === 'experience'">
        <div v-for="item in data.experience" :key="item.id" class="entry">
          <div class="entry-head">
            <h3 class="entry-title">
              {{ item.position }}<span v-if="item.company"> · {{ item.company }}</span>
            </h3>
            <span class="entry-dates">{{ formatDateRange(item.startDate, item.endDate, language) }}</span>
          </div>
          <p v-if="item.location" class="entry-meta">{{ item.location }}</p>
          <p v-if="item.description" class="entry-text">{{ item.description }}</p>
          <ul v-if="item.highlights.length" class="highlights">
            <li v-for="(highlight, i) in item.highlights" :key="i">{{ highlight }}</li>
          </ul>
        </div>
      </template>

      <template v-else-if="section.kind === 'education'">
        <div v-for="item in data.education" :key="item.id" class="entry">
          <div class="entry-head">
            <h3 class="entry-title">
              {{ item.degree }}<span v-if="item.institution"> · {{ item.institution }}</span>
            </h3>
            <span class="entry-dates">{{ formatDateRange(item.startDate, item.endDate, language) }}</span>
          </div>
          <p v-if="item.description" class="entry-text">{{ item.description }}</p>
        </div>
      </template>

      <template v-else-if="section.kind === 'skills'">
        <p v-for="group in data.skills" :key="group.id" class="skill-row">
          <strong v-if="group.category">{{ group.category }}:</strong>
          {{ skillNames(group).join(' · ') }}
        </p>
      </template>

      <template v-else-if="section.kind === 'languages'">
        <p class="skill-row">
          <span v-for="lang in data.languages" :key="lang.id" class="lang">
            {{ lang.name }}<template v-if="lang.level"> ({{ lang.level }})</template>
          </span>
        </p>
      </template>

      <template v-else-if="section.custom">
        <div v-for="entry in section.custom.entries" :key="entry.id" class="entry">
          <div class="entry-head">
            <h3 class="entry-title">
              {{ entry.title }}<span v-if="entry.subtitle"> · {{ entry.subtitle }}</span>
            </h3>
            <span v-if="entry.date" class="entry-dates">{{ entry.date }}</span>
          </div>
          <p v-if="entry.description" class="entry-text">{{ entry.description }}</p>
        </div>
      </template>
    </section>
  </article>
</template>

<style scoped>
.classic {
  font-family: var(--cv-font);
  font-size: calc(10.5pt * var(--cv-font-scale));
  line-height: 1.45;
  color: #1a1a1a;
  padding: var(--cv-page-margin);
  --gap: calc(1em * var(--cv-spacing-scale));
}

.head {
  margin-bottom: calc(var(--gap) * 1.2);
}

.name {
  font-size: 2.05em;
  font-weight: 700;
  letter-spacing: -0.015em;
  margin: 0;
  /* A name longer than the line breaks inside the word, only where it cannot fit (spec 074). */
  overflow-wrap: break-word;
}

.headline {
  margin: 0.15em 0 0;
  font-size: 1.08em;
  color: var(--cv-accent-text);
  font-weight: 600;
}

.contact {
  margin: 0.5em 0 0;
  font-size: 0.92em;
  color: #444;
}

.contact span + span::before,
.contact a + a::before {
  content: '·';
  margin: 0 0.5em;
  color: #999;
}

.contact a {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid #ccc;
}

.section {
  margin-top: calc(var(--gap) * 1.15);
}

.section-title {
  font-size: 0.85em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cv-accent-text);
  margin: 0 0 0.55em;
  padding-bottom: 0.28em;
  border-bottom: 1.5px solid var(--cv-accent);
}

.summary {
  margin: 0;
  text-align: justify;
}

/* Keeping an entry whole matters more than an even column bottom (spec §6). */
.entry {
  margin-bottom: calc(var(--gap) * 0.7);
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
  font-size: 1em;
  font-weight: 650;
  margin: 0;
}

.entry-dates {
  font-size: 0.86em;
  color: #555;
  white-space: nowrap;
}

.entry-meta {
  margin: 0.1em 0 0;
  font-size: 0.86em;
  color: #666;
}

.entry-text {
  margin: 0.3em 0 0;
}

.highlights {
  margin: 0.35em 0 0;
  padding-left: 1.1em;
}

.highlights li {
  margin-bottom: 0.15em;
}

.skill-row {
  margin: 0 0 0.3em;
}

.lang + .lang::before {
  content: '·';
  margin: 0 0.5em;
  color: #999;
}
</style>
