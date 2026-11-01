<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCvStore } from '@/stores/cv'
import { useUiStore } from '@/stores/ui'
import { useI18n, type Locale } from '@/i18n'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useIsDesktop, useIsPhone } from '@/composables/useIsPhone'
import AppMenuSheet from './AppMenuSheet.vue'
import DesktopHeader from './DesktopHeader.vue'
import ExportDialog from './form/ExportDialog.vue'

const cv = useCvStore()
const ui = useUiStore()
const { t, locale, availableLocales } = useI18n()
const isPhone = useIsPhone()
const isDesktop = useIsDesktop()
const menuOpen = ref(false)
const exportOpen = ref(false)

const saveLabel = computed(() => {
  switch (cv.saveState) {
    case 'saving':
      return '…'
    case 'saved':
      return '✓'
    case 'error':
      return cv.saveError === 'quota' ? t('notices.quota') : '⚠'
    default:
      return ''
  }
})

/** Phone header has no room for the glyph-only label: say it in words. */
const phoneState = computed(() => {
  switch (cv.saveState) {
    case 'saving':
      return t('menu.saving')
    case 'saved':
      return t('menu.saved')
    case 'error':
      return cv.saveError === 'quota' ? t('notices.quota') : '⚠'
    default:
      return ''
  }
})
</script>

<template>
  <header v-if="isPhone" class="header header--phone">
    <div class="brand">
      <strong>{{ t('app.name') }}</strong>
      <span class="state" :class="{ 'state--error': cv.saveState === 'error' }">{{ phoneState }}</span>
    </div>

    <div class="tools">
      <button type="button" class="icon-btn m3-icon-btn m3-state m3-target" :aria-label="t('actions.undo')" :disabled="!cv.canUndo" @click="cv.undo()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 010 12h-3" /></svg>
      </button>
      <button type="button" class="icon-btn m3-icon-btn m3-state m3-target" :aria-label="t('actions.redo')" :disabled="!cv.canRedo" @click="cv.redo()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 000 12h3" /></svg>
      </button>
      <button type="button" class="icon-btn m3-icon-btn m3-state m3-target" :aria-label="t('menu.open')" aria-haspopup="dialog" @click="menuOpen = true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
      </button>
    </div>
    <AppMenuSheet :open="menuOpen" @close="menuOpen = false" />
  </header>

  <template v-else-if="isDesktop">
    <DesktopHeader @export="exportOpen = true" />
    <ExportDialog :open="exportOpen" @close="exportOpen = false" />
  </template>

  <header v-else class="header">
    <div class="brand">
      <strong>{{ t('app.name') }}</strong>
      <span class="tagline">{{ t('app.tagline') }}</span>
    </div>

    <nav class="views" :aria-label="t('nav.editor')">
      <button
        v-for="target in (['editor', 'documents', 'import'] as const)"
        :key="target"
        type="button"
        class="view-btn m3-state"
        :class="{ 'view-btn--active': ui.view === target }"
        @click="ui.view = target"
      >
        {{ t(`nav.${target}`) }}
      </button>
    </nav>

    <div class="tools">
      <span class="save" :class="{ 'save--error': cv.saveState === 'error' }">{{ saveLabel }}</span>

      <BaseButton size="sm" variant="ghost" :disabled="!cv.canUndo" @click="cv.undo()">
        ↶ <span class="tool-label">{{ t('actions.undo') }}</span>
      </BaseButton>
      <BaseButton size="sm" variant="ghost" :disabled="!cv.canRedo" @click="cv.redo()">
        ↷ <span class="tool-label">{{ t('actions.redo') }}</span>
      </BaseButton>

      <select v-model="locale" class="select" :aria-label="t('nav.language')">
        <option v-for="code in availableLocales" :key="code" :value="code">
          {{ (code as Locale).toUpperCase() }}
        </option>
      </select>

      <BaseButton
        size="sm"
        variant="ghost"
        :aria-label="t('nav.theme')"
        @click="ui.setTheme(ui.resolvedTheme === 'dark' ? 'light' : 'dark')"
      >
        {{ ui.resolvedTheme === 'dark' ? '☀' : '☾' }}
      </BaseButton>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 8px 16px;
  border-bottom: 1px solid var(--md-outline-variant);
  background: var(--bg);
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font: var(--type-title-large);
}

.brand strong {
  font-weight: 500;
}

.tagline {
  font-size: var(--size-11);
  color: var(--text-muted);
}

.views {
  display: flex;
  gap: 2px;
}

.view-btn {
  --container: transparent;
  min-height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--shape-full);
  color: var(--md-on-surface-variant);
  font: var(--type-label-large);
  letter-spacing: var(--tracking-label-large);
}

.view-btn--active {
  --container: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.tools {
  display: flex;
  align-items: center;
  gap: 2px;
}

.save {
  font-size: var(--size-12);
  color: var(--text-muted);
  min-width: 1.2em;
  text-align: center;
}

.save--error {
  color: var(--danger);
}

.select {
  min-height: 40px;
  padding: 0 8px;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--shape-md);
  background: transparent;
  color: var(--md-on-surface);
  font: var(--type-label-large);
}

.header--phone {
  flex-wrap: nowrap;
  gap: 4px;
  min-height: 64px;
  padding: 0 4px 0 16px;
}

/* The name stays on one line; a save state too long to sit beside it ("Gespeichert" on a 360 px
   phone) drops below it instead of breaking the name in two (spec 057). */
.header--phone .brand {
  flex-wrap: wrap;
  row-gap: 0;
  min-width: 0;
}

.header--phone .brand strong {
  white-space: nowrap;
}

.state {
  font: var(--type-body-small);
  letter-spacing: var(--tracking-body-small);
  color: var(--md-on-surface-variant);
}

.state--error {
  color: var(--danger);
}

.icon-btn {
  width: 48px;
  height: 48px;
  color: var(--md-on-surface-variant);
}

@media (max-height: 500px) and (orientation: landscape) {
  .header {
    padding-top: 2px;
    padding-bottom: 2px;
  }
}

@media (max-width: 900px) {
  .tagline,
  .tool-label {
    display: none;
  }
}
</style>
