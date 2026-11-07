<script setup lang="ts">
/** Phone menu (spec 016): what the one-row header cannot hold — views, language, theme, storage note. */
import { useUiStore } from '@/stores/ui'
import { LOCALE_NAMES, LOCALE_TAGS, useI18n } from '@/i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useBackup } from '@/composables/useBackup'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const ui = useUiStore()
const { t, locale, availableLocales } = useI18n()
const { busy: backingUp, failed: backupFailed, backUp } = useBackup()

const VIEWS = ['editor', 'documents', 'import'] as const

function go(view: (typeof VIEWS)[number]) {
  ui.view = view
  emit('close')
}
</script>

<template>
  <BottomSheet :open="open" :title="t('menu.title')" @close="emit('close')">
    <nav class="views" :aria-label="t('menu.title')">
      <button
        v-for="view in VIEWS"
        :key="view"
        type="button"
        class="row"
        :class="{ 'row--current': ui.view === view }"
        :aria-current="ui.view === view ? 'page' : undefined"
        @click="go(view)"
      >
        {{ t(`nav.${view}`) }}
      </button>
    </nav>

    <div class="prefs">
      <!-- Six languages do not fit a segmented row: a select, like the CV language (spec 057). -->
      <BaseField v-slot="{ id }" :label="t('nav.language')">
        <select :id="id" v-model="locale">
          <option v-for="code in availableLocales" :key="code" :value="code" :lang="LOCALE_TAGS[code]">
            {{ LOCALE_NAMES[code] }}
          </option>
        </select>
      </BaseField>
      <div class="pref">
        <span :id="'menu-theme'" class="pref-label">{{ t('nav.theme') }}</span>
        <div class="segments m3-segmented" role="radiogroup" aria-labelledby="menu-theme">
          <button type="button" role="radio" class="segment m3-segment m3-state m3-target" :aria-checked="ui.theme === 'light'" @click="ui.setTheme('light')">
            {{ t('menu.light') }}
          </button>
          <button type="button" role="radio" class="segment m3-segment m3-state m3-target" :aria-checked="ui.theme === 'dark'" @click="ui.setTheme('dark')">
            {{ t('menu.dark') }}
          </button>
          <button type="button" role="radio" class="segment m3-segment m3-state m3-target" :aria-checked="ui.theme === 'system'" @click="ui.setTheme('system')">
            {{ t('menu.system') }}
          </button>
        </div>
      </div>
    </div>

    <div class="backup">
      <p class="note">{{ t('notices.notPersisted') }}</p>
      <BaseButton class="backup-button" :disabled="backingUp" @click="backUp">{{ t('actions.backup') }}</BaseButton>
      <p v-if="backupFailed" class="note" role="status">{{ t('notices.backupFailed') }}</p>
    </div>
  </BottomSheet>
</template>

<style scoped>
.views {
  display: flex;
  flex-direction: column;
  padding: 0 8px;
}

.row {
  min-height: 52px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--shape-md);
  background: transparent;
  color: var(--text);
  font: inherit;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.row--current {
  background: var(--accent-soft);
}

.prefs {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 8px 16px 0;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.pref {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.pref-label {
  font-weight: 600;
}




/* The storage note and what it asks for: a backup of every CV (spec 078). */
.backup {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.backup-button {
  margin: 0 12px;
}

.note {
  margin: 8px 12px 0;
  font-size: var(--size-12);
  line-height: 1.45;
  color: var(--text-muted);
}
</style>
