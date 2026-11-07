<script setup lang="ts">
/**
 * First visit (spec 019, home since spec 076): what the product is, then the ways in. Built only from
 * the app's own pieces (BaseButton, TemplateThumb, the preview's paper, the wizard's step circles,
 * Import's cards) and its colour aliases, so it follows the light and dark themes as is. The hero's
 * sample turns through the templates by itself (spec 077).
 */
import { computed } from 'vue'
import { useCvStore } from '@/stores/cv'
import { useUiStore } from '@/stores/ui'
import { LOCALES, useI18n } from '@/i18n'
import { createSampleCV } from '@/core/sample'
import { DEFAULT_STYLE } from '@/core/factory'
import { accentIfChosen, templates } from '@/templates/registry'
import BaseButton from '@/components/ui/BaseButton.vue'
import TemplateThumb from '@/components/ui/TemplateThumb.vue'
import HomeCarousel from '@/components/documents/HomeCarousel.vue'

const cv = useCvStore()
const ui = useUiStore()
const { t, locale } = useI18n()

const REPO_URL = 'https://github.com/dav1ddq0/keireki-craft-web'
/** The hero's carousel, in order: the default first, then a spread of looks. */
const PREVIEW_IDS = ['classic', 'aurora', 'cobalt', 'editorial', 'monograph', 'harbor', 'facet', 'banner']
/** The template section. Chosen by the owner: there is no usage data, by design (spec 076). */
const FEATURED_IDS = ['classic', 'cobalt', 'editorial', 'aurora']

const byIds = (ids: string[]) => ids.map((id) => templates.find((t) => t.id === id)).filter((t) => t !== undefined)
const featured = byIds(FEATURED_IDS)

/** The sample in the interface language, which the carousel shows in each template. Never stored. */
const sample = computed(() => createSampleCV(locale.value))

/**
 * Stores the new CV right away. cv.init's blank document is never saved until edited, so only
 * navigating to it brought the welcome screen back on the next visit (spec 027). With a template,
 * it is picked as in the style step's gallery (its accent and face too).
 */
async function startBlank(templateId?: string) {
  await cv.createNew()
  if (templateId) cv.chooseTemplate(templateId)
  ui.goTo('personal')
}

async function startFromSample() {
  await cv.createNew({ seed: createSampleCV(locale.value) })
  ui.goTo('personal')
}

/** "See all": a blank CV, opened on the style step where every template is. */
async function seeAllTemplates() {
  await startBlank()
  ui.goTo('style')
}
</script>

