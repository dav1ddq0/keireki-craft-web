<script setup lang="ts">
/**
 * Rename / duplicate / delete a CV from a bottom sheet; renaming asks for the name and deleting for
 * confirmation inside it (spec 073).
 */
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from '@/i18n'
import type { CVSummary } from '@/types/cv'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseField from '@/components/ui/BaseField.vue'

const props = defineProps<{ open: boolean; doc: CVSummary | null }>()
const emit = defineEmits<{ close: []; rename: [id: string, title: string]; duplicate: [id: string]; remove: [id: string] }>()
const { t } = useI18n()

const confirming = ref(false)
const renaming = ref(false)
const title = ref('')
watch(
  () => props.open,
  () => {
    confirming.value = false
    renaming.value = false
  },
)

const field = useTemplateRef<HTMLInputElement>('field')

/** The field takes the focus with the name selected, ready to be typed over. */
async function startRename() {
  title.value = props.doc?.title ?? ''
  renaming.value = true
  await nextTick()
  field.value?.select()
}
</script>

<template>
  <BottomSheet :open="open" :title="doc?.fullName || doc?.title || t('documents.untitled')" @close="emit('close')">
    <div v-if="doc" class="actions">
      <form v-if="renaming" class="rename" @submit.prevent="title.trim() && emit('rename', doc.id, title)">
        <BaseField v-slot="{ id }" :label="t('header.docTitle')">
          <input :id="id" ref="field" v-model="title" type="text" autocomplete="off" />
        </BaseField>
        <div class="pair">
          <button type="button" class="row" @click="renaming = false">{{ t('actions.cancel') }}</button>
          <button type="submit" class="row row--primary" :disabled="!title.trim()">{{ t('actions.save') }}</button>
        </div>
      </form>
      <template v-else-if="!confirming">
        <button type="button" class="row" @click="startRename">{{ t('actions.rename') }}</button>
        <button type="button" class="row" @click="emit('duplicate', doc.id)">{{ t('actions.duplicate') }}</button>
        <button type="button" class="row row--danger" @click="confirming = true">{{ t('actions.remove') }}</button>
      </template>
      <template v-else>
        <p class="confirm">{{ t('documents.deleteConfirm', { title: doc.title }) }}</p>
        <div class="pair">
          <button type="button" class="row" @click="confirming = false">{{ t('actions.cancel') }}</button>
          <button type="button" class="row row--solid" @click="emit('remove', doc.id)">{{ t('actions.confirm') }}</button>
        </div>
      </template>
    </div>
  </BottomSheet>
</template>

<style scoped>
.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 4px calc(16px + var(--safe-bottom));
}

.confirm {
  margin: 2px 4px;
  color: var(--text-muted);
}

.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.row {
  min-height: 56px;
  border: 1px solid var(--border);
  border-radius: var(--shape-lg);
  background: var(--surface);
  color: inherit;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.row--danger {
  color: var(--danger);
}

.rename {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row--primary {
  border-color: var(--md-primary);
  background: var(--md-primary);
  color: var(--md-on-primary);
}

.row:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.row--solid {
  border-color: var(--md-error);
  background: var(--md-error);
  color: var(--md-on-error);
}
</style>
