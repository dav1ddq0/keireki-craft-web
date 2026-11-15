<script setup lang="ts">
/** A line of text with the letters that match the search marked (spec 089). */
import { computed } from 'vue'
import { highlightParts } from '@/core/searchMatch'

const props = defineProps<{ text: string; query: string }>()

const parts = computed(() => highlightParts(props.text, props.query))
</script>

<template>
  <template v-for="(part, index) in parts" :key="index">
    <mark v-if="part.match" class="match">{{ part.text }}</mark>
    <template v-else>{{ part.text }}</template>
  </template>
</template>

<style scoped>
/* A fill with no padding: the box-shadow gives it room without moving the text. */
.match {
  border-radius: 3px;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  box-shadow: 0 0 0 1px var(--md-primary-container);
}

@media (forced-colors: active) {
  .match {
    background: Mark;
    color: MarkText;
    box-shadow: none;
  }
}
</style>
