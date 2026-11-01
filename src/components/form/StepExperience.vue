<script setup lang="ts">
import { computed } from 'vue'
import { useCvStore } from '@/stores/cv'
import { formatMonth, useI18n } from '@/i18n'
import { createExperience } from '@/core/factory'
import BaseField from '@/components/ui/BaseField.vue'
import AiImproveButton from '@/components/ui/AiImproveButton.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SortableList from '@/components/ui/SortableList.vue'
import EntryCard from '@/components/ui/EntryCard.vue'
import DateRangeFields from './DateRangeFields.vue'
import { useExpandedEntry } from '@/composables/useExpandedEntry'
import TagInput from '@/components/ui/TagInput.vue'
import type { ExperienceEntry } from '@/types/cv'

const cv = useCvStore()
const { t } = useI18n()

const { isOpen, toggle } = useExpandedEntry(computed(() => cv.data.experience))

/** The folded card says which entry it is: "Position · Company", "Mar 2022 – Present · Remote". */
function entryTitle(item: ExperienceEntry): string {
  return [item.position, item.company].filter(Boolean).join(' · ') || t('entry.newExperience')
}

function entrySubtitle(item: ExperienceEntry): string {
  const end = item.endDate === null ? t('entry.present') : formatMonth(item.endDate ?? '')
  const dates = [formatMonth(item.startDate), end].filter(Boolean).join(' – ')
  return [dates, item.location].filter(Boolean).join(' · ')
}
</script>

<template>
  <div class="step">
    <p v-if="!cv.data.experience.length" class="empty">{{ t('experience.empty') }}</p>

    <SortableList :items="cv.data.experience" @reorder="cv.data.experience = $event">
      <template #default="{ item, index }">
        <EntryCard
          :title="entryTitle(item)"
          :subtitle="entrySubtitle(item)"
          :open="isOpen(item.id)"
          @toggle="toggle(item.id)"
        >
          <div class="entry">
            <div class="row">
              <BaseField v-slot="{ id }" :label="t('experience.position')">
                <input :id="id" v-model="item.position" />
              </BaseField>
              <BaseField v-slot="{ id }" :label="t('experience.company')">
                <input :id="id" v-model="item.company" />
              </BaseField>
              <BaseField v-slot="{ id }" :label="t('experience.location')">
                <input :id="id" v-model="item.location" />
              </BaseField>
            </div>

            <DateRangeFields v-model:start="item.startDate" v-model:end="item.endDate" />

            <BaseField v-slot="{ id }" :label="t('experience.description')">
              <textarea :id="id" v-model="item.description" rows="3" />
            </BaseField>
            <AiImproveButton :text="item.description" kind="experience" />

            <BaseField
              v-slot="{ id }"
              :label="t('experience.highlights')"
              :hint="t('skills.itemsHint')"
            >
              <TagInput :id="id" v-model="item.highlights" :placeholder="t('experience.addHighlight')" />
            </BaseField>

            <div class="actions">
              <BaseButton size="sm" variant="danger" :aria-label="t('actions.removeNamed', { name: entryTitle(item) })" @click="cv.data.experience.splice(index, 1)">
                {{ t('actions.remove') }}
              </BaseButton>
            </div>
          </div>
        </EntryCard>
      </template>
    </SortableList>

    <BaseButton variant="primary" @click="cv.data.experience.push(createExperience())">
      + {{ t('experience.add') }}
    </BaseButton>
  </div>
</template>

<style scoped>
.step {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
}

.empty {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--size-14);
}

.step > :deep(.list) {
  width: 100%;
}

.entry {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 8px;
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
