<script setup lang="ts">
/**
 * Desktop export (spec 018): pick a format, see what is still missing, run it. A modal native
 * <dialog>: focus trap, Esc and focus return come free, as in BottomSheet.
 */
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { useModalDialog } from '@/composables/useModalDialog'
import { useUiStore, type StepId } from '@/stores/ui'
import { useCvStore } from '@/stores/cv'
import { useI18n } from '@/i18n'
import { stepStatus } from '@/core/stepStatus'
import { useCvExport, type ExportKind } from '@/composables/useCvExport'
import { printTitle } from '@/services/export'
import { useSideColumnFit } from '@/composables/useSideColumnFit'
import BaseButton from '@/components/ui/BaseButton.vue'
import FileNameField from './FileNameField.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const ui = useUiStore()
const cv = useCvStore()
const { t } = useI18n()
const { busy, failed, run } = useCvExport()
const { overflows: sideTooLong } = useSideColumnFit()

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const titleId = useId()
const kind = ref<ExportKind>('pdfFile')

useModalDialog(dialog, () => props.open)

/** The file name, for this download only: each opening starts from the default again (spec 073). */
const defaultName = computed(() => printTitle(cv.data))
const name = ref('')
watch(
  () => props.open,
  (open) => {
    if (open) name.value = defaultName.value
  },
  { immediate: true },
)

const FORMATS: { kind: ExportKind; title: string; hint: string }[] = [
  { kind: 'pdfFile', title: 'exportView.pdfFile', hint: 'exportView.pdfFileHint' },
  { kind: 'pdf', title: 'exportView.pdf', hint: 'exportView.pdfHint' },
  { kind: 'jpg', title: 'exportView.image', hint: 'exportView.imageHint' },
  { kind: 'html', title: 'exportView.html', hint: 'exportView.htmlHint' },
  { kind: 'json', title: 'exportView.json', hint: 'exportView.jsonHint' },
]

/** Core steps still empty; advisory, never blocking (spec §5). */
const missing = computed(() => ui.steps.filter((id) => stepStatus(cv.data, id).state === 'incomplete'))

const ACTIONS: Record<ExportKind, string> = {
  pdfFile: 'exportView.downloadPdf',
  pdf: 'exportView.print',
  jpg: 'exportView.downloadImage',
  html: 'exportDialog.downloadHtml',
  json: 'exportDialog.downloadJson',
}
const action = computed(() => t(ACTIONS[kind.value]))

const EXTENSIONS: Record<ExportKind, string> = { pdfFile: '.pdf', pdf: '', jpg: '.jpg', html: '.html', json: '.json' }

function goFix(id: StepId) {
  ui.goTo(id)
  dialog.value?.close()
}

async function confirm() {
  // A direct download keeps the dialog open while it is built, so a failure can be shown here.
  if (kind.value === 'pdfFile' || kind.value === 'jpg') {
    if (await run(kind.value, name.value)) dialog.value?.close()
    return
  }
  // The print dialog must not open on top of a modal that is still showing.
  dialog.value?.close()
  await run(kind.value, name.value)
}

function printInstead() {
  kind.value = 'pdf'
  void confirm()
}
</script>

