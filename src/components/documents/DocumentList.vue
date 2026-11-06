<script setup lang="ts">
/** Multi-CV management (spec §8.2, phase 4). */
import { computed, ref } from 'vue'
import { useCvStore } from '@/stores/cv'
import { useUiStore } from '@/stores/ui'
import { formatDate, useI18n } from '@/i18n'
import { createSampleCV } from '@/core/sample'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseField from '@/components/ui/BaseField.vue'
import NoticeBar from '@/components/ui/NoticeBar.vue'
import { useIsPhone } from '@/composables/useIsPhone'
import DocumentCard from './DocumentCard.vue'
import DocumentActionsSheet from './DocumentActionsSheet.vue'
import DocumentTemplateTag from './DocumentTemplateTag.vue'
import type { CVSummary } from '@/types/cv'

const cv = useCvStore()
const ui = useUiStore()
const { t, locale } = useI18n()

const pendingDelete = ref<string | null>(null)
const isPhone = useIsPhone()
const menuDoc = ref<CVSummary | null>(null)
const query = ref('')

/** Focuses a field as it appears, its text selected to be typed over. */
const vFocusSelect = {
  mounted: (el: HTMLInputElement) => {
    el.focus()
    el.select()
  },
}

const label = (doc: CVSummary) => doc.fullName || doc.title || t('documents.untitled')

/** Case- and accent-insensitive, on the name and the document title (spec 018). */
const fold = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const shown = computed(() => {
  const q = fold(query.value.trim())
  if (!q) return cv.documents
  return cv.documents.filter((doc) => fold(`${doc.fullName ?? ''} ${doc.title ?? ''}`).includes(q))
})

async function open(id: string) {
  await cv.open(id)
  ui.view = 'editor'
}

async function loadSample() {
  await cv.createNew({ seed: createSampleCV(locale.value) })
  ui.goTo('personal')
}

async function createBlank() {
  await cv.createNew()
  ui.goTo('personal')
}

async function duplicateFromMenu(id: string) {
  await cv.duplicate(id)
  menuDoc.value = null
}

async function renameFromMenu(id: string, title: string) {
  await cv.rename(id, title)
  menuDoc.value = null
}

/** Desktop: the tile being renamed and the name typed in it (spec 073). */
const renamingId = ref<string | null>(null)
const newTitle = ref('')

function startRename(doc: CVSummary) {
  pendingDelete.value = null
  newTitle.value = doc.title
  renamingId.value = doc.id
}

async function confirmRename(id: string) {
  if (!newTitle.value.trim()) return
  await cv.rename(id, newTitle.value)
  renamingId.value = null
}

async function removeFromMenu(id: string) {
  await cv.remove(id)
  menuDoc.value = null
}

async function confirmDelete(id: string) {
  await cv.remove(id)
  pendingDelete.value = null
}
</script>

