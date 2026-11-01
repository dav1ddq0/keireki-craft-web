<script setup lang="ts">
/**
 * A month and a year for a date that may be partial (spec 038). The value is `''`, `YYYY` or
 * `YYYY-MM`: the month is optional, a month without a (plausible) year stores nothing. Two native controls
 * instead of `<input type="month">`, so the month names follow the UI language and a year-only date
 * (which PDF import produces) shows up instead of reading as empty.
 */
import { computed, ref, watch } from 'vue'
import { joinMonth, splitMonth } from '@/core/monthDate'
import { useI18n } from '@/i18n'

const props = defineProps<{ id?: string; label: string; disabled?: boolean }>()
const model = defineModel<string>({ required: true })

const { t, intlLocale } = useI18n()

const year = ref(splitMonth(model.value).year)
const month = ref(splitMonth(model.value).month)

const value = computed(() => joinMonth(year.value, month.value))

// Follows the model when it changes from outside (undo, import), but not while a half-typed value
// (a month with no year yet) produces the same stored value.
watch(model, (next) => {
  if (next === value.value) return
  const parts = splitMonth(next)
  year.value = parts.year
  month.value = parts.month
})

// One path for both controls: whatever changed them, the stored value follows.
watch(value, (next) => {
  if (next !== model.value) model.value = next
})

function onYear(event: Event) {
  const input = event.target as HTMLInputElement
  year.value = input.value = input.value.replace(/\D/g, '').slice(0, 4)
}

const months = computed(() => {
  const names = new Intl.DateTimeFormat(intlLocale.value, { month: 'long' })
  return Array.from({ length: 12 }, (_, i) => {
    const name = names.format(new Date(2000, i, 1))
    return { value: String(i + 1).padStart(2, '0'), name: name.charAt(0).toLocaleUpperCase(intlLocale.value) + name.slice(1) }
  })
})
</script>

<template>
  <div class="month-field" role="group" :aria-label="props.label">
    <select
      :id="id"
      v-model="month"
      class="month"
      :disabled="disabled"
      :aria-label="`${props.label} · ${t('experience.month')}`"
    >
      <option value="">{{ t('experience.month') }}</option>
      <option v-for="m in months" :key="m.value" :value="m.value">{{ m.name }}</option>
    </select>
    <input
      class="year"
      :value="year"
      :disabled="disabled"
      inputmode="numeric"
      autocomplete="off"
      maxlength="4"
      :placeholder="t('experience.year')"
      :aria-label="`${props.label} · ${t('experience.year')}`"
      @input="onYear"
    />
  </div>
</template>

<style scoped>
.month-field {
  display: flex;
  gap: 8px;
  align-items: center;
}

.month,
.year {
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: var(--type-body-large);
  letter-spacing: var(--tracking-body-large);
  outline: none;
}

.month {
  flex: 1;
  min-height: 24px;
}

.year {
  width: 4.5em;
  text-align: end;
  font-variant-numeric: tabular-nums;
}

.month:focus-visible,
.year:focus-visible {
  box-shadow: 0 2px 0 var(--md-primary);
}

.month option {
  color: initial;
}

:disabled {
  color: inherit;
  opacity: 1;
  cursor: not-allowed;
}
</style>
