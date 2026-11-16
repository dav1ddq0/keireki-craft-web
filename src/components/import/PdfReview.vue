<script setup lang="ts">
/**
 * Stage 3 of PDF import (spec §7.2): nothing is ever applied silently.
 *
 * The draft is editable here, low-confidence detections are flagged, and every
 * unclassified block must be sent somewhere explicitly — the default is discard.
 */
import { computed, reactive, ref } from 'vue'
import type { BlockTarget, ImportDraft, ReviewDecisions } from '@/services/pdfImport'
import { assembleCV } from '@/services/pdfImport'
import type { CVData } from '@/types/cv'
import { useI18n } from '@/i18n'
import BaseField from '@/components/ui/BaseField.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import NoticeBar from '@/components/ui/NoticeBar.vue'
import { useIsDesktop } from '@/composables/useIsPhone'

const props = defineProps<{ draft: ImportDraft }>()
const emit = defineEmits<{ apply: [cv: CVData, mode: 'new' | 'current'] }>()
const { t } = useI18n()

const TARGETS: BlockTarget[] = ['discard', 'summary', 'experience', 'education', 'skills', 'languages', 'custom']

/** Editable copy of the detected fields; the draft itself stays immutable. */
const fields = reactive({
  fullName: props.draft.fullName.value,
  headline: props.draft.headline.value,
  email: props.draft.email.value,
  phone: props.draft.phone.value,
  location: props.draft.location.value,
})

const blocks = reactive<Record<string, BlockTarget>>(
  Object.fromEntries(props.draft.unclassified.map((block) => [block.id, 'discard' as BlockTarget])),
)

const showRaw = ref(false)
/** Wide screens show the extracted text beside the review, always (spec 019). */
const isDesktop = useIsDesktop()

const decisions = computed<ReviewDecisions>(() => ({
  personal: {
    fullName: fields.fullName,
    email: fields.email,
    phone: fields.phone,
    location: fields.location,
  },
  headline: fields.headline,
  blocks: { ...blocks },
}))

const counts = computed(() => ({
  experience: props.draft.sections.filter((s) => s.kind === 'experience').length,
  education: props.draft.sections.filter((s) => s.kind === 'education').length,
  skills: props.draft.sections.filter((s) => s.kind === 'skills').length,
}))

const lowConfidence = (key: 'fullName' | 'headline' | 'email' | 'phone' | 'location') =>
  props.draft[key].confidence === 'low' ? t('importView.lowConfidence') : undefined

function targetLabel(target: BlockTarget): string {
  if (target === 'discard') return t('importView.discard')
  if (target === 'custom') return t('custom.add')
  return t(`steps.${target}`)
}

function apply(mode: 'new' | 'current') {
  emit('apply', assembleCV(props.draft, decisions.value), mode)
}
</script>

