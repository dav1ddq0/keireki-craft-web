<script setup lang="ts">
/**
 * One-click CEFR levels for a language (spec 019). It only writes text into the same free field the
 * user can still type in, so "Bilingual" or "Fluent" keep working and templates read what they read.
 */
import { computed } from 'vue'
import { NATIVE_LEVEL } from '@/core/stylePresets'

const props = defineProps<{ cvLanguage: string; label: string }>()
const level = defineModel<string>({ required: true })

/** "Native" is CV content, so it follows the CV language, not the interface. */
const options = computed(() => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', NATIVE_LEVEL[props.cvLanguage] ?? NATIVE_LEVEL.en!])

const isCurrent = (option: string) => level.value.trim().toLowerCase() === option.toLowerCase()
</script>

<template>
  <div class="picker" role="group" :aria-label="label">
    <button
      v-for="option in options"
      :key="option"
      type="button"
      class="level m3-chip m3-state m3-target"
      :aria-pressed="isCurrent(option)"
      @click="level = option"
    >
      {{ option }}
    </button>
  </div>
</template>

<style scoped>
/* M3 filter chips, one selectable at a time (spec 029). */
.picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
