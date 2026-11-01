<script setup lang="ts">
import { computed, useId } from 'vue'
import { useCvStore } from '@/stores/cv'
import { useI18n } from '@/i18n'
import BaseField from '@/components/ui/BaseField.vue'
import AiImproveButton from '@/components/ui/AiImproveButton.vue'

const cv = useCvStore()
const { t } = useI18n()
const meterId = useId()

/** Recruiters skim: 150–450 characters is two or three sentences (spec 018). Advisory only. */
const MIN = 150
const MAX = 450
const length = computed(() => cv.data.summary.trim().length)
const verdict = computed(() => (length.value < MIN ? 'short' : length.value > MAX ? 'long' : 'good'))
</script>

<template>
  <BaseField v-slot="{ id }" :label="t('summary.label')" :hint="t('summary.hint')">
    <textarea :id="id" v-model="cv.data.summary" rows="6" :aria-describedby="meterId" />
  </BaseField>
  <AiImproveButton :text="cv.data.summary" kind="summary" />
  <div v-if="length > 0" :id="meterId" class="length">
    <meter :min="0" :max="600" :low="MIN" :high="MAX" :optimum="300" :value="length" aria-hidden="true" />
    <span class="verdict" :class="`verdict--${verdict}`">
      {{ t('summary.length', { n: length }) }} · {{ t(`summary.${verdict}`) }}
    </span>
  </div>
</template>

<style scoped>
.length {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

meter {
  flex: 1;
  max-width: 260px;
  height: 8px;
}

.verdict {
  font-size: var(--size-12);
  font-weight: 600;
}

.verdict--good {
  color: var(--md-success);
}

.verdict--short,
.verdict--long {
  color: var(--md-warning);
}


</style>