<template>
  <div class="review" :class="{ 'review--split': isDesktop }">
    <div class="review-main">
      <header>
        <h3 class="title">{{ t('importView.reviewTitle') }}</h3>
        <p class="hint">{{ t('importView.reviewHint') }}</p>
      </header>

      <NoticeBar tone="warning">{{ t('notices.importIsAnAid') }}</NoticeBar>
      <NoticeBar v-if="draft.warnings.includes('multiColumn')" tone="warning">
        {{ t('importView.pdfHint') }}
      </NoticeBar>

      <section class="fields">
        <BaseField v-slot="{ id }" :label="t('personal.fullName')" :warning="lowConfidence('fullName')">
          <input :id="id" v-model="fields.fullName" />
        </BaseField>
        <BaseField v-slot="{ id }" :label="t('personal.headline')" :warning="lowConfidence('headline')">
          <input :id="id" v-model="fields.headline" />
        </BaseField>
        <BaseField v-slot="{ id }" :label="t('personal.email')" :warning="lowConfidence('email')">
          <input :id="id" v-model="fields.email" />
        </BaseField>
        <BaseField v-slot="{ id }" :label="t('personal.phone')" :warning="lowConfidence('phone')">
          <input :id="id" v-model="fields.phone" />
        </BaseField>
        <BaseField v-slot="{ id }" :label="t('personal.location')" :warning="lowConfidence('location')">
          <input :id="id" v-model="fields.location" />
        </BaseField>
      </section>

      <p class="detected">
        {{ t('steps.experience') }}: {{ counts.experience }} ·
        {{ t('steps.education') }}: {{ counts.education }} ·
        {{ t('steps.skills') }}: {{ counts.skills }} ·
        {{ t('personal.links') }}: {{ draft.links.length }}
      </p>

      <section v-if="draft.unclassified.length" class="blocks">
        <h4 class="subtitle">{{ t('importView.unclassified') }}</h4>
        <p class="hint">{{ t('importView.unclassifiedHint') }}</p>

        <article v-for="block in draft.unclassified" :key="block.id" class="block">
          <div class="block-body">
            <p v-if="block.heading" class="block-heading">{{ block.heading }}</p>
            <p v-for="(line, index) in block.lines.slice(0, 6)" :key="index" class="block-line">
              {{ line }}
            </p>
            <p v-if="block.lines.length > 6" class="block-more">+{{ block.lines.length - 6 }}</p>
          </div>
          <label class="assign">
            <span class="assign-label">{{ t('importView.assignTo') }}</span>
            <select v-model="blocks[block.id]">
              <option v-for="target in TARGETS" :key="target" :value="target">
                {{ targetLabel(target) }}
              </option>
            </select>
          </label>
        </article>
      </section>

      <section v-if="!isDesktop" class="raw">
        <BaseButton size="sm" @click="showRaw = !showRaw">{{ t('importView.rawText') }}</BaseButton>
        <pre v-if="showRaw" class="raw-text">{{ draft.rawText }}</pre>
      </section>

      <footer class="footer">
        <BaseButton @click="apply('current')">{{ t('importView.applyToCurrent') }}</BaseButton>
        <BaseButton variant="primary" @click="apply('new')">{{ t('importView.apply') }}</BaseButton>
      </footer>
    </div>

    <aside v-if="isDesktop" class="source" :aria-label="t('importView.rawText')">
      <h4 class="subtitle">{{ t('importView.rawText') }}</h4>
      <pre class="source-text">{{ draft.rawText }}</pre>
    </aside>
  </div>
</template>

<style scoped>
.review,
.review-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Desktop: review on the left, the text it came from on the right, scrolling on its own. */
.review--split {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.source {
  position: sticky;
  top: 1em;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-text {
  max-height: calc(100vh - 10em);
  overflow: auto;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  font-size: var(--size-12);
  line-height: 1.55;
  white-space: pre-wrap;
}

.title {
  margin: 0;
  font-size: var(--size-16);
}

.hint {
  margin: 2px 0 0;
  font-size: var(--size-12);
  color: var(--text-muted);
}

.subtitle {
  margin: 0;
  font-size: var(--size-14);
}

.fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}

.detected {
  margin: 0;
  font-size: var(--size-12);
  color: var(--text-muted);
}

.blocks {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.block {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: start;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.block-heading {
  margin: 0 0 4px;
  font-weight: 600;
  font-size: var(--size-14);
}

.block-line {
  margin: 0;
  font-size: var(--size-12);
  color: var(--text-muted);
}

.block-more {
  margin: 2px 0 0;
  font-size: var(--size-12);
  color: var(--text-muted);
}

.assign {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.assign-label {
  font-size: var(--size-11);
  color: var(--text-muted);
}

.assign select {
  /* The native control's width (its longest option); a customizable select (spec 091) sizes to the
     chosen one. */
  min-width: 8rem;
  min-height: 28px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: var(--shape-md);
  background: var(--surface);
}

.raw {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.raw-text {
  width: 100%;
  max-height: 18em;
  overflow: auto;
  margin: 0;
  padding: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: var(--size-12);
  white-space: pre-wrap;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
