<script setup lang="ts">
/** "Copy image" in the preview (spec 062): the CV to the clipboard, with its state beside it. */
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import { canCopyImages, useCopyCvImage } from '@/composables/useCopyCvImage'

const { t } = useI18n()
const { state, copy } = useCopyCvImage()
const supported = canCopyImages()

const STATES = { copying: 'preview.copying', copied: 'preview.copied', failed: 'preview.copyFailed' } as const
const status = computed(() => (state.value === 'idle' ? '' : t(STATES[state.value])))
</script>

<template>
  <div v-if="supported" class="copy">
    <output class="copy-state" :class="{ 'copy-state--failed': state === 'failed' }" aria-live="polite">{{ status }}</output>
    <button
      type="button"
      class="copy-btn m3-icon-btn m3-state m3-target"
      :aria-label="t('preview.copyImage')"
      :title="t('preview.copyImage')"
      :disabled="state === 'copying'"
      @click="copy"
    >
      <svg v-if="state === 'copied'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>
    </button>
  </div>
</template>

<style scoped>
.copy {
  display: flex;
  align-items: center;
  gap: 4px;
}

.copy-btn {
  width: 40px;
  height: 40px;
  border: 0;
  color: var(--md-on-surface-variant);
  cursor: pointer;
}

.copy-state {
  font: var(--type-label-large);
  letter-spacing: var(--tracking-label-large);
  color: var(--md-on-surface-variant);
  white-space: nowrap;
}

.copy-state:empty {
  display: none;
}

.copy-state--failed {
  color: var(--md-error);
}
</style>
