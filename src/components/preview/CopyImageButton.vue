<script setup lang="ts">
/** "Copy image" in the preview (spec 062): the CV to the clipboard, with its state beside it. */
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import { canCopyImages, useCopyCvImage } from '@/composables/useCopyCvImage'

/** `compact`: the phone dock's look (spec 064): a 48 px icon, the state in a bubble above it, off the row. */
defineProps<{ compact?: boolean }>()

const { t } = useI18n()
const { state, shareable, copy, share } = useCopyCvImage()
const supported = canCopyImages()

const STATES = { copying: 'preview.copying', copied: 'preview.copied', failed: 'preview.copyFailed' } as const
const status = computed(() => (state.value === 'idle' ? '' : t(STATES[state.value])))
</script>

<template>
  <div v-if="supported" class="copy" :class="{ 'copy--compact': compact }">
    <div class="state" :class="{ 'state--shown': status !== '' }">
      <output class="copy-state" :class="{ 'copy-state--failed': state === 'failed' }" aria-live="polite">{{ status }}</output>
      <!-- Where the copy failed but the phone can share the picture: its sheet offers Copy and Save. -->
      <button v-if="state === 'failed' && shareable" type="button" class="share-btn m3-state m3-target" @click="share">
        {{ t('preview.shareImage') }}
      </button>
    </div>
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
  position: relative;
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

.state {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* The dock's look: the button alone in the row, its state floating above it so the row never moves. */
.copy--compact .copy-btn {
  width: 48px;
  height: 48px;
}

.copy--compact .state {
  position: absolute;
  right: 0;
  bottom: calc(100% + 16px);
  z-index: 2;
  display: flex;
  padding: 4px 4px 4px 16px;
  border-radius: var(--shape-md);
  background: var(--md-surface-container-highest);
  box-shadow: var(--elevation-2);
  white-space: nowrap;
}

/*
 * Empty, the bubble is hidden only to the eye: VoiceOver does not announce a live region that was
 * display: none until the moment its words arrived, which is what the phone dock needs most.
 */
.copy--compact .state:not(.state--shown) {
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  box-shadow: none;
}

.copy--compact .copy-state:empty {
  display: inline;
}

/* Without a Share button the bubble is just the words: even padding. */
.copy--compact .state--shown:not(:has(.share-btn)) {
  padding: 12px 16px;
}

.share-btn {
  --container: transparent;
  min-height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--shape-full);
  color: var(--md-primary);
  font: var(--type-label-large);
  letter-spacing: var(--tracking-label-large);
  white-space: nowrap;
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
