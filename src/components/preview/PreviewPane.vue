<script setup lang="ts">
/** Live, reactive preview. Paginated output is a separate component on purpose —
 *  paged.js must never touch a Vue-managed subtree (spec §6). */
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useCvStore } from '@/stores/cv'
import { useUiStore } from '@/stores/ui'
import { useI18n } from '@/i18n'
import { useIsCompact, useIsDesktop, useIsPhone } from '@/composables/useIsPhone'
import { getTemplate } from '@/templates/registry'
import CvRenderer from './CvRenderer.vue'

const cv = useCvStore()
const ui = useUiStore()
const { t } = useI18n()

const isPhone = useIsPhone()
const isCompact = useIsCompact()
const isDesktop = useIsDesktop()

/** Steps whose content is one kind of section on the page (templates mark them with `data-section`). */
const SECTION_STEPS = ['summary', 'experience', 'education', 'skills', 'languages', 'custom'] as const
/** Desktop only: with form and page side by side, the outline shows where the edit lands (spec 019). */
const highlight = computed(() =>
  isDesktop.value && (SECTION_STEPS as readonly string[]).includes(ui.step) ? ui.step : undefined,
)
const zoom = ref(0.72)

/** A4 width in CSS px (210mm at 96dpi). */
const PAGE_PX = 793.7
const scroller = useTemplateRef<HTMLElement>('scroller')
const page = useTemplateRef<HTMLElement>('page')
const available = ref(0)
/** The page's unscaled height: a long CV is taller than one sheet. */
const pageHeight = ref(0)
let observer: ResizeObserver | undefined
let userZoomed = false

onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === scroller.value) {
        available.value = entry.contentRect.width
        // Until the user picks a zoom, the page follows the panel width (spec 018).
        if (!userZoomed) fit()
      } else {
        pageHeight.value = (entry.target as HTMLElement).offsetHeight
      }
    }
  })
  if (scroller.value) observer.observe(scroller.value)
  if (page.value) observer.observe(page.value)
})
onBeforeUnmount(() => observer?.disconnect())

/** On phones and tablets the page is fitted to its column instead of using the slider (specs 013, 016). */
const effectiveZoom = computed(() => {
  if (!isCompact.value || available.value <= 0) return zoom.value
  return Math.min(1, available.value / PAGE_PX)
})

/** Low enough that fitting the narrowest panel (about 300 px, at 1024 px wide) needs no sideways scroll. */
const ZOOM_MIN = 0.3
const ZOOM_MAX = 1.2
const ZOOM_STEP = 0.1
const zoomPercent = computed(() => Math.round(zoom.value * 100))

function zoomBy(delta: number) {
  userZoomed = true
  zoom.value = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((zoom.value + delta) * 10) / 10))
}

/** Fitting never enlarges the page past its real size; only + goes above 100 % (spec 027). */
const FIT_MAX = 1

/** The zoom at which the page fills the panel (`contentRect` already excludes the padding). */
function fit() {
  if (available.value > 0) zoom.value = Math.min(FIT_MAX, Math.max(ZOOM_MIN, available.value / PAGE_PX))
}

function fitToPanel() {
  userZoomed = false
  fit()
}

const templateName = computed(() => getTemplate(cv.templateId).name)
/** The chip takes you to the template gallery: not shown while the gallery is already on screen (spec 054). */
const showTemplateChip = computed(() => !isCompact.value && !(ui.step === 'style' && !ui.previewExpanded))

/*
 * The page is scaled from its top-left corner inside a frame the size of the scaled page, so the
 * layout box matches what is seen: zoomed past the panel, all of it can be scrolled to (spec 030).
 * Scaling from the centre left the overflow on the left out of the scroll range.
 */
const frameStyle = computed(() => ({
  width: `${PAGE_PX * effectiveZoom.value}px`,
  height: pageHeight.value ? `${pageHeight.value * effectiveZoom.value}px` : undefined,
}))
const scaleStyle = computed(() => ({ transform: `scale(${effectiveZoom.value})` }))
</script>

