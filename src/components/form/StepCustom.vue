<script setup lang="ts">
/** Custom sections plus the render order of *all* sections (spec §3, §11 phase 4). */
import { computed, ref } from 'vue'
import { useCvStore } from '@/stores/cv'
import { useI18n } from '@/i18n'
import { createCustomEntry } from '@/core/factory'
import { SECTION_PRESET_IDS, createSectionFromPreset } from '@/core/sectionPresets'
import { CV_LANGUAGES } from '@/core/stylePresets'
import BaseField from '@/components/ui/BaseField.vue'
import AiImproveButton from '@/components/ui/AiImproveButton.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SortableList from '@/components/ui/SortableList.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useIsPhone } from '@/composables/useIsPhone'

const cv = useCvStore()
const { t } = useI18n()
const isPhone = useIsPhone()
const pickerOpen = ref(false)

/** Stroke paths (24px grid) for the preset tiles of the phone sheet. */
const PRESET_ICONS: Record<(typeof SECTION_PRESET_IDS)[number], string> = {
  courses: 'M4 5h12a4 4 0 014 4v10H8a4 4 0 01-4-4zM8 9h8M8 13h5',
  certificates: 'M17 9a5 5 0 11-10 0 5 5 0 0110 0zM9 14l-2 7 5-3 5 3-2-7',
  internships: 'M5 7h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2zM9 7V5a2 2 0 012-2h2a2 2 0 012 2v2',
  projects: 'M3 7l9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4',
  hobbies: 'M12 21s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 6-8 11-8 11z',
  references: 'M13 8a4 4 0 11-8 0 4 4 0 018 0zM2.5 20a6.5 6.5 0 0113 0M16 5a3.5 3.5 0 010 6.5M18 14.5A6.5 6.5 0 0121.5 20',
  privacy: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
}

/** `sectionOrder` holds bare ids; the list needs objects with a label. */
const orderItems = computed(() =>
  cv.data.sectionOrder.map((id) => ({
    id,
    label:
      cv.data.customSections.find((section) => section.id === id)?.title ||
      (isBuiltin(id) ? t(`steps.${id}`) : t('custom.untitled')),
  })),
)

const BUILTIN = ['summary', 'experience', 'education', 'skills', 'languages']
const isBuiltin = (id: string) => BUILTIN.includes(id)

/** The order list hands back its rows; the CV stores only their ids. */
function reorderSections(rows: { id: string }[]) {
  cv.data.sectionOrder = rows.map((row) => row.id)
}

/** The CV language named in itself: a code like "CA-VALENCIA" reads as noise (spec 070). */
const cvLanguageName = computed(
  () => CV_LANGUAGES.find((option) => option.code === cv.data.meta.language)?.label ?? cv.data.meta.language,
)

function addPreset(id: (typeof SECTION_PRESET_IDS)[number]) {
  cv.addCustomSection(createSectionFromPreset(id, cv.data.meta.language || 'es'))
  pickerOpen.value = false
}

function addBlank() {
  cv.addCustomSection()
  pickerOpen.value = false
}
</script>

