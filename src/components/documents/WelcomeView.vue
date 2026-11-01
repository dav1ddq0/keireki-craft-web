<script setup lang="ts">
/** First visit (spec 019): three ways in, instead of landing on an empty form. */
import { useCvStore } from '@/stores/cv'
import { useUiStore } from '@/stores/ui'
import { useI18n } from '@/i18n'
import { createSampleCV } from '@/core/sample'
import { templates } from '@/templates/registry'

const cv = useCvStore()
const ui = useUiStore()
const { t, locale } = useI18n()

/**
 * Stores the empty CV right away. cv.init's blank document is never saved until edited, so only
 * navigating to it brought the welcome screen back on the next visit (spec 027).
 */
async function startBlank() {
  await cv.createNew()
  ui.goTo('personal')
}

async function startFromSample() {
  await cv.createNew({ seed: createSampleCV(locale.value) })
  ui.goTo('personal')
}
</script>

<template>
  <section class="welcome">
    <header class="intro">
      <h1 class="title">{{ t('welcome.title') }}</h1>
      <p class="lead">{{ t('welcome.lead') }}</p>
    </header>

    <div class="choices">
      <button type="button" class="choice choice--main" @click="startBlank">
        <span class="icon icon--blue" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5" /></svg>
        </span>
        <span class="choice-title">{{ t('welcome.blankTitle') }}</span>
        <span class="choice-hint">{{ t('welcome.blankHint') }}</span>
        <span class="cta">{{ t('welcome.blankCta') }} →</span>
      </button>
      <button type="button" class="choice" @click="startFromSample">
        <span class="icon icon--green" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>
        </span>
        <span class="choice-title">{{ t('welcome.sampleTitle') }}</span>
        <span class="choice-hint">{{ t('welcome.sampleHint') }}</span>
        <span class="cta">{{ t('welcome.sampleCta') }} →</span>
      </button>
      <button type="button" class="choice" @click="ui.view = 'import'">
        <span class="icon icon--amber" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4m0 0L8 8m4-4l4 4" /><path d="M4 15v4a1 1 0 001 1h14a1 1 0 001-1v-4" /></svg>
        </span>
        <span class="choice-title">{{ t('welcome.importTitle') }}</span>
        <span class="choice-hint">{{ t('welcome.importHint') }}</span>
        <span class="cta">{{ t('welcome.importCta') }} →</span>
      </button>
    </div>

    <ul class="points">
      <li>{{ t('welcome.templates', { n: templates.length }) }}</li>
      <li>{{ t('welcome.preview') }}</li>
      <li>{{ t('welcome.pdf') }}</li>
    </ul>
  </section>
</template>

<style scoped>
.welcome {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  padding: clamp(20px, 6vh, 56px) 20px 28px;
}

.intro {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 640px;
}

.title {
  margin: 0;
  font-size: clamp(var(--size-28), 4vw, var(--size-32));
  line-height: 1.15;
}

.lead {
  margin: 0;
  font-size: var(--size-16);
  line-height: 1.5;
  color: var(--text-muted);
}

.choices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.choice {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--shape-lg);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.choice:hover {
  border-color: var(--accent);
}

.choice--main {
  border: 2px solid var(--accent);
}

.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--shape-md);
}

.icon--blue {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
}

.icon--green {
  background: var(--md-success-container);
  color: var(--md-on-success-container);
}

.icon--amber {
  background: var(--md-warning-container);
  color: var(--md-on-warning-container);
}

.choice-title {
  font-size: var(--size-16);
  font-weight: 700;
}

.choice-hint {
  line-height: 1.45;
  color: var(--text-muted);
}

.cta {
  margin-top: auto;
  padding-top: 4px;
  font-weight: 600;
  color: var(--accent);
}

.points {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
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
</style>
