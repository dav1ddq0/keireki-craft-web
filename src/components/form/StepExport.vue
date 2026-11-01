<script setup lang="ts">
import { ref } from 'vue'
import { useCvStore } from '@/stores/cv'
import { useI18n } from '@/i18n'
import { useCvExport } from '@/composables/useCvExport'
import { printTitle } from '@/services/export'
import BaseButton from '@/components/ui/BaseButton.vue'
import NoticeBar from '@/components/ui/NoticeBar.vue'
import PaginatedPreview from '@/components/preview/PaginatedPreview.vue'
import ReviewCard from './ReviewCard.vue'
import { useSideColumnFit } from '@/composables/useSideColumnFit'

const cv = useCvStore()
const { t } = useI18n()

const showPaginated = ref(false)
const { busy, failed, run } = useCvExport()
const { overflows: sideTooLong } = useSideColumnFit()
</script>

<template>
  <div class="step">
    <NoticeBar tone="warning">{{ t('notices.localOnly') }}</NoticeBar>

    <ReviewCard />

    <NoticeBar v-if="sideTooLong" tone="warning">{{ t('exportView.sideTooLong') }}</NoticeBar>

    <ul class="options">
      <li class="option">
        <div>
          <h3 class="option-title">{{ t('exportView.pdfFile') }}</h3>
          <p class="option-hint">{{ t('exportView.pdfFileHint') }}</p>
        </div>
        <BaseButton variant="primary" :disabled="busy !== null" @click="run('pdfFile')">
          {{ busy === 'pdfFile' ? t('exportView.preparing') : t('exportView.downloadPdf') }}
        </BaseButton>
        <div v-if="failed === 'pdfFile'" class="failed" role="alert">
          <NoticeBar tone="warning">{{ t('exportView.pdfFileFailed') }}</NoticeBar>
          <BaseButton variant="tonal" :disabled="busy !== null" @click="run('pdf')">{{ t('exportView.printInstead') }}</BaseButton>
        </div>
      </li>

      <li class="option">
        <div>
          <h3 class="option-title">{{ t('exportView.pdf') }}</h3>
          <p class="option-hint">{{ t('exportView.pdfHint') }}</p>
          <p class="option-hint">{{ t('exportDialog.printNote', { file: printTitle(cv.data) }) }}</p>
        </div>
        <BaseButton variant="tonal" :disabled="busy !== null" @click="run('pdf')">
          {{ busy === 'pdf' ? t('exportView.preparing') : t('exportView.print') }}
        </BaseButton>
      </li>

      <li class="option">
        <div>
          <h3 class="option-title">{{ t('exportView.image') }}</h3>
          <p class="option-hint">{{ t('exportView.imageHint') }}</p>
        </div>
        <BaseButton :disabled="busy !== null" @click="run('jpg')">
          {{ busy === 'jpg' ? t('exportView.preparing') : t('exportView.downloadImage') }}
        </BaseButton>
        <div v-if="failed === 'jpg'" class="failed" role="alert">
          <NoticeBar tone="warning">{{ t('exportView.imageFailed') }}</NoticeBar>
        </div>
      </li>

      <li class="option">
        <div>
          <h3 class="option-title">{{ t('exportView.html') }}</h3>
          <p class="option-hint">{{ t('exportView.htmlHint') }}</p>
        </div>
        <BaseButton :disabled="busy !== null" @click="run('html')">
          {{ t('exportView.download') }}
        </BaseButton>
      </li>

      <li class="option">
        <div>
          <h3 class="option-title">{{ t('exportView.json') }}</h3>
          <p class="option-hint">{{ t('exportView.jsonHint') }}</p>
        </div>
        <BaseButton :disabled="busy !== null" @click="run('json')">
          {{ t('exportView.download') }}
        </BaseButton>
      </li>
    </ul>

    <section class="paginated">
      <div class="paginated-head">
        <div>
          <h3 class="option-title">{{ t('exportView.paginated') }}</h3>
          <p class="option-hint">{{ t('exportView.paginatedHint') }}</p>
        </div>
        <BaseButton size="sm" @click="showPaginated = !showPaginated">
          {{ showPaginated ? t('preview.hide') : t('preview.show') }}
        </BaseButton>
      </div>
      <!-- Mounted on demand: paged.js is a lazy chunk and a full re-render. -->
      <PaginatedPreview v-if="showPaginated" :data="cv.data" :template-id="cv.templateId" />
    </section>
  </div>
</template>

<style scoped>
.step {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.options {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option,
.paginated-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.option > :first-child,
.paginated-head > :first-child {
  flex: 1 1 14em;
  min-width: 0;
}

/* A wrapped action takes the full row so a long label (nowrap) cannot leave the card. */
@media (max-width: 480px) {
  .option > .btn,
  .paginated-head > .btn {
    flex: 1 1 100%;
    justify-content: center;
  }
}

/* The direct PDF failed: the message and the way out take the card's full width. */
.failed {
  display: flex;
  flex: 1 1 100%;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.failed > :first-child {
  flex: 1 1 16em;
}

.option-title {
  margin: 0;
  font-size: var(--size-14);
  font-weight: 600;
}

.option-hint {
  margin: 2px 0 0;
  font-size: var(--size-12);
  color: var(--text-muted);
}

.paginated {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
