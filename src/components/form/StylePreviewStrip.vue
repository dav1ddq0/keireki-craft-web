<script setup lang="ts">
/**
 * A small, always-visible copy of the CV that stays at the top while the template and style
 * controls scroll under it (phones, spec 013), so the effect of every tap is seen at once.
 * Decorative: the full preview is one tap away, so it is hidden from assistive technology.
 */
import { useCvStore } from '@/stores/cv'
import { useUiStore } from '@/stores/ui'
import { useI18n } from '@/i18n'
import CvRenderer from '@/components/preview/CvRenderer.vue'

const cv = useCvStore()
const ui = useUiStore()
const { t } = useI18n()
</script>

<template>
  <div class="strip">
    <div class="page cv-preview-paper" aria-hidden="true" inert>
      <div class="scaled">
        <CvRenderer :data="cv.data" :template-id="cv.templateId" />
      </div>
    </div>
    <button type="button" class="expand" :aria-label="t('preview.show')" @click="ui.setPreviewOpen(true)">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg>
    </button>
  </div>
</template>

<style scoped>
.strip {
  --scale: 0.16;
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  justify-content: center;
  padding: 8px;
  border-radius: var(--shape-lg);
  background: var(--surface-2);
  /* Pinned, scrolled content must not peek out above the strip (the form's top padding) or round
     its top corners: the ::before covers the band above, the shadow the corners. Both reach exactly
     the wizard's gap, which unpinned is the space to the step bar, so they never paint over it.
     Below, a shadow one corner radius down covers the bottom corners; unpinned it stays inside the
     step's 24 px gap to the gallery. The border goes first, so neither hides it. */
  box-shadow:
    0 0 0 1px var(--border),
    0 calc(-1 * var(--wizard-gap, 16px)) 0 0 var(--bg),
    0 var(--shape-lg) 0 0 var(--bg);
}

.strip::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  bottom: 100%;
  height: var(--wizard-gap, 16px);
  background: var(--bg);
}

/* The page keeps its real size and is shrunk with a transform; the box takes the scaled size. */
.page {
  width: calc(210mm * var(--scale));
  height: calc(297mm * var(--scale));
  overflow: hidden;
  background: #fff;
  box-shadow: var(--elevation-2);
}

.scaled {
  width: 210mm;
  transform: scale(var(--scale));
  transform-origin: top left;
}

.expand {
  position: absolute;
  right: 0.5em;
  bottom: 0.5em;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: var(--shape-xl);
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow);
  cursor: pointer;
}
</style>
