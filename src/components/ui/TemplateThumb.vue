<script setup lang="ts">
/**
 * A template's thumbnail: its authored SVG, painted in the accent it would get. Shared by the style
 * step's gallery and the phone's template sheet (spec 064), so the dark-theme mapping lives once.
 */
import type { TemplateDefinition } from '@/types/template'

defineProps<{ template: TemplateDefinition; accent: string }>()
</script>

<template>
  <!-- Static, authored SVG from the template definition — never user input. -->
  <span class="thumb" role="img" :aria-label="template.name" :style="{ color: accent }" v-html="template.thumbnail" />
</template>

<style scoped>
.thumb {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: var(--shape-md);
  border: 1px solid var(--border);
  background: #fff;
}

.thumb :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

/*
 * Dark theme: the thumbnails are drawings of a page, not the CV, so they take the theme's tones
 * instead of glaring white (spec 029). Their four fixed colours map onto M3 roles; white on the
 * accent (headers) stays white.
 */
:root[data-theme='dark'] .thumb {
  background: var(--md-surface-container-highest);
}

:root[data-theme='dark'] .thumb :deep(svg > rect:first-child[fill='#fff']) {
  fill: var(--md-surface-container-highest);
}

:root[data-theme='dark'] .thumb :deep([fill='#1f2937']) {
  fill: var(--md-on-surface);
}

:root[data-theme='dark'] .thumb :deep([fill='#9ca3af']) {
  fill: var(--md-on-surface-variant);
}

:root[data-theme='dark'] .thumb :deep([fill='#d1d5db']) {
  fill: var(--md-outline-variant);
}
</style>
