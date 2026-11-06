<script setup lang="ts">
/**
 * The name of the exported file, for this download only (spec 073). When one format is chosen its
 * extension sits fixed after the name, so it can be neither lost nor doubled; cleared, the hint
 * names the default that will be used.
 */
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import BaseField from '@/components/ui/BaseField.vue'

const name = defineModel<string>({ required: true })
const props = defineProps<{
  /** The default name, used when the field is left empty. */
  fallback: string
  /** `.pdf`, `.jpg`…; none where every format is one tap away (the phone sheet, the export step). */
  ext?: string
}>()

const { t } = useI18n()

const hint = computed(() =>
  name.value.trim() ? t('exportView.fileNameHint') : t('exportView.fileNameEmpty', { file: props.fallback }),
)
</script>

<template>
  <BaseField v-slot="{ id }" :label="t('exportView.fileName')" :hint="hint">
    <!-- Room for the extension at the end; inline, as BaseField pads its input itself. -->
    <input
      :id="id"
      v-model="name"
      type="text"
      autocomplete="off"
      spellcheck="false"
      :placeholder="fallback"
      :style="ext ? { paddingRight: `calc(16px + ${ext.length + 1}ch)` } : undefined"
    />
    <span v-if="ext" class="ext" aria-hidden="true">{{ ext }}</span>
  </BaseField>
</template>

<style scoped>
/* On the input's line: BaseField gives it the input's padding, so the two baselines meet. */
.ext {
  position: absolute;
  top: 0;
  right: 0;
  pointer-events: none;
  font: var(--type-body-large);
  letter-spacing: var(--tracking-body-large);
  color: var(--md-on-surface-variant);
}
</style>
