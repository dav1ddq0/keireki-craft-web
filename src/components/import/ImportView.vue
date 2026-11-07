<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import type { CVData } from '@/types/cv'
import { useCvStore, type RestorePlan } from '@/stores/cv'
import { useUiStore } from '@/stores/ui'
import { useI18n } from '@/i18n'
import { readImportFile, UnsupportedBackupError } from '@/services/export'
import { UnsupportedSchemaError } from '@/core/migrations'
import { readPrefs } from '@/services/prefs'
import { StorageQuotaError } from '@/services/storage'
import { analyze, extractDocument, type ImportDraft } from '@/services/pdfImport'
import BaseButton from '@/components/ui/BaseButton.vue'
import NoticeBar from '@/components/ui/NoticeBar.vue'
import FileDropzone from './FileDropzone.vue'
import PdfReview from './PdfReview.vue'

const cv = useCvStore()
const ui = useUiStore()
const { t } = useI18n()

const draft = shallowRef<ImportDraft | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)
/** A backup that would replace CVs, waiting for the person to confirm (spec 078). */
const pendingRestore = shallowRef<RestorePlan | null>(null)
/** What the last restore did, for its summary. */
const restored = ref<{ restored: number; skipped: number; replaced: number } | null>(null)

const failure = (cause: unknown) =>
  cause instanceof UnsupportedBackupError
    ? t('importView.backupNewer')
    : cause instanceof UnsupportedSchemaError
      ? t('importView.schemaError')
      : cause instanceof StorageQuotaError
        ? t('notices.quota')
        : t('importView.parseError')

/** One CV's JSON opens as a new CV; a backup of every CV is restored (spec 078). */
async function onJson(file: File) {
  error.value = null
  restored.value = null
  pendingRestore.value = null
  try {
    const read = await readImportFile(file)
    if (read.kind === 'cv') {
      await cv.importData(read.data, 'new')
      ui.goTo('personal')
      return
    }
    const plan = await cv.planRestore(read.cvs)
    if (plan.changed.length) pendingRestore.value = plan
    else await restore(plan)
  } catch (cause) {
    error.value = failure(cause)
  }
}

async function restore(plan: RestorePlan) {
  pendingRestore.value = null
  try {
    restored.value = await cv.restoreBackup(plan)
  } catch (cause) {
    error.value = failure(cause)
  }
}

async function onPdf(file: File) {
  error.value = null
  draft.value = null
  busy.value = true
  try {
    const extracted = await extractDocument(file)
    if (!extracted.hasTextLayer) {
      error.value = t('importView.noText')
      return
    }
    draft.value = analyze(extracted)
  } catch {
    error.value = t('importView.parseError')
  } finally {
    busy.value = false
  }
}

/** A PDF says nothing about templates: over the open CV keep its own, a new CV gets the last pick. */
async function apply(data: CVData, mode: 'new' | 'current') {
  data.meta.templateId = mode === 'current' ? cv.templateId : readPrefs().lastTemplateId
  await cv.importData(data, mode)
  draft.value = null
  ui.goTo('personal')
}
</script>

<template>
  <section class="import">
    <h2 class="title view-title">{{ t('importView.title') }}</h2>

    <NoticeBar v-if="error" tone="warning">{{ error }}</NoticeBar>

    <!-- Restoring a backup over CVs that changed since: confirmed first (spec 078). -->
    <NoticeBar v-if="pendingRestore" tone="warning" class="restore-confirm">
      {{ t('importView.restoreConfirm', { n: pendingRestore.changed.length }) }}
      <template #actions>
        <BaseButton size="sm" @click="pendingRestore = null">{{ t('actions.cancel') }}</BaseButton>
        <BaseButton size="sm" variant="primary" @click="restore(pendingRestore)">{{ t('actions.confirm') }}</BaseButton>
      </template>
    </NoticeBar>

    <NoticeBar v-if="restored" class="restore-done">
      {{ t('importView.restoreDone', restored) }}
      <template #actions>
        <BaseButton size="sm" @click="ui.view = 'documents'">{{ t('nav.documents') }}</BaseButton>
      </template>
    </NoticeBar>

    <template v-if="!draft">
      <article class="card">
        <h3 class="card-title">{{ t('importView.json') }}</h3>
        <p class="card-hint">{{ t('importView.jsonHint') }}</p>
        <FileDropzone accept=".json,application/json" hint="JSON" @file="onJson" />
      </article>

      <article class="card">
        <h3 class="card-title">{{ t('importView.pdf') }}</h3>
        <p class="card-hint">{{ t('importView.pdfHint') }}</p>
        <FileDropzone accept=".pdf,application/pdf" hint="PDF" :busy="busy" @file="onPdf">
          {{ busy ? t('importView.analyzing') : t('importView.dropzone') }}
        </FileDropzone>
      </article>
    </template>

    <template v-else>
      <PdfReview :draft="draft" @apply="apply" />
      <div class="cancel">
        <BaseButton variant="ghost" @click="draft = null">{{ t('actions.cancel') }}</BaseButton>
      </div>
    </template>
  </section>
</template>

<style scoped>
.import {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

/* The PDF review puts the source text beside it on wide screens (spec 019). */
@media (min-width: 1001px) {
  .import {
    max-width: 1280px;
  }
}

.card {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-title {
  margin: 0;
  font-size: 1em;
}

.card-hint {
  margin: 0;
  font-size: var(--size-12);
  color: var(--text-muted);
}

.cancel {
  display: flex;
  justify-content: flex-start;
}
</style>