<template>
  <section class="pane" :aria-label="t('preview.title')">
    <header v-if="!isPhone" class="bar">
      <h2 class="title" :class="{ 'sr-only': !isCompact }">{{ t('preview.title') }}</h2>
      <button
        v-if="showTemplateChip"
        type="button"
        class="chip"
        :aria-label="t('preview.changeTemplate', { name: templateName })"
        @click="ui.goTo('style')"
      >
        <span class="swatch" :style="{ background: cv.data.style.accentColor }" aria-hidden="true" />
        {{ templateName }} <span class="chip-action">· {{ t('preview.change') }}</span>
      </button>
      <div v-if="!isCompact" class="zoom" role="group" aria-label="Zoom">
        <button type="button" class="zoom-btn m3-icon-btn m3-state m3-target" :aria-label="t('preview.zoomOut')" :disabled="zoom <= ZOOM_MIN" @click="zoomBy(-ZOOM_STEP)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
        </button>
        <output class="zoom-value" aria-live="polite">{{ zoomPercent }} %</output>
        <button type="button" class="zoom-btn m3-icon-btn m3-state m3-target" :aria-label="t('preview.zoomIn')" :disabled="zoom >= ZOOM_MAX" @click="zoomBy(ZOOM_STEP)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button type="button" class="fit m3-state m3-target" :aria-label="t('preview.fitLabel')" @click="fitToPanel">{{ t('preview.fit') }}</button>
        <button
          v-if="isDesktop"
          type="button"
          class="expand m3-icon-btn m3-state m3-target"
          :aria-label="t(ui.previewExpanded ? 'preview.collapse' : 'preview.expand')"
          :title="t(ui.previewExpanded ? 'preview.collapse' : 'preview.expand')"
          :aria-pressed="ui.previewExpanded"
          @click="ui.setPreviewExpanded(!ui.previewExpanded)"
        >
          <svg v-if="ui.previewExpanded" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /></svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg>
        </button>
      </div>
    </header>

    <div ref="scroller" class="scroll">
      <div class="page-frame" :style="frameStyle">
        <div ref="page" class="page-wrap cv-preview-paper" :style="scaleStyle" :data-highlight="highlight">
          <div class="cv-page">
            <CvRenderer :data="cv.data" :template-id="cv.templateId" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--surface-2);
  border-left: 1px solid var(--border);
}

.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.title {
  margin: 0;
  font-size: var(--size-12);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.zoom {
  display: flex;
  align-items: center;
  gap: 4px;
  /* Stays on the right when the template chip is not shown. */
  margin-inline-start: auto;
  font: var(--type-label-large);
  color: var(--md-on-surface-variant);
}

.chip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: var(--shape-md);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: var(--size-12);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.chip:hover {
  background: var(--surface-2);
}

.chip-action {
  font-weight: 500;
  color: var(--text-muted);
}

/* Narrow desktop column: the template name alone still says what the button does (its label does). */
@media (max-width: 1279px) {
  .chip-action {
    display: none;
  }
}

.swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.zoom-btn,
.fit {
  border: 0;
  cursor: pointer;
}

.zoom-btn,
.expand {
  width: 40px;
  height: 40px;
}

.expand[aria-pressed='true'] {
  --container: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}


.fit {
  --container: transparent;
  min-height: 40px;
  padding: 0 12px;
  border-radius: var(--shape-full);
  color: var(--md-primary);
  font: var(--type-label-large);
  letter-spacing: var(--tracking-label-large);
}

.zoom-value {
  min-width: 3.5em;
  text-align: center;
  color: var(--md-on-surface);
}

.scroll {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: flex;
  /* safe: a page wider than the panel starts at its left edge instead of overflowing out of reach. */
  justify-content: safe center;
  align-items: flex-start;
}

/* Phones: a slimmer margin so the page uses the width it is fitted to. */
@media (max-width: 640px) {
  .scroll {
    padding: 12px;
    /* The scaled page keeps its 794px layout box; nothing useful is out there to scroll to. */
    overflow-x: hidden;
  }
}

/* The outline lives here only, so exports (rendered separately) never carry it. */
.page-wrap[data-highlight='summary'] :deep([data-section='summary']),
.page-wrap[data-highlight='experience'] :deep([data-section='experience']),
.page-wrap[data-highlight='education'] :deep([data-section='education']),
.page-wrap[data-highlight='skills'] :deep([data-section='skills']),
.page-wrap[data-highlight='languages'] :deep([data-section='languages']),
.page-wrap[data-highlight='custom'] :deep([data-section='custom']) {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
  border-radius: var(--shape-xs);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
  transition: outline-color 0.2s ease;
}

.page-frame {
  flex-shrink: 0;
}

.page-wrap {
  width: 210mm;
  transform-origin: top left;
}

.cv-page {
  box-shadow: var(--elevation-2);
}
</style>