<template>
  <div class="step">
    <section class="block">
      <p v-if="!cv.data.customSections.length" class="empty">{{ t('custom.empty') }}</p>

      <SortableList :items="cv.data.customSections" @reorder="cv.data.customSections = $event">
        <template #default="{ item }">
          <div class="section">
            <div class="section-head">
              <BaseField v-slot="{ id }" :label="t('custom.title')" :hint="t('custom.titleHint')">
                <input :id="id" v-model="item.title" />
              </BaseField>
              <BaseButton size="sm" variant="danger" :aria-label="t('actions.removeNamed', { name: item.title || t('custom.untitled') })" @click="cv.removeCustomSection(item.id)">
                {{ t('actions.remove') }}
              </BaseButton>
            </div>

            <SortableList :items="item.entries" @reorder="item.entries = $event">
              <template #default="{ item: entry, index: entryIndex }">
                <div class="entry">
                  <div class="row">
                    <BaseField v-slot="{ id }" :label="t('custom.entryTitle')">
                      <input :id="id" v-model="entry.title" />
                    </BaseField>
                    <BaseField v-slot="{ id }" :label="t('custom.entrySubtitle')">
                      <input :id="id" v-model="entry.subtitle" />
                    </BaseField>
                    <BaseField v-slot="{ id }" :label="t('custom.entryDate')">
                      <input :id="id" v-model="entry.date" />
                    </BaseField>
                  </div>
                  <BaseField v-slot="{ id }" :label="t('custom.entryDescription')">
                    <textarea :id="id" v-model="entry.description" rows="2" />
                  </BaseField>
                  <AiImproveButton :text="entry.description" kind="custom" />
                  <div class="actions">
                    <BaseButton size="sm" variant="danger" :aria-label="entry.title ? t('actions.removeNamed', { name: entry.title }) : undefined" @click="item.entries.splice(entryIndex, 1)">
                      {{ t('actions.remove') }}
                    </BaseButton>
                  </div>
                </div>
              </template>
            </SortableList>

            <BaseButton size="sm" @click="item.entries.push(createCustomEntry())">
              + {{ t('custom.addEntry') }}
            </BaseButton>
          </div>
        </template>
      </SortableList>

      <BaseButton v-if="isPhone" variant="primary" class="add-phone" @click="pickerOpen = true">
        + {{ t('custom.add') }}
      </BaseButton>
      <div v-else class="picker" role="group" :aria-label="t('custom.pick')">
        <h3 class="subtitle">{{ t('custom.pick') }}</h3>
        <div class="chips">
          <BaseButton v-for="id in SECTION_PRESET_IDS" :key="id" size="sm" @click="addPreset(id)">
            + {{ t(`custom.presets.${id}`) }}
          </BaseButton>
          <BaseButton size="sm" variant="primary" @click="cv.addCustomSection()">+ {{ t('custom.blank') }}</BaseButton>
        </div>
      </div>

      <BottomSheet :open="pickerOpen" :title="t('custom.pick')" @close="pickerOpen = false">
        <p class="sheet-hint">{{ t('custom.pickHint', { language: cvLanguageName }) }}</p>
        <div class="tiles">
          <button v-for="id in SECTION_PRESET_IDS" :key="id" type="button" class="tile" @click="addPreset(id)">
            <span class="tile-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="PRESET_ICONS[id]" /></svg>
            </span>
            {{ t(`custom.presets.${id}`) }}
          </button>
        </div>
        <template #footer>
          <BaseButton class="blank" @click="addBlank">+ {{ t('custom.blank') }}</BaseButton>
        </template>
      </BottomSheet>
    </section>

    <section class="block">
      <h3 class="subtitle">{{ t('custom.order') }}</h3>
      <SortableList
        :items="orderItems"
        @reorder="reorderSections"
      >
        <template #default="{ item, index }">
          <span class="order-row">
            <span class="order-label">{{ item.label }}</span>
            <!-- A break before the first section would only leave the header alone on page one. -->
            <label v-if="index > 0" class="page-break">
              <input
                type="checkbox"
                :checked="cv.data.pageBreaks.includes(item.id)"
                :aria-label="t('custom.newPageFor', { section: item.label })"
                @change="cv.setPageBreak(item.id, ($event.target as HTMLInputElement).checked)"
              />
              {{ t('custom.newPage') }}
            </label>
          </span>
        </template>
      </SortableList>
      <p class="hint">{{ t('custom.newPageHint') }}</p>
    </section>
  </div>
</template>

<style scoped>
.step {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.block > :deep(.list) {
  width: 100%;
}

.subtitle {
  margin: 0;
  font-size: var(--size-14);
  font-weight: 600;
}

.order-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.page-break {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--size-12);
  color: var(--text-muted);
  cursor: pointer;
}

.hint {
  margin: 0;
  font-size: var(--size-12);
  color: var(--text-muted);
}

.empty {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--size-14);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  width: 100%;
}

.section-head {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: end;
  width: 100%;
}

.entry {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.add-phone {
  min-height: 52px;
  width: 100%;
  justify-content: center;
}

.sheet-hint {
  margin: 0 4px 12px;
  font-size: var(--size-14);
  color: var(--text-muted);
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  padding: 0 2px 16px;
}

.tile {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 64px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--shape-lg);
  background: var(--surface);
  color: inherit;
  font: inherit;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.tile-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: var(--shape-md);
  background: var(--accent-soft);
  color: var(--accent);
}

.blank {
  width: 100%;
  min-height: 52px;
  justify-content: center;
}

.order-label {
  font-weight: 500;
}
</style>
