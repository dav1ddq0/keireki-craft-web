<script setup lang="ts">
/**
 * The template picker: a grid of cards with a thumbnail, tags and a one-line description.
 * Presentational only: the active template and the accent each card previews come in as
 * props, and a click goes out as `pick`.
 */
import { computed, ref } from 'vue'
import { useI18n } from '@/i18n'
import type { TemplateDefinition } from '@/types/template'
import TemplateThumb from '@/components/ui/TemplateThumb.vue'

const props = defineProps<{
  templates: TemplateDefinition[]
  activeId: string
  /** The accent a card would produce if picked (its own default, or the user's choice). */
  accentFor: (id: string) => string
}>()
const emit = defineEmits<{ pick: [id: string] }>()
const { t } = useI18n()

/** Filters are the templates' own tags (spec 019): a new template is filterable by declaring them. */
const FILTERS = ['tags.oneColumn', 'tags.twoColumn', 'tags.photo', 'tags.ats'] as const
const filter = ref<(typeof FILTERS)[number] | null>(null)
const available = computed(() => FILTERS.filter((tag) => props.templates.some((tpl) => tpl.tags.includes(tag))))
/** The active template stays listed whatever the filter, so the current choice never disappears. */
const shown = computed(() =>
  filter.value === null
    ? props.templates
    : props.templates.filter((tpl) => tpl.tags.includes(filter.value!) || tpl.id === props.activeId),
)
</script>

<template>
  <section class="block">
    <h3 class="subtitle">{{ t('style.template') }}</h3>
    <div class="filters" role="group" :aria-label="t('style.filterLabel')">
      <button type="button" class="filter m3-chip m3-state m3-target" :aria-pressed="filter === null" @click="filter = null">
        {{ t('style.filterAll') }} · {{ templates.length }}
      </button>
      <button
        v-for="tag in available"
        :key="tag"
        type="button"
        class="filter m3-chip m3-state m3-target"
        :aria-pressed="filter === tag"
        @click="filter = filter === tag ? null : tag"
      >
        {{ t(tag) }}
      </button>
    </div>
    <ul class="templates">
      <li v-for="template in shown" :key="template.id">
        <button
          type="button"
          class="card"
          :class="{ 'card--active': activeId === template.id }"
          :aria-pressed="activeId === template.id"
          @click="emit('pick', template.id)"
        >
          <TemplateThumb :template="template" :accent="accentFor(template.id)" />
          <span class="card-name">{{ template.name }}</span>
          <span class="card-tags">
            <span v-for="tag in template.tags" :key="tag" class="tag">{{ t(tag) }}</span>
          </span>
          <span class="card-desc">{{ t(template.descriptionKey) }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subtitle {
  margin: 0;
  font-size: var(--size-14);
  font-weight: 600;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}




.templates {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.templates > li {
  display: flex;
}

/* Every card of a row as tall as the tallest: the description and the tags differ in length. */
.card {
  display: grid;
  align-content: start;
  gap: 4px;
  width: 100%;
  height: 100%;
  text-align: left;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.card--active {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.card-name {
  font-weight: 600;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* Lets someone choose by shape without reading three paragraphs. */
.tag {
  font-size: var(--size-11);
  letter-spacing: 0.02em;
  padding: 1.1px 4px;
  border-radius: var(--shape-full);
  background: var(--surface-2);
  color: var(--text-muted);
  white-space: nowrap;
}

.card--active .tag {
  background: var(--accent-soft);
}

.card-desc {
  font-size: var(--size-12);
  color: var(--text-muted);
  line-height: 1.35;
}

/* Phones: one swipeable row that snaps card by card, instead of a tall grid to scroll past. The
   page above it keeps the preview in view, so a short card is enough to choose by. */
@media (max-width: 640px) {
  .templates {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 2px;
    overscroll-behavior-x: contain;
    padding: 2px 2px 8px;
  }

  .templates > li {
    flex: 0 0 148px;
    scroll-snap-align: start;
  }

  .card-desc {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
</style>
