<script setup lang="ts">
/** Every export in one phone sheet: the dock has room for a single Export button (specs 013, 016). */
import { useI18n } from '@/i18n'
import { useCvExport, type ExportKind } from '@/composables/useCvExport'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useCvStore } from '@/stores/cv'
import { printTitle } from '@/services/export'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const cv = useCvStore()
const { busy, failed, run } = useCvExport()

const OPTIONS: { kind: ExportKind; title: string; hint: string }[] = [
  { kind: 'pdfFile', title: 'exportView.pdfFile', hint: 'exportView.pdfFileHint' },
  { kind: 'pdf', title: 'exportView.pdf', hint: 'exportView.pdfHint' },
  { kind: 'jpg', title: 'exportView.image', hint: 'exportView.imageHint' },
  { kind: 'html', title: 'exportView.html', hint: 'exportView.htmlHint' },
  { kind: 'json', title: 'exportView.json', hint: 'exportView.jsonHint' },
]

/** "Preparing…" while that export runs; otherwise what tapping the row does. */
function actionLabel(kind: ExportKind): string {
  if (busy.value === kind) return t('exportView.preparing')
  return t(kind === 'pdf' ? 'exportView.printShort' : 'exportView.download')
}

/** A direct PDF that fails keeps the sheet open, with printing offered instead. */
async function pick(kind: ExportKind) {
  if (await run(kind)) emit('close')
}
</script>

<template>
  <BottomSheet :open="open" :title="t('exportView.title')" @close="emit('close')">
    <div v-if="failed === 'pdfFile'" class="failed" role="alert">
      <p class="failed-text">{{ t('exportView.pdfFileFailed') }}</p>
      <button type="button" class="retry" :disabled="busy !== null" @click="pick('pdf')">{{ t('exportView.printInstead') }}</button>
    </div>
    <div v-if="failed === 'jpg'" class="failed" role="alert">
      <p class="failed-text">{{ t('exportView.imageFailed') }}</p>
    </div>
    <ul class="list">
      <li v-for="option in OPTIONS" :key="option.kind">
        <button type="button" class="row" :disabled="busy !== null" @click="pick(option.kind)">
          <span class="text">
            <span class="name">{{ t(option.title) }}</span>
            <span class="hint">{{ t(option.hint) }}</span>
            <span v-if="option.kind === 'pdf'" class="hint">{{ t('exportDialog.printNote', { file: printTitle(cv.data) }) }}</span>
          </span>
          <span class="action">{{ actionLabel(option.kind) }}</span>
        </button>
      </li>
    </ul>
  </BottomSheet>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 0;
  padding: 0 0 calc(16px + var(--safe-bottom));
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  min-height: 64px;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--shape-lg);
  background: var(--surface);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.row:disabled {
  opacity: 0.6;
  cursor: default;
}

.text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.name {
  font-weight: 600;
}

.hint {
  font-size: var(--size-12);
  color: var(--text-muted);
}

.action {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--accent);
}

.failed {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin: 0 0 12px;
  padding: 12px 16px;
  border-radius: var(--shape-md);
  background: var(--md-error-container);
  color: var(--md-on-error-container);
}

.failed-text {
  flex: 1 1 14em;
  margin: 0;
  font: var(--type-body-medium);
}

.retry {
  min-height: 48px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--shape-full);
  background: var(--md-error);
  color: var(--md-on-error);
  font: var(--type-label-large);
  cursor: pointer;
}
</style>
