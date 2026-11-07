<script setup lang="ts">
/**
 * Monograph — the most restrained of the set.
 *
 * Wide tracking on a light-weight name, a short accent rule instead of a filled
 * heading, and a lot of air. The accent appears only as hairlines: in a quiet
 * layout, colored headings are noise, and weight contrast scans faster.
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
  <article class="monograph" :style="vars">
    <header class="head">
      <h1 class="name">{{ data.personal.fullName }}</h1>
      <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
      <p v-if="contactLine.length || data.personal.links.length" class="contact">
        <span v-for="(item, i) in contactLine" :key="i"><Breakable :text="item" /></span>
        <a v-for="link in data.personal.links" :key="link.id" :href="absoluteUrl(link.url)">
          <Breakable :text="link.label || displayUrl(link.url)" />
        </a>
      </p>
    </header>

    <section v-for="section in sections" :key="section.id" :data-section="section.kind" :data-page-break="section.breakBefore" class="section">
      <h2 class="section-title">{{ section.title }}</h2>

      <p v-if="section.kind === 'summary'" class="summary">{{ data.summary }}</p>

      <template v-else-if="section.kind === 'experience'">
        <div v-for="item in data.experience" :key="item.id" class="row">
          <div class="rail">
            <p class="rail-date">{{ formatDateRange(item.startDate, item.endDate, language) }}</p>
            <p v-if="item.location" class="rail-note">{{ item.location }}</p>
          </div>
          <div class="body">
            <h3 class="row-title">{{ item.position }}</h3>
            <p v-if="item.company" class="row-meta">{{ item.company }}</p>
            <p v-if="item.description" class="row-text">{{ item.description }}</p>
            <ul v-if="item.highlights.length" class="highlights">
              <li v-for="(highlight, i) in item.highlights" :key="i">{{ highlight }}</li>
            </ul>
          </div>
        </div>
      </template>

      <template v-else-if="section.kind === 'education'">
        <div v-for="item in data.education" :key="item.id" class="row">
          <div class="rail">
            <p class="rail-date">{{ formatDateRange(item.startDate, item.endDate, language) }}</p>
          </div>
          <div class="body">
            <h3 class="row-title">{{ item.degree }}</h3>
            <p v-if="item.institution" class="row-meta">{{ item.institution }}</p>
            <p v-if="item.description" class="row-text">{{ item.description }}</p>
          </div>
        </div>
      </template>

      <template v-else-if="section.kind === 'skills'">
        <div v-for="group in data.skills" :key="group.id" class="row">
          <div class="rail">
            <p class="rail-date">{{ group.category }}</p>
          </div>
          <div class="body">
            <p class="row-text">{{ skillNames(group).join(' · ') }}</p>
          </div>
        </div>
      </template>

      <template v-else-if="section.kind === 'languages'">
        <div v-for="lang in data.languages" :key="lang.id" class="row">
          <div class="rail">
            <p class="rail-date">{{ lang.name }}</p>
          </div>
          <div class="body">
            <p class="row-text">{{ lang.level }}</p>
          </div>
        </div>
      </template>

      <template v-else-if="section.custom">
        <div v-for="entry in section.custom.entries" :key="entry.id" class="row">
          <div class="rail">
            <p v-if="entry.date" class="rail-date">{{ entry.date }}</p>
          </div>
          <div class="body">
            <h3 class="row-title">{{ entry.title }}</h3>
            <p v-if="entry.subtitle" class="row-meta">{{ entry.subtitle }}</p>
            <p v-if="entry.description" class="row-text">{{ entry.description }}</p>
          </div>
        </div>
      </template>
    </section>
  </article>
</template>

<style scoped>
.monograph {
  font-family: var(--cv-font);
  font-size: calc(10pt * var(--cv-font-scale));
  line-height: 1.55;
  color: #1a1a1a;
  padding: calc(var(--cv-page-margin) * 1.2) var(--cv-page-margin);
  --gap: calc(1em * var(--cv-spacing-scale));
  --rail: 21%;
}

.head {
  margin-bottom: calc(var(--gap) * 1.6);
}

.name {
  margin: 0;
  font-size: 2.2em;
  font-weight: 300;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  line-height: 1.15;
  /* A name longer than the line breaks inside the word, only where it cannot fit (spec 074). */
  overflow-wrap: break-word;
}

.headline {
  margin: 0.5em 0 0;
  font-size: 0.84em;
  font-weight: 400;
  letter-spacing: 0.1em;
  color: #555;
}

.contact {
  margin: 0.8em 0 0;
  font-size: 0.82em;
  color: #666;
}

.contact span + span::before,
.contact a::before {
  content: '/';
  margin: 0 0.5em;
  color: var(--cv-accent-text);
}

.contact a {
  color: inherit;
  text-decoration: none;
}

.section {
  margin-top: calc(var(--gap) * 1.5);
}

/* A short rule instead of a filled heading: the accent stays a hairline. */
.section-title {
  margin: 0 0 0.9em;
  padding-top: 0.6em;
  border-top: 1.5px solid var(--cv-accent);
  display: inline-block;
  min-width: 4.5em;
  font-size: 0.72em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #1a1a1a;
}

.summary {
  margin: 0 0 0 var(--rail);
  font-size: 1.02em;
}

.row {
  display: grid;
  grid-template-columns: var(--rail) 1fr;
  gap: 1.4em;
  margin-bottom: calc(var(--gap) * 0.9);
  break-inside: avoid;
  page-break-inside: avoid;
}

.row:last-child {
  margin-bottom: 0;
}

.rail-date {
  margin: 0;
  font-size: 0.78em;
  letter-spacing: 0.05em;
  color: #666;
  padding-top: 0.25em;
}

.rail-note {
  margin: 0.2em 0 0;
  font-size: 0.75em;
  color: #999;
}

.row-title {
  margin: 0;
  font-size: 1em;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.row-meta {
  margin: 0.1em 0 0;
  font-size: 0.88em;
  color: #555;
}

.row-text {
  margin: 0.4em 0 0;
}

/* Skills and languages have no title above the value, so it would otherwise
   sit a line lower than its own label in the rail. */
.body > .row-text:first-child {
  margin-top: 0.25em;
}

.highlights {
  margin: 0.45em 0 0;
  padding-left: 1em;
}

.highlights li {
  margin-bottom: 0.22em;
}
</style>
