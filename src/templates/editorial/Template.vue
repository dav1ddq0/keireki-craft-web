<script setup lang="ts">
/**
 * Editorial — a serif, book-like single column.
 *
 * The visual weight is carried entirely by typography: a centered masthead,
 * small-caps section headings on hairline rules, and a wide measure. No filled
 * bands, which keeps it as ATS-safe as Classic while reading far less like a
 * form.
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
  <article class="editorial" :style="vars">
    <header class="masthead">
      <h1 class="name">{{ data.personal.fullName }}</h1>
      <p v-if="data.personal.headline" class="headline">{{ data.personal.headline }}</p>
      <div v-if="contactLine.length || data.personal.links.length" class="contact">
        <span v-for="(item, i) in contactLine" :key="i"><Breakable :text="item" /></span>
        <a v-for="link in data.personal.links" :key="link.id" :href="absoluteUrl(link.url)">
          <Breakable :text="link.label || displayUrl(link.url)" />
        </a>
      </div>
    </header>

    <section v-for="section in sections" :key="section.id" :data-section="section.kind" :data-page-break="section.breakBefore" class="section">
      <h2 class="section-title"><span>{{ section.title }}</span></h2>

      <p v-if="section.kind === 'summary'" class="lead">{{ data.summary }}</p>

      <template v-else-if="section.kind === 'experience'">
        <div v-for="item in data.experience" :key="item.id" class="entry">
          <div class="entry-head">
            <h3 class="entry-title">{{ item.position }}</h3>
            <span class="entry-dates">{{ formatDateRange(item.startDate, item.endDate, language) }}</span>
          </div>
          <p v-if="item.company || item.location" class="entry-meta">
            <em>{{ item.company }}</em><template v-if="item.location">, {{ item.location }}</template>
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
          <p v-if="item.institution || item.location" class="entry-meta">
            <em>{{ item.institution }}</em><template v-if="item.location">, {{ item.location }}</template>
          </p>
          <p v-if="item.description" class="entry-text">{{ item.description }}</p>
        </div>
      </template>

      <template v-else-if="section.kind === 'skills'">
        <p v-for="group in data.skills" :key="group.id" class="list-row">
          <span v-if="group.category" class="list-label">{{ group.category }}</span>
          {{ skillNames(group).join(', ') }}
        </p>
      </template>

      <template v-else-if="section.kind === 'languages'">
        <p v-for="lang in data.languages" :key="lang.id" class="list-row">
          <span class="list-label">{{ lang.name }}</span>{{ lang.level }}
        </p>
      </template>

      <template v-else-if="section.custom">
        <div v-for="entry in section.custom.entries" :key="entry.id" class="entry">
          <div class="entry-head">
            <h3 class="entry-title">{{ entry.title }}</h3>
            <span v-if="entry.date" class="entry-dates">{{ entry.date }}</span>
          </div>
          <p v-if="entry.subtitle" class="entry-meta"><em>{{ entry.subtitle }}</em></p>
          <p v-if="entry.description" class="entry-text">{{ entry.description }}</p>
        </div>
      </template>
    </section>
  </article>
</template>

<style scoped>
.editorial {
  font-family: var(--cv-font);
  font-size: calc(10.5pt * var(--cv-font-scale));
  line-height: 1.55;
  color: #1a1a1a;
  padding: calc(var(--cv-page-margin) * 1.15) var(--cv-page-margin);
  --gap: calc(1em * var(--cv-spacing-scale));
}

.masthead {
  text-align: center;
  margin-bottom: calc(var(--gap) * 1.5);
}

.name {
  margin: 0;
  font-size: 2.4em;
  font-weight: 400;
  letter-spacing: 0.02em;
  line-height: 1.1;
  /* A name longer than the line breaks inside the word, only where it cannot fit (spec 074). */
  overflow-wrap: break-word;
}

.headline {
  margin: 0.35em 0 0;
  font-size: 0.86em;
  font-style: italic;
  letter-spacing: 0.06em;
  color: var(--cv-accent-text);
}

.contact {
  margin-top: 0.9em;
  padding: 0.55em 0;
  border-top: 1px solid var(--cv-accent);
  border-bottom: 1px solid var(--cv-accent);
  font-size: 0.82em;
  letter-spacing: 0.02em;
  color: #444;
}

.contact span + span::before,
.contact a::before {
  content: '·';
  margin: 0 0.55em;
  color: #999;
}

.contact a {
  color: inherit;
  text-decoration: none;
}

.section {
  margin-top: calc(var(--gap) * 1.3);
}

/* The rule runs the full measure and the label sits on it, paper-style. */
.section-title {
  margin: 0 0 0.7em;
  font-size: 0.8em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--cv-accent-text);
  border-bottom: 1px solid var(--cv-accent);
  line-height: 0;
}

.section-title span {
  background: #fff;
  padding-right: 0.7em;
  line-height: 1;
  display: inline-block;
  transform: translateY(0.35em);
}

.lead {
  margin: 0;
  text-align: justify;
  font-size: 1.02em;
}

.entry {
  margin-bottom: calc(var(--gap) * 0.85);
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
  font-size: 1.05em;
  font-weight: 600;
}

.entry-dates {
  font-size: 0.8em;
  letter-spacing: 0.04em;
  color: #666;
  white-space: nowrap;
}

.entry-meta {
  margin: 0.05em 0 0;
  font-size: 0.92em;
  color: #444;
}

.entry-text {
  margin: 0.35em 0 0;
  text-align: justify;
}

.highlights {
  margin: 0.4em 0 0;
  padding-left: 1.1em;
}

.highlights li {
  margin-bottom: 0.2em;
  padding-left: 0.2em;
}

.list-row {
  display: grid;
  grid-template-columns: 9em 1fr;
  gap: 0.5em;
  margin: 0 0 0.35em;
}

.list-label {
  font-variant: small-caps;
  letter-spacing: 0.06em;
  color: var(--cv-accent-text);
}
</style>
