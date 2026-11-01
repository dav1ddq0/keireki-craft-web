<script setup lang="ts">
/**
 * A country's flag (spec 056), from the `flag-icons` package (MIT). Each flag is its own lazily
 * loaded asset and is only fetched once the box is on screen, so a list of 250 countries does not
 * download 250 files. Decorative: the country is always named in text next to it. An empty box of
 * the same size shows while the file loads.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ iso: string }>()

const loaders = import.meta.glob<string>('/node_modules/flag-icons/flags/4x3/??.svg', {
  query: '?url',
  import: 'default',
})

const root = ref<HTMLElement | null>(null)
const url = ref('')
// Without IntersectionObserver (old browsers, tests) the flag is simply loaded at once.
const seen = ref(typeof IntersectionObserver === 'undefined')
let observer: IntersectionObserver | undefined

onMounted(() => {
  if (seen.value || !root.value) return
  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      seen.value = true
      observer?.disconnect()
    }
  })
  observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())

watch(
  [() => props.iso, seen],
  async ([iso, visible]) => {
    url.value = ''
    if (!visible) return
    const load = loaders[`/node_modules/flag-icons/flags/4x3/${iso.toLowerCase()}.svg`]
    if (!load) return
    const loaded = await load()
    if (props.iso === iso) url.value = loaded
  },
  { immediate: true },
)
</script>

<template>
  <span ref="root" class="flag" :class="{ 'flag--empty': !url }" aria-hidden="true">
    <img v-if="url" :src="url" alt="" width="20" height="15" />
  </span>
</template>

<style scoped>
.flag {
  display: inline-block;
  flex: none;
  width: 20px;
  height: 15px;
  border-radius: 2px;
  overflow: hidden;
  box-shadow: 0 0 0 1px color-mix(in srgb, currentColor 18%, transparent);
}

.flag img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.flag--empty {
  background: color-mix(in srgb, currentColor 10%, transparent);
}
</style>