<template>
  <div class="home">
    <section class="hero" aria-labelledby="home-title">
      <div class="hero-text">
        <h1 id="home-title" class="title">{{ t('welcome.heroTitle') }}</h1>
        <p class="lead">{{ t('welcome.heroLead') }}</p>
        <div class="actions">
          <BaseButton variant="primary" @click="startBlank()">{{ t('welcome.create') }}</BaseButton>
          <BaseButton variant="secondary" @click="ui.view = 'import'">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4m0 0L8 8m4-4l4 4" /><path d="M4 15v4a1 1 0 001 1h14a1 1 0 001-1v-4" /></svg>
            {{ t('welcome.importPdf') }}
          </BaseButton>
          <BaseButton variant="ghost" @click="startFromSample">{{ t('welcome.loadSample') }}</BaseButton>
        </div>
        <ul class="points">
          <li>{{ t('welcome.templateCount', { n: templates.length }) }}</li>
          <li>{{ t('welcome.languageCount', { n: LOCALES.length }) }}</li>
          <li>{{ t('welcome.noAccount') }}</li>
          <li>{{ t('welcome.noAnalytics') }}</li>
        </ul>
      </div>

      <div class="hero-preview">
        <HomeCarousel :sample="sample" :template-ids="PREVIEW_IDS" />
      </div>
    </section>

    <section class="block" aria-labelledby="home-how">
      <h2 id="home-how" class="view-title">{{ t('welcome.howTitle') }}</h2>
      <ol class="steps">
        <li v-for="n in 3" :key="n" class="step">
          <span class="badge" aria-hidden="true">{{ n }}</span>
          <div class="step-text">
            <h3 class="step-title">{{ t(`welcome.step${n}Title`) }}</h3>
            <p class="hint">{{ t(`welcome.step${n}Text`) }}</p>
          </div>
        </li>
      </ol>
    </section>

    <section id="home-templates" class="block" aria-labelledby="home-templates-title">
      <h2 id="home-templates-title" class="view-title">{{ t('welcome.templatesTitle') }}</h2>
      <p class="lead">{{ t('welcome.templatesLead', { n: templates.length }) }}</p>
      <ul class="templates">
        <li v-for="template in featured" :key="template.id">
          <button
            type="button"
            class="card template-card"
            :aria-label="t('welcome.useTemplate', { name: template.name })"
            @click="startBlank(template.id)"
          >
            <TemplateThumb :template="template" :accent="accentIfChosen(template.id, DEFAULT_STYLE)" decorative />
            <span class="template-row">
              <span class="template-name">{{ template.name }}</span>
              <span class="use">{{ t('welcome.use') }} →</span>
            </span>
          </button>
        </li>
      </ul>
      <div>
        <BaseButton variant="ghost" @click="seeAllTemplates">{{ t('welcome.seeAllTemplates', { n: templates.length }) }}</BaseButton>
      </div>
    </section>

    <section class="block" aria-labelledby="home-data">
      <h2 id="home-data" class="view-title">{{ t('welcome.dataTitle') }}</h2>
      <p class="lead">{{ t('welcome.dataLead') }}</p>
      <div class="answers">
        <article class="card">
          <h3 class="card-title">{{ t('welcome.whereQ') }}</h3>
          <p class="hint">{{ t('welcome.whereA') }}</p>
        </article>
        <article class="card">
          <h3 class="card-title">{{ t('welcome.moveQ') }}</h3>
          <p class="hint">{{ t('welcome.moveA') }}</p>
        </article>
      </div>
    </section>

    <section class="closing" aria-labelledby="home-closing">
      <h2 id="home-closing" class="view-title">{{ t('welcome.closingTitle') }}</h2>
      <BaseButton variant="primary" @click="startBlank()">{{ t('welcome.create') }}</BaseButton>
    </section>

    <footer class="footer">
      <span>{{ t('welcome.licence') }}</span>
      <a :href="REPO_URL" target="_blank" rel="noopener noreferrer">{{ t('welcome.github') }}</a>
    </footer>
  </div>
</template>

<style scoped>
/* My CVs' container (max width, padding), with room between the sections. */
.home {
  display: flex;
  flex-direction: column;
  gap: clamp(40px, 7vh, 64px);
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(20px, 5vh, 48px) 20px 28px;
}

/* ---- hero: a wrapping row that stacks on a phone ------------------------------------------ */

.hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 32px 48px;
}

.hero-text {
  display: flex;
  flex: 1 1 380px;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.title {
  margin: 0;
  font-size: clamp(var(--size-28), 4vw, var(--size-32));
  line-height: 1.15;
  text-wrap: balance;
}

.lead {
  margin: 0;
  max-width: 40em;
  font: var(--type-body-large);
  letter-spacing: var(--tracking-body-large);
  color: var(--text-muted);
  text-wrap: pretty;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.points {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--text-muted);
}

.points li::before {
  content: '✓';
  margin-right: 8px;
  color: var(--md-success);
  font-weight: 700;
}

.hero-preview {
  display: flex;
  flex: 1 1 420px;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

/* ---- sections ----------------------------------------------------------------------------- */

.block {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* The wizard's step circles (StepRail's current step). */
.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  gap: 16px 32px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.step {
  display: flex;
  gap: 12px;
}

.badge {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--md-primary);
  color: var(--md-on-primary);
  font-size: var(--size-11);
  font-weight: 700;
}

.step-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-title,
.card-title {
  margin: 0;
  font: var(--type-title-medium);
  letter-spacing: var(--tracking-title-medium);
}

.hint {
  margin: 0;
  line-height: 1.45;
  color: var(--text-muted);
}

/* Import's cards; the template cards are the style step's gallery cards. */
.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.templates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Two to a row on a phone, like the style step's grid. */
@media (max-width: 520px) {
  .templates {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.template-card {
  width: 100%;
  height: 100%;
  padding: 8px;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.template-card:hover {
  border-color: var(--accent);
}

.template-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 12px;
  padding: 4px 4px 0;
}

.template-name {
  font-weight: 600;
}

.use {
  font: var(--type-label-large);
  color: var(--accent);
}

.answers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
  gap: 16px;
}

.closing {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px 32px;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--shape-lg);
  background: var(--surface);
}

.footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 24px;
  font: var(--type-body-small);
  letter-spacing: var(--tracking-body-small);
  color: var(--text-muted);
}

.footer a {
  display: inline-flex;
  align-items: center;
  min-height: var(--target);
  color: var(--accent);
}
</style>
