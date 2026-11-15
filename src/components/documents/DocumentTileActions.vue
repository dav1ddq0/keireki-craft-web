<script setup lang="ts">
/**
 * The actions of a card in My CVs (spec 090): Open, the ⋮ menu (Rename, Duplicate) and, apart at the
 * end, the trash. The trash only asks: the confirmation is the list's dialog.
 */
import { useI18n } from '@/i18n'
import BaseButton from '@/components/ui/BaseButton.vue'
import DocumentMenu from './DocumentMenu.vue'

const props = defineProps<{ title: string }>()
const emit = defineEmits<{ open: []; rename: []; duplicate: []; remove: [] }>()
const { t } = useI18n()
</script>

<template>
  <div class="row">
    <BaseButton variant="tonal" @click="emit('open')">{{ t('actions.open') }}</BaseButton>
    <DocumentMenu :title="props.title" @rename="emit('rename')" @duplicate="emit('duplicate')" />
    <span class="trash-wrap">
      <button type="button" class="trash m3-state m3-target" :aria-label="t('documents.deleteOne', { title: props.title })" @click="emit('remove')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 7h16" /><path d="M9 7V4h6v3" />
          <path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
        </svg>
      </button>
      <!-- What the icon does, for the eye; the button's own name says it to assistive technology. -->
      <span class="tip" aria-hidden="true">{{ t('documents.delete') }}</span>
    </span>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.row > :first-child {
  margin-right: 4px;
}

/* Apart from the everyday actions: at the far end of the row. */
.trash-wrap {
  position: relative;
  margin-left: auto;
}

.trash {
  --container: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--md-outline-variant);
  border-radius: 50%;
  color: var(--md-on-surface-variant);
  cursor: pointer;
  transition:
    background-color var(--duration-short) var(--motion-standard),
    color var(--duration-short) var(--motion-standard),
    border-color var(--duration-short) var(--motion-standard);
}

.trash:hover,
.trash:focus-visible {
  --container: var(--md-error-container);
  border-color: var(--md-error-container);
  color: var(--md-on-error-container);
}

.tip {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  padding: 4px 8px;
  border-radius: var(--shape-xs);
  background: var(--md-inverse-surface);
  color: var(--md-inverse-on-surface);
  font: var(--type-body-small);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--duration-short) var(--motion-standard);
}

.trash-wrap:hover .tip,
.trash:focus-visible + .tip {
  opacity: 1;
}

/* On hover or focus the bin grows a little and trembles, as an iOS app about to be deleted; never
   with reduced motion. `scale` is apart from `transform`, so the growth eases in under the tremble. */
@media (prefers-reduced-motion: no-preference) {
  .trash svg {
    transform-origin: 50% 60%;
    transition: scale var(--duration-short) var(--motion-standard);
  }

  .trash:hover svg,
  .trash:focus-visible svg {
    scale: 1.15;
    animation: jiggle 0.32s ease-in-out infinite;
  }

  @keyframes jiggle {
    0%,
    100% {
      transform: rotate(0);
    }
    25% {
      transform: rotate(-7deg);
    }
    75% {
      transform: rotate(7deg);
    }
  }
}

@media (forced-colors: active) {
  .trash {
    border-color: ButtonText;
  }
}
</style>
