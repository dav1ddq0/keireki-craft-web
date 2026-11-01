<script setup lang="ts">
import { computed } from 'vue'
import { useCvStore } from '@/stores/cv'
import { formatMonth, useI18n } from '@/i18n'
import { createEducation } from '@/core/factory'
import BaseField from '@/components/ui/BaseField.vue'
import AiImproveButton from '@/components/ui/AiImproveButton.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SortableList from '@/components/ui/SortableList.vue'
import EntryCard from '@/components/ui/EntryCard.vue'
import DateRangeFields from './DateRangeFields.vue'
import { useExpandedEntry } from '@/composables/useExpandedEntry'
import type { EducationEntry } from '@/types/cv'

const cv = useCvStore()
const { t } = useI18n()

const { isOpen, toggle } = useExpandedEntry(computed(() => cv.data.education))

/** The folded card says which entry it is: "Degree · Institution", "Sep 2016 – Jun 2020 · Seville". */
function entryTitle(item: EducationEntry): string {
  return [item.degree, item.institution].filter(Boolean).join(' · ') || t('entry.newEducation')
}

function entrySubtitle(item: EducationEntry): string {
  const end = item.endDate === null ? t('entry.present') : formatMonth(item.endDate ?? '')
  const dates = [formatMonth(item.startDate), end].filter(Boolean).join(' – ')
  return [dates, item.location].filter(Boolean).join(' · ')
}
</script>

<template>
  <div class="step">
    <p v-if="!cv.data.education.length" class="empty">{{ t('education.empty') }}</p>

    <SortableList :items="cv.data.education" @reorder="cv.data.education = $event">
      <template #default="{ item, index }">
        <EntryCard
          :title="entryTitle(item)"
          :subtitle="entrySubtitle(item)"
          :open="isOpen(item.id)"
          @toggle="toggle(item.id)"
        >
          <div class="entry">
            <div class="row">
              <BaseField v-slot="{ id }" :label="t('education.degree')">
                <input :id="id" v-model="item.degree" />
              </BaseField>
              <BaseField v-slot="{ id }" :label="t('education.institution')">
                <input :id="id" v-model="item.institution" />
              </BaseField>
              <BaseField v-slot="{ id }" :label="t('experience.location')">
                <input :id="id" v-model="item.location" />
              </BaseField>
            </div>

            <DateRangeFields v-model:start="item.startDate" v-model:end="item.endDate" />

            <BaseField v-slot="{ id }" :label="t('experience.description')">
              <textarea :id="id" v-model="item.description" rows="2" />
            </BaseField>
            <AiImproveButton :text="item.description" kind="education" />

            <div class="actions">
              <BaseButton size="sm" variant="danger" :aria-label="t('actions.removeNamed', { name: entryTitle(item) })" @click="cv.data.education.splice(index, 1)">
                {{ t('actions.remove') }}
              </BaseButton>
            </div>
          </div>
        </EntryCard>
      </template>
    </SortableList>

    <BaseButton variant="primary" @click="cv.data.education.push(createEducation())">
      + {{ t('education.add') }}
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

.step > :deep(.list) {
  width: 100%;
}

.empty {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--size-14);
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
