<script setup lang="ts">
/**
 * A country's flag (spec 056), from the `flag-icons` package (MIT). Each flag is its own lazily
 * loaded asset, so only the ones on screen are downloaded. Decorative: the country is always
 * named in text next to it. Shows an empty box of the same size while the file loads.
 */
import { ref, watch } from 'vue'

const props = defineProps<{ iso: string }>()

const loaders = import.meta.glob<string>('/node_modules/flag-icons/flags/4x3/??.svg', {
  query: '?url',
  import: 'default',
})

const url = ref('')

watch(
  () => props.iso,
  async (iso) => {
    url.value = ''
    const load = loaders[`/node_modules/flag-icons/flags/4x3/${iso.toLowerCase()}.svg`]
    if (!load) return
    const loaded = await load()
    if (props.iso === iso) url.value = loaded
  },
  { immediate: true },
)
</script>

<template>
  <img v-if="url" class="flag" :src="url" alt="" aria-hidden="true" width="20" height="15" />
  <span v-else class="flag flag--empty" aria-hidden="true" />
</template>

<style scoped>
.flag {
  display: inline-block;
  flex: none;
  width: 20px;
  height: 15px;
  border-radius: 2px;
  object-fit: cover;
  box-shadow: 0 0 0 1px color-mix(in srgb, currentColor 18%, transparent);
}

.flag--empty {
  background: color-mix(in srgb, currentColor 10%, transparent);
}
</style>
