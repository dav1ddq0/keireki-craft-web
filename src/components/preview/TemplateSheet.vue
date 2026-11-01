<script setup lang="ts">
/**
 * The phone's quick template switch (spec 064): a bottom sheet over the preview with every template.
 * A tap applies it to the CV behind the sheet and leaves the sheet open, so templates can be
 * compared on the real CV. Picking does what the style step does (`chooseTemplate`).
 */
import { useCvStore } from '@/stores/cv'
import { useI18n } from '@/i18n'
import { accentIfChosen, templates } from '@/templates/registry'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import TemplateThumb from '@/components/ui/TemplateThumb.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const cv = useCvStore()
const { t } = useI18n()

</script>

<template>
  <BottomSheet :open="open" :title="t('dock.templatesTitle')" @close="emit('close')">
    <p class="hint">{{ t('dock.templatesHint') }}</p>
    <ul class="grid">
      <li v-for="template in templates" :key="template.id">
        <button
          type="button"
          class="tile"
          :class="{ 'tile--current': cv.templateId === template.id }"
          :aria-pressed="cv.templateId === template.id"
          @click="cv.chooseTemplate(template.id)"
        >
          <TemplateThumb :template="template" :accent="accentIfChosen(template.id, cv.data.style)" decorative />
          <span class="name">{{ template.name }}</span>
        </button>
      </li>
    </ul>
  </BottomSheet>
</template>

<style scoped>
.hint {
  margin: 0 0 12px;
  padding: 0 16px;
  color: var(--md-on-surface-variant);
  font: var(--type-body-medium);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
  padding: 4px 16px 16px;
  list-style: none;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--md-on-surface);
  font: var(--type-label-large);
  letter-spacing: var(--tracking-label-large);
  text-align: start;
  cursor: pointer;
}

.tile--current :deep(.thumb) {
  border-color: var(--md-primary);
  box-shadow: 0 0 0 2px var(--md-primary);
}

.tile--current .name {
  color: var(--md-primary);
}

.tile:focus-visible {
  outline: none;
}

.tile:focus-visible :deep(.thumb) {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