<template>
  <section class="documents">
    <header class="head">
      <h2 class="title view-title">{{ t('documents.title') }}</h2>
      <div v-if="!isPhone" class="head-actions">
        <BaseButton @click="loadSample">{{ t('actions.loadSample') }}</BaseButton>
        <BaseButton variant="primary" @click="cv.createNew().then(() => ui.goTo('personal'))">
          + {{ t('actions.newCv') }}
        </BaseButton>
      </div>
    </header>

    <NoticeBar tone="warning">{{ t('notices.localOnly') }}</NoticeBar>

    <p v-if="!cv.documents.length" class="empty">{{ t('documents.empty') }}</p>

    <ul v-else-if="isPhone" class="list list--cards">
      <DocumentCard
        v-for="doc in cv.documents"
        :key="doc.id"
        :doc="doc"
        :active="doc.id === cv.data.meta.id"
        @open="open(doc.id)"
        @menu="menuDoc = doc"
      />
    </ul>

    <template v-else>
      <label class="search">
        <span class="sr-only">{{ t('documents.search') }}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input v-model="query" type="search" :placeholder="t('documents.search')" />
        <span class="count">{{ cv.documents.length === 1 ? t('documents.countOne') : t('documents.count', { n: cv.documents.length }) }}</span>
      </label>

      <ul class="grid">
        <li>
          <button type="button" class="tile tile--new" @click="createBlank">
            <span class="plus" aria-hidden="true">+</span>
            <span class="tile-name">{{ t('documents.newTile') }}</span>
            <span class="meta">{{ t('documents.newHint') }}</span>
          </button>
        </li>
        <li v-for="doc in shown" :key="doc.id" class="tile" :class="{ 'tile--active': doc.id === cv.data.meta.id }">
          <button type="button" class="tile-open" @click="open(doc.id)">
            <span class="tile-name">{{ label(doc) }}</span>
            <span v-if="doc.title && doc.title !== label(doc)" class="meta">{{ doc.title }}</span>
            <span class="meta">{{ t('documents.updated', { date: formatDate(doc.updatedAt) }) }}</span>
            <DocumentTemplateTag :doc="doc" />
          </button>

          <form v-if="renamingId === doc.id" class="rename" @submit.prevent="confirmRename(doc.id)">
            <!-- Focused as it opens, the name selected; Esc gives up. -->
            <BaseField v-slot="{ id }" :label="t('header.docTitle')">
              <input :id="id" v-model="newTitle" v-focus-select type="text" autocomplete="off" @keydown.esc.stop="renamingId = null" />
            </BaseField>
            <div class="confirm">
              <BaseButton size="sm" @click="renamingId = null">{{ t('actions.cancel') }}</BaseButton>
              <BaseButton size="sm" variant="primary" type="submit" :disabled="!newTitle.trim()">
                {{ t('actions.save') }}
              </BaseButton>
            </div>
          </form>
          <div v-else-if="pendingDelete === doc.id" class="confirm">
            <span class="confirm-text">{{ t('documents.deleteConfirm', { title: doc.title }) }}</span>
            <BaseButton size="sm" @click="pendingDelete = null">{{ t('actions.cancel') }}</BaseButton>
            <BaseButton size="sm" variant="danger" @click="confirmDelete(doc.id)">
              {{ t('actions.confirm') }}
            </BaseButton>
          </div>
          <div v-else class="actions">
            <BaseButton size="sm" @click="open(doc.id)">{{ t('actions.open') }}</BaseButton>
            <BaseButton size="sm" @click="startRename(doc)">{{ t('actions.rename') }}</BaseButton>
            <BaseButton size="sm" @click="cv.duplicate(doc.id)">{{ t('actions.duplicate') }}</BaseButton>
            <BaseButton size="sm" variant="danger" @click="pendingDelete = doc.id">
              {{ t('actions.remove') }}
            </BaseButton>
          </div>
        </li>
      </ul>
      <p v-if="query && !shown.length" class="empty">{{ t('documents.noMatch', { q: query }) }}</p>
    </template>
    <div v-if="isPhone" class="bottom">
      <BaseButton variant="primary" class="big" @click="createBlank">+ {{ t('actions.newCv') }}</BaseButton>
      <div class="pair">
        <BaseButton class="big" @click="loadSample">{{ t('actions.loadSample') }}</BaseButton>
        <BaseButton class="big" @click="ui.view = 'import'">{{ t('nav.import') }}</BaseButton>
      </div>
    </div>

    <DocumentActionsSheet
      :open="menuDoc !== null"
      :doc="menuDoc"
      @close="menuDoc = null"
      @rename="renameFromMenu"
      @duplicate="duplicateFromMenu"
      @remove="removeFromMenu"
    />
  </section>
</template>

<style scoped>
.documents {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  max-width: 1180px;
  margin: 0 auto;
  width: 100%;
  min-height: 100%;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.head-actions {
  display: flex;
  gap: 8px;
}

.empty {
  color: var(--text-muted);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* M3 search bar: 56 dp, full shape, surface-container-high. */
.search {
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 520px;
  min-height: 56px;
  padding: 0 16px;
  border-radius: var(--shape-full);
  background: var(--md-surface-container-high);
  color: var(--md-on-surface-variant);
}

.search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--md-on-surface);
  font: var(--type-body-large);
  letter-spacing: var(--tracking-body-large);
}

.search:focus-within {
  box-shadow: inset 0 0 0 2px var(--md-primary);
}

.count {
  font: var(--type-label-medium);
  letter-spacing: var(--tracking-label);
  white-space: nowrap;
}

.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.tile {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  min-height: 150px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--shape-md);
  background: var(--surface);
}

.tile--active {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.tile--new {
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 2px dashed var(--border);
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: center;
  cursor: pointer;
}

.tile--new:hover {
  border-color: var(--accent);
}

.plus {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: var(--size-22);
  font-weight: 700;
}

.tile-open {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.tile-name {
  font-weight: 600;
}

.meta {
  margin: 0;
  font-size: var(--size-12);
  color: var(--text-muted);
}

.actions,
.confirm {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.rename {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list--cards {
  flex: 1;
}

/* Phones: the create actions stay at the bottom edge, within the thumb's reach. */
.bottom {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 -20px;
  padding: 12px 20px calc(16px + var(--safe-bottom));
  background: var(--bg);
}

.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.big {
  min-height: 52px;
  justify-content: center;
}

.confirm-text {
  font-size: var(--size-12);
  color: var(--text-muted);
}
</style>