<template>
  <dialog ref="dialog" class="export" :aria-labelledby="titleId" @close="emit('close')">
    <header class="head">
      <h2 :id="titleId" class="title">{{ t('exportView.title') }}</h2>
      <button type="button" class="close m3-icon-btn m3-state m3-target" :aria-label="t('actions.close')" @click="dialog?.close()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </header>

    <div class="formats" role="radiogroup" :aria-labelledby="titleId">
      <label v-for="format in FORMATS" :key="format.kind" class="format" :class="{ 'format--on': kind === format.kind }">
        <input v-model="kind" type="radio" name="export-kind" :value="format.kind" />
        <span class="format-text">
          <span class="format-title">
            {{ t(format.title) }}
            <span v-if="format.kind === 'pdfFile'" class="badge">{{ t('exportDialog.recommended') }}</span>
          </span>
          <span class="format-hint">{{ t(format.hint) }}</span>
        </span>
      </label>
    </div>
    <p v-if="kind === 'pdf'" class="note">{{ t('exportDialog.printNote', { file: defaultName }) }}</p>
    <FileNameField v-else v-model="name" :fallback="defaultName" :ext="EXTENSIONS[kind]" />
    <div v-if="failed === 'pdfFile'" class="failed" role="alert">
      <p class="failed-text">{{ t('exportView.pdfFileFailed') }}</p>
      <BaseButton variant="secondary" @click="printInstead">{{ t('exportView.printInstead') }}</BaseButton>
    </div>
    <p v-if="failed === 'jpg'" class="failed failed-text" role="alert">{{ t('exportView.imageFailed') }}</p>

    <section class="check" :aria-label="t('exportDialog.checkTitle')">
      <h3 class="check-title">{{ t('exportDialog.checkTitle') }}</h3>
      <p v-if="sideTooLong" class="side-warning">{{ t('exportView.sideTooLong') }}</p>
      <p v-if="!missing.length" class="ok">{{ t('exportDialog.allGood') }}</p>
      <ul v-else class="missing">
        <li v-for="id in missing" :key="id">
          <button type="button" class="fix" @click="goFix(id)">{{ t('exportDialog.missing', { step: t(`steps.${id}`) }) }}</button>
        </li>
      </ul>
    </section>

    <footer class="foot">
      <BaseButton variant="secondary" @click="dialog?.close()">{{ t('actions.cancel') }}</BaseButton>
      <BaseButton variant="primary" :disabled="busy !== null" @click="confirm">
        {{ busy ? t('exportView.preparing') : action }}
      </BaseButton>
    </footer>
  </dialog>
</template>

<style scoped>
.export {
  width: min(560px, calc(100vw - 32px));
  padding: 20px 20px;
  border: 0;
  border-radius: var(--shape-xl);
  background: var(--md-surface-container-high);
  color: var(--md-on-surface);
  box-shadow: var(--elevation-3);
}

.export[open] {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.export::backdrop {
  background: rgb(0 0 0 / 0.32);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  margin: 0;
  font: var(--type-headline-small);
}

.close {
  width: 40px;
  height: 40px;
}

.formats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.format {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--shape-md);
  cursor: pointer;
}

.format--on {
  border-color: transparent;
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.format input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--md-primary);
}

.format-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.format-title {
  font-weight: 600;
}

.format-hint,
.note {
  font-size: var(--size-12);
  color: var(--text-muted);
}

.note {
  margin: -4px 0 0;
}

.badge {
  margin-left: 4px;
  padding: 1.1px 8px;
  border-radius: var(--shape-md);
  background: var(--md-success-container);
  color: var(--md-on-success-container);
  font-size: var(--size-11);
  font-weight: 700;
}


.check {
  padding: 12px 16px;
  border-radius: var(--shape-md);
  /* The dialog itself is surface-container-high; one step up or down would vanish in one theme (spec 038). */
  background: var(--md-surface-container-lowest);
}

.check-title {
  margin: 0 0 4px;
  font-size: var(--size-12);
  font-weight: 700;
}

.ok {
  margin: 0;
  font-size: var(--size-12);
}

.missing {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fix {
  padding: 2px 0;
  border: 0;
  background: none;
  color: var(--md-warning);
  font: inherit;
  font-size: var(--size-12);
  text-decoration: underline;
  cursor: pointer;
}


.foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.failed {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 12px 16px;
  border-radius: var(--shape-md);
  background: var(--md-error-container);
  color: var(--md-on-error-container);
}

.failed-text {
  flex: 1 1 16em;
  margin: 0;
  font: var(--type-body-medium);
}

.side-warning {
  margin: 0 0 8px;
  padding: 8px 12px;
  border-radius: var(--shape-md);
  background: var(--md-warning-container);
  color: var(--md-on-warning-container);
  font: var(--type-body-medium);
}
</style>
