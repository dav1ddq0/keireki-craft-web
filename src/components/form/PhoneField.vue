<script setup lang="ts">
/**
 * Phone number with a country selector (spec 056): flag + dial code, a searchable list of countries,
 * and the number. The phone is still ONE string ("+34 600 123 456"), so saved CVs, imports and
 * templates keep working. The starting country is guessed offline from the browser (language, time
 * zone), then refined by the connection's IP; a country the user picked, or a phone that already has
 * a code, is never overwritten.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import {
  COUNTRIES,
  countryFromLocale,
  countryName,
  joinPhone,
  splitPhone,
  type Country,
} from '@/core/countries'
import { fetchIpCountry } from '@/services/geo/ipCountry'
import { useI18n } from '@/i18n'
import CountryFlag from '@/components/ui/CountryFlag.vue'

defineProps<{ inputId: string }>()
const phone = defineModel<string>({ required: true })

const { t, locale } = useI18n()
const uid = useId()
const listId = `${uid}-list`

const initial = splitPhone(phone.value)
const country = ref<Country | null>(initial.country)
const number = ref(initial.number)
/** The country the guess (offline, then IP) suggested; listed first. */
const suggested = ref<Country | null>(null)
let chosen = false

function emit() {
  phone.value = joinPhone(country.value, number.value)
}

/** Typing "+34 600…" in the number box moves the code to the selector. */
function onNumberInput(event: Event) {
  const text = (event.target as HTMLInputElement).value
  if (text.trim().startsWith('+')) {
    const split = splitPhone(text)
    if (split.country) {
      country.value = split.country
      chosen = true
      number.value = split.number
      emit()
      return
    }
  }
  number.value = text
  emit()
}

// Undo / redo / import change the string from outside: follow it.
watch(phone, (value) => {
  if (value === joinPhone(country.value, number.value)) return
  const split = splitPhone(value)
  number.value = split.number
  if (split.country) country.value = split.country
  else if (value.trim()) country.value = null
})

onMounted(() => {
  if (country.value || number.value.trim()) return
  const guess = countryFromLocale(navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone)
  if (guess) {
    country.value = guess
    suggested.value = guess
  }
  void fetchIpCountry().then((fromIp) => {
    // The user may have chosen or typed while the request was out.
    if (!fromIp || chosen || number.value.trim() || phone.value.trim()) return
    country.value = fromIp
    suggested.value = fromIp
  })
})

// ---- the list --------------------------------------------------------------------------------

const open = ref(false)
const query = ref('')
const active = ref(0)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const search = ref<HTMLInputElement | null>(null)
const list = ref<HTMLElement | null>(null)

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

const entries = computed(() => {
  const collator = new Intl.Collator(locale.value)
  const all = COUNTRIES.map((c) => ({ country: c, name: countryName(c.iso, locale.value) })).sort((a, b) =>
    collator.compare(a.name, b.name),
  )
  const q = fold(query.value.trim())
  if (!q) {
    const first = suggested.value
    return first ? [...all.filter((e) => e.country.iso === first.iso), ...all.filter((e) => e.country.iso !== first.iso)] : all
  }
  const digits = q.replace(/^\+/, '')
  return all.filter(
    ({ country: c, name }) =>
      fold(name).includes(q) || c.iso.toLowerCase() === q || (/^\d+$/.test(digits) && c.dial.startsWith(digits)),
  )
})

watch(entries, () => (active.value = 0))

const currentName = computed(() => (country.value ? countryName(country.value.iso, locale.value) : ''))

async function openList() {
  open.value = true
  query.value = ''
  const index = entries.value.findIndex((e) => e.country.iso === country.value?.iso)
  active.value = Math.max(index, 0)
  await nextTick()
  search.value?.focus()
  scrollToActive()
}

function closeList(refocus: boolean) {
  open.value = false
  if (refocus) trigger.value?.focus()
}

function pick(c: Country) {
  country.value = c
  chosen = true
  emit()
  closeList(true)
}

function scrollToActive() {
  list.value?.querySelector<HTMLElement>(`#${CSS.escape(`${uid}-o${active.value}`)}`)?.scrollIntoView?.({ block: 'nearest' })
}

function onSearchKey(event: KeyboardEvent) {
  const last = entries.value.length - 1
  if (event.key === 'ArrowDown') active.value = Math.min(active.value + 1, last)
  else if (event.key === 'ArrowUp') active.value = Math.max(active.value - 1, 0)
  else if (event.key === 'Home') active.value = 0
  else if (event.key === 'End') active.value = Math.max(last, 0)
  else if (event.key === 'Enter') {
    const entry = entries.value[active.value]
    if (entry) pick(entry.country)
  } else if (event.key === 'Escape') closeList(true)
  else return
  event.preventDefault()
  void nextTick(scrollToActive)
}

