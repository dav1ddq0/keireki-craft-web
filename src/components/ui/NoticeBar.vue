<script setup lang="ts">
import { useI18n } from '@/i18n'
import BaseButton from './BaseButton.vue'

defineProps<{ tone?: 'info' | 'warning'; dismissible?: boolean }>()
const emit = defineEmits<{ dismiss: [] }>()
const { t } = useI18n()
</script>

<template>
  <div class="notice" :class="[`notice--${tone ?? 'info'}`, { 'notice--actions': $slots.actions }]" role="status">
    <p class="text"><slot /></p>
    <!-- What the notice asks for, done from it (spec 078). -->
    <slot name="actions" />
    <BaseButton v-if="dismissible" variant="ghost" size="sm" @click="emit('dismiss')">
      {{ t('notices.dismiss') }}
    </BaseButton>
  </div>
</template>

<style scoped>
.notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-radius: var(--shape-md);
  background: var(--md-surface-container-high);
  color: var(--md-on-surface);
  font: var(--type-body-medium);
  letter-spacing: var(--tracking-body-medium);
}

.notice--warning {
  background: var(--md-warning-container);
  color: var(--md-on-warning-container);
}

.text {
  margin: 0;
}

/* With an action, the text keeps a readable width: where both do not fit, the action goes under it. */
.notice--actions {
  flex-wrap: wrap;
}

.notice--actions .text {
  flex: 1 1 240px;
}

/* On phones the banner competes with the form for a very short viewport. */
@media (max-width: 640px) {
  .notice {
    gap: 8px;
    padding: 8px 12px;
    font: var(--type-body-small);
    letter-spacing: var(--tracking-body-small);
  }

  .notice :deep(button) {
    flex-shrink: 0;
  }
}
</style>
