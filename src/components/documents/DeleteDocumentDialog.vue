<script setup lang="ts">
/**
 * Confirms deleting a CV from My CVs (spec 090): a modal native <dialog> (focus trap, inert page, Esc),
 * naming the CV as its card does, with its template and last change, so the right one goes. The focus
 * starts on Cancel.
 */
import { computed, useId, useTemplateRef } from 'vue'
import { useModalDialog } from '@/composables/useModalDialog'
import { formatDate, useI18n } from '@/i18n'
import type { CVSummary } from '@/types/cv'
import BaseButton from '@/components/ui/BaseButton.vue'
import DocumentTemplateTag from './DocumentTemplateTag.vue'

const props = defineProps<{ open: boolean; doc: CVSummary | null }>()
const emit = defineEmits<{ close: []; confirm: [] }>()
const { t } = useI18n()

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const titleId = useId()
const bodyId = useId()

useModalDialog(dialog, () => props.open && !!props.doc)

const name = computed(() => props.doc?.fullName || props.doc?.title || t('documents.untitled'))
const initials = computed(
  () =>
    name.value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join('') || '·',
)
</script>

<template>
  <dialog ref="dialog" class="confirm-delete" :aria-labelledby="titleId" :aria-describedby="bodyId" @close="emit('close')">
    <template v-if="doc">
      <svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" /><path d="M9 7V4h6v3" /></svg>
      <h2 :id="titleId" class="title">{{ t('documents.deleteTitle', { title: name }) }}</h2>
      <p :id="bodyId" class="body">{{ t('documents.deleteBody') }}</p>

      <div class="summary">
        <span class="monogram" aria-hidden="true">{{ initials }}</span>
        <span class="text">
          <span class="name">{{ name }}</span>
          <span class="meta">{{ t('documents.updated', { date: formatDate(doc.updatedAt) }) }}</span>
          <DocumentTemplateTag :doc="doc" />
        </span>
      </div>

      <footer class="foot">
        <!-- Outlined, so both buttons are the same 40 dp pill (the user's call); the focus ring is keyboard-only. -->
        <BaseButton variant="secondary" autofocus @click="dialog?.close()">{{ t('actions.cancel') }}</BaseButton>
        <BaseButton variant="primary" class="delete" @click="emit('confirm')">{{ t('documents.delete') }}</BaseButton>
      </footer>
    </template>
  </dialog>
</template>

<style scoped>
/* M3 basic dialog, as ExportDialog: container high, 28 dp corners, the same scrim. */
.confirm-delete {
  width: min(400px, calc(100vw - 32px));
  padding: 24px;
  border: 0;
  border-radius: var(--shape-xl);
  background: var(--md-surface-container-high);
  color: var(--md-on-surface);
  box-shadow: var(--elevation-3);
}

.confirm-delete[open] {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.confirm-delete::backdrop {
  background: rgb(0 0 0 / 0.32);
}

.icon {
  align-self: center;
  color: var(--md-error);
}

.title {
  margin: 0;
  font: var(--type-headline-small);
  text-align: center;
  overflow-wrap: anywhere;
}

.body {
  margin: 0;
  font: var(--type-body-medium);
  color: var(--md-on-surface-variant);
}

.summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--shape-md);
  background: var(--md-surface-container-low);
}

.monogram {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
  font: var(--type-label-large);
}

.text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  font: var(--type-body-small);
  color: var(--md-on-surface-variant);
}

.foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

/* The filled button, in the error colour: this one cannot be undone. */
.foot .delete {
  --container: var(--md-error);
  color: var(--md-on-error);
}
</style>