function onDocumentPointer(event: PointerEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) closeList(false)
}
onMounted(() => document.addEventListener('pointerdown', onDocumentPointer))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointer))
</script>

<template>
  <div ref="root" class="phone">
    <button
      ref="trigger"
      type="button"
      class="country m3-state"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="country ? `${t('personal.phoneCountry')}: ${currentName} +${country.dial}` : t('personal.phoneCountry')"
      @click="open ? closeList(false) : openList()"
    >
      <CountryFlag v-if="country" :iso="country.iso" />
      <span class="dial">{{ country ? `+${country.dial}` : '+' }}</span>
      <svg class="chevron" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M7 10l5 5 5-5z" fill="currentColor" />
      </svg>
    </button>

    <input
      :id="inputId"
      class="number"
      type="tel"
      autocomplete="tel-national"
      :value="number"
      @input="onNumberInput"
    />

    <div v-if="open" class="popup">
      <input
        ref="search"
        v-model="query"
        class="search"
        type="search"
        role="combobox"
        aria-expanded="true"
        :aria-controls="listId"
        :aria-activedescendant="entries.length ? `${uid}-o${active}` : undefined"
        :aria-label="t('personal.phoneSearch')"
        :placeholder="t('personal.phoneSearch')"
        autocomplete="off"
        @keydown="onSearchKey"
      />
      <ul :id="listId" ref="list" class="options" role="listbox" :aria-label="t('personal.phoneCountry')">
        <li
          v-for="(entry, index) in entries"
          :id="`${uid}-o${index}`"
          :key="entry.country.iso"
          class="option"
          :class="{ active: index === active }"
          role="option"
          :aria-selected="entry.country.iso === country?.iso"
          @click="pick(entry.country)"
          @pointermove="active = index"
        >
          <CountryFlag :iso="entry.country.iso" />
          <span class="name">{{ entry.name }}</span>
          <span class="code">+{{ entry.country.dial }}</span>
        </li>
        <li v-if="!entries.length" class="empty" role="presentation">{{ t('personal.phoneNoMatch') }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* Sits in BaseField's container, under the label: the selector and the number share one row. */
.phone {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.country {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  margin-inline-start: -8px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--shape-sm);
  background: transparent;
  color: var(--md-on-surface);
  font: var(--type-body-large);
  letter-spacing: var(--tracking-body-large);
  cursor: pointer;
}

.chevron {
  color: var(--md-on-surface-variant);
}

/* The number is a bare field here: BaseField only styles controls that are its direct children. */
.number {
  flex: 1;
  min-width: 0;
  height: 32px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--md-on-surface);
  font: var(--type-body-large);
  letter-spacing: var(--tracking-body-large);
  outline: none;
}

.popup {
  position: absolute;
  z-index: 30;
  top: calc(100% + 4px);
  left: 0;
  display: flex;
  flex-direction: column;
  width: min(340px, calc(100vw - 32px));
  max-height: 320px;
  border-radius: var(--shape-md);
  background: var(--md-surface-container-highest);
  box-shadow: var(--elevation-3), inset 0 0 0 1px var(--md-outline-variant);
  overflow: hidden;
}

.search {
  flex: none;
  min-height: 48px;
  margin: 0;
  padding: 0 16px;
  border: 0;
  border-bottom: 1px solid var(--md-outline-variant);
  background: transparent;
  color: var(--md-on-surface);
  font: var(--type-body-large);
  outline: none;
}

.options {
  margin: 0;
  padding: 4px 0;
  list-style: none;
  overflow-y: auto;
}

.option {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 16px;
  color: var(--md-on-surface);
  font: var(--type-body-medium);
  cursor: pointer;
}

.option.active {
  background: color-mix(in srgb, var(--md-on-surface) calc(var(--state-hover) * 100%), transparent);
}

.option[aria-selected='true'] .name {
  color: var(--md-primary);
  font-weight: 600;
}

.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code {
  color: var(--md-on-surface-variant);
}

.empty {
  padding: 12px 16px;
  color: var(--md-on-surface-variant);
  font: var(--type-body-medium);
}

@media (forced-colors: active) {
  .option.active {
    outline: 2px solid Highlight;
    outline-offset: -2px;
  }
}
</style>
