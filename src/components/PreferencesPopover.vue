<script setup lang="ts">
/**
 * Desktop preferences (spec 018): UI language, theme, the storage note and shortcuts, in a popover
 * anchored to the header button. Uses the native `popover` attribute (light dismiss, Esc, top layer)
 * and falls back to a plain toggled panel where it does not exist.
 */
import { onMounted, ref, useId, useTemplateRef } from 'vue'
import { useUiStore } from '@/stores/ui'
import { LOCALE_NAMES, LOCALE_TAGS, useI18n } from '@/i18n'
import { useCvExport } from '@/composables/useCvExport'
import BaseField from '@/components/ui/BaseField.vue'

const ui = useUiStore()
const { t, locale, availableLocales } = useI18n()
const { busy, run } = useCvExport()

const id = useId()
const panel = useTemplateRef<HTMLElement>('panel')
const native = ref(true)
const fallbackOpen = ref(false)

onMounted(() => {
  native.value = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype
})

function toggleFallback() {
  fallbackOpen.value = !fallbackOpen.value
}
</script>

<template>
  <div class="prefs-anchor">
    <button
      type="button"
      class="trigger"
      :aria-label="t('header.preferences')"
      :title="t('header.preferences')"
      :popovertarget="native ? id : undefined"
      :aria-expanded="native ? undefined : fallbackOpen"
      @click="native ? undefined : toggleFallback()"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
    </button>

    <section
      v-show="native || fallbackOpen"
      :id="id"
      ref="panel"
      class="panel"
      :class="{ 'panel--fallback': !native }"
      :popover="native ? 'auto' : undefined"
      :aria-label="t('prefs.title')"
    >
      <h2 class="title">{{ t('prefs.title') }}</h2>

      <!-- Six languages do not fit a segmented row: a select, like the CV language (spec 057). -->
      <div class="group">
        <BaseField v-slot="{ id: fieldId }" :label="t('prefs.language')" :hint="t('prefs.languageHint')">
          <select :id="fieldId" v-model="locale">
            <option v-for="code in availableLocales" :key="code" :value="code" :lang="LOCALE_TAGS[code]">
              {{ LOCALE_NAMES[code] }}
            </option>
          </select>
        </BaseField>
      </div>

      <div class="group">
        <span :id="`${id}-theme`" class="label">{{ t('prefs.theme') }}</span>
        <div class="segments m3-segmented" role="radiogroup" :aria-labelledby="`${id}-theme`">
          <button type="button" role="radio" class="segment m3-segment m3-state m3-target" :aria-checked="ui.theme === 'light'" @click="ui.setTheme('light')">{{ t('menu.light') }}</button>
          <button type="button" role="radio" class="segment m3-segment m3-state m3-target" :aria-checked="ui.theme === 'dark'" @click="ui.setTheme('dark')">{{ t('menu.dark') }}</button>
          <button type="button" role="radio" class="segment m3-segment m3-state m3-target" :aria-checked="ui.theme === 'system'" @click="ui.setTheme('system')">{{ t('menu.system') }}</button>
        </div>
      </div>

      <div class="group group--ruled">
        <span class="label">{{ t('prefs.storage') }}</span>
        <p class="text">{{ t('prefs.storageText') }}</p>
        <button type="button" class="action" :disabled="busy !== null" @click="run('json')">{{ t('prefs.backup') }}</button>
      </div>

      <div class="group group--ruled">
        <span class="label">{{ t('prefs.shortcuts') }}</span>
        <dl class="keys">
          <dt>{{ t('actions.undo') }}</dt><dd><kbd>Ctrl</kbd> <kbd>Z</kbd></dd>
          <dt>{{ t('actions.redo') }}</dt><dd><kbd>Ctrl</kbd> <kbd>⇧</kbd> <kbd>Z</kbd></dd>
        </dl>
      </div>
    </section>
  </div>
</template>

<style scoped>
.prefs-anchor {
  position: relative;
}

.trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: var(--shape-md);
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.trigger:hover {
  background: var(--surface-2);
}

.panel {
  width: 340px;
  margin: 0;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--shape-md);
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--elevation-3);
  /* Top layer: pinned under the header's right edge. */
  position: fixed;
  inset: 60px 16px auto auto;
}

.panel--fallback {
  position: absolute;
  inset: calc(100% + 8px) 0 auto auto;
  z-index: 30;
}

.title {
  margin: 0 0 12px;
  font-size: 1em;
  font-weight: 700;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.group--ruled {
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.group:last-child {
  margin-bottom: 0;
}

.label {
  font-size: var(--size-12);
  font-weight: 600;
}

.hint,
.text {
  margin: 0;
  font-size: var(--size-12);
  line-height: 1.45;
  color: var(--text-muted);
}




.action {
  align-self: flex-start;
  min-height: 36px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: var(--shape-md);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: var(--size-12);
  font-weight: 600;
  cursor: pointer;
}

.keys {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 12px;
  margin: 0;
  font-size: var(--size-12);
}

.keys dd {
  margin: 0;
}

kbd {
  padding: 1.2px 4px;
  border: 1px solid var(--border);
  border-radius: var(--shape-xs);
  font: inherit;
  font-size: var(--size-12);
  font-weight: 600;
}
</style>
