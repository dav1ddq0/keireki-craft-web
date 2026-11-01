<script setup lang="ts">
/**
 * Bottom dock for narrow screens (specs 013, 016): Edit / Preview switch and one main action, in a
 * single row where the thumb is. It lives outside the form on purpose: in preview mode the form is
 * hidden, and a toggle inside it left no way back. Back / previous step live in the step bar.
 * The switch is icons only, and in preview the row also holds the template switch and Copy image,
 * with Export as an icon (spec 064).
 */
import { computed, ref } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useCvStore } from '@/stores/cv'
import { useI18n } from '@/i18n'
import { getTemplate } from '@/templates/registry'
import ExportSheet from './ExportSheet.vue'
import CopyImageButton from '@/components/preview/CopyImageButton.vue'
import TemplateSheet from '@/components/preview/TemplateSheet.vue'

const ui = useUiStore()
const cv = useCvStore()
const { t } = useI18n()
const exportOpen = ref(false)
const templatesOpen = ref(false)
const templateName = computed(() => getTemplate(cv.templateId).name)

const isLast = computed(() => ui.stepIndex === ui.steps.length - 1)
</script>

<template>
  <div class="dock">
    <div class="switch" role="group" :aria-label="t('dock.label')">
      <button type="button" class="mode m3-state" :aria-label="t('dock.edit')" :title="t('dock.edit')" :aria-pressed="!ui.previewOpen" @click="ui.setPreviewOpen(false)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
      </button>
      <button type="button" class="mode m3-state" :aria-label="t('preview.title')" :title="t('preview.title')" :aria-pressed="ui.previewOpen" @click="ui.setPreviewOpen(true)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
      </button>
    </div>

    <!-- Preview: what is done with the document, where the thumb is (spec 064). -->
    <template v-if="ui.previewOpen">
      <button
        type="button"
        class="template m3-state"
        aria-haspopup="dialog"
        :aria-label="t('dock.template', { name: templateName })"
        @click="templatesOpen = true"
      >
        <span class="swatch" :style="{ background: cv.data.style.accentColor }" aria-hidden="true" />
        <span class="template-name">{{ templateName }}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 10l5 5 5-5z" /></svg>
      </button>
      <TemplateSheet :open="templatesOpen" @close="templatesOpen = false" />
      <CopyImageButton compact />
      <button
        type="button"
        class="action action--icon m3-state"
        aria-haspopup="dialog"
        :aria-label="t('steps.export')"
        :title="t('steps.export')"
        @click="exportOpen = true"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12m0 0l-4-4m4 4l4-4" /><path d="M4 20h16" /></svg>
      </button>
    </template>
    <!-- On the last step there is nothing next: the main action is exporting (spec 027). -->
    <template v-else-if="isLast">
      <button type="button" class="action m3-state" aria-haspopup="dialog" @click="exportOpen = true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12m0 0l-4-4m4 4l4-4" /><path d="M4 20h16" /></svg>
        {{ t('steps.export') }}
      </button>
    </template>
    <button v-else type="button" class="action m3-state" @click="ui.nextStep()">
      {{ t('actions.next') }}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
    </button>
    <!-- One export sheet for both ways in: the preview's icon and the last step's button. -->
    <ExportSheet :open="exportOpen" @close="exportOpen = false" />
  </div>
</template>

<style scoped>
/* M3 bottom app bar (spec 029): surface-container, an edit/preview toggle, the extended FAB. */
.dock {
  display: none;
  align-items: center;
  gap: 8px;
  min-height: 80px;
  padding: 12px 16px calc(12px + var(--safe-bottom));
  background: var(--md-surface-container);
}

@media (max-width: 640px) {
  .dock {
    display: flex;
  }
}

.switch {
  flex: none;
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: var(--shape-full);
  background: var(--md-surface-container-highest);
}

.mode {
  --container: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 0 0 48px;
  min-height: 48px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--shape-full);
  white-space: nowrap;
  color: var(--md-on-surface-variant);
  font: var(--type-label-large);
  letter-spacing: var(--tracking-label-large);
  cursor: pointer;
}

.mode[aria-pressed='true'] {
  --container: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

/* The template switch (spec 064): the accent, the template's name, and a sheet behind it. */
.template {
  --container: var(--md-surface-container-highest);
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 48px;
  padding: 0 8px 0 16px;
  border: 0;
  border-radius: var(--shape-full);
  color: var(--md-on-surface);
  font: var(--type-label-large);
  letter-spacing: var(--tracking-label-large);
  cursor: pointer;
}

.swatch {
  flex: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--md-on-surface) 24%, transparent);
}

.template-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-align: start;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template svg {
  flex: none;
  color: var(--md-on-surface-variant);
}

/* Extended FAB: 56 dp, large shape, primary container; no shadow while it sits in the bar. */
.action {
  --container: var(--md-primary-container);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex: 1;
  min-height: 56px;
  padding: 0 20px;
  border: 0;
  border-radius: var(--shape-lg);
  color: var(--md-on-primary-container);
  font: var(--type-label-large);
  letter-spacing: var(--tracking-label-large);
  cursor: pointer;
}

.action--icon {
  flex: none;
  width: 56px;
  padding: 0;
}

.action:disabled {
  --container: color-mix(in srgb, var(--md-on-surface) 12%, transparent);
  color: color-mix(in srgb, var(--md-on-surface) 38%, transparent);
  cursor: default;
}
</style>
