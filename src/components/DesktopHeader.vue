<script setup lang="ts">
/**
 * Desktop header (spec 018). In the editor: where you are ("My CVs / <name>"), the save state in words,
 * undo / redo, Import, preferences and Export as the main action. Elsewhere: the three views.
 */
import { computed } from 'vue'
import { useCvStore } from '@/stores/cv'
import { useUiStore } from '@/stores/ui'
import { useI18n } from '@/i18n'
import PreferencesPopover from './PreferencesPopover.vue'

const logoSrc = `${import.meta.env.BASE_URL}favicon.svg`

const emit = defineEmits<{ export: [] }>()

const cv = useCvStore()
const ui = useUiStore()
const { t } = useI18n()

const VIEWS = ['editor', 'documents', 'import'] as const

const saveText = computed(() => {
  switch (cv.saveState) {
    case 'saving':
      return t('header.saving')
    case 'saved':
      return t('header.saved')
    case 'error':
      return cv.saveError === 'quota' ? t('notices.quota') : t('notices.saveFailed')
    default:
      return ''
  }
})
</script>

<template>
  <header class="header">
    <button type="button" class="brand" @click="ui.view = 'documents'">
      <img class="mark" :src="logoSrc" alt="" aria-hidden="true" />{{ t('app.name') }}
    </button>

    <nav v-if="ui.view === 'editor'" class="crumbs" :aria-label="t('header.breadcrumb')">
      <button type="button" class="crumb m3-state" @click="ui.view = 'documents'">{{ t('nav.documents') }}</button>
      <span class="sep" aria-hidden="true">/</span>
      <input v-model="cv.data.meta.title" class="doc-title" :aria-label="t('header.docTitle')" :placeholder="t('documents.untitled')" />
      <span class="state" :class="{ 'state--error': cv.saveState === 'error' }" role="status">
        <span v-if="cv.saveState === 'saved'" class="dot" aria-hidden="true" />{{ saveText }}
      </span>
    </nav>
    <nav v-else class="views" :aria-label="t('nav.editor')">
      <button
        v-for="target in VIEWS"
        :key="target"
        type="button"
        class="view m3-state"
        :aria-current="ui.view === target ? 'page' : undefined"
        @click="ui.view = target"
      >
        {{ t(`nav.${target}`) }}
      </button>
    </nav>

    <span class="spacer" />

    <template v-if="ui.view === 'editor'">
      <button type="button" class="icon m3-icon-btn m3-state" :aria-label="t('header.undo')" :title="t('header.undo')" :disabled="!cv.canUndo" @click="cv.undo()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 010 12h-3" /></svg>
      </button>
      <button type="button" class="icon m3-icon-btn m3-state" :aria-label="t('header.redo')" :title="t('header.redo')" :disabled="!cv.canRedo" @click="cv.redo()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 000 12h3" /></svg>
      </button>
      <span class="divider" aria-hidden="true" />
      <button type="button" class="ghost m3-state" @click="ui.view = 'import'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4m0 0L8 8m4-4l4 4" /><path d="M4 15v4a1 1 0 001 1h14a1 1 0 001-1v-4" /></svg>
        {{ t('nav.import') }}
      </button>
    </template>

    <PreferencesPopover />

    <button v-if="ui.view === 'editor'" type="button" class="primary m3-state" aria-haspopup="dialog" @click="emit('export')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12m0 0l-4-4m4 4l4-4" /><path d="M4 20h16" /></svg>
      {{ t('header.export') }}
    </button>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 0 16px 0 20px;
  border-bottom: 1px solid var(--md-outline-variant);
  background: var(--bg);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--md-on-surface);
  font: var(--type-title-large);
  cursor: pointer;
}

.mark {
  display: block;
  width: 32px;
  height: 32px;
}

.crumbs,
.views {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-left: 12px;
}

.crumb {
  --container: transparent;
  min-height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--shape-full);
  color: var(--md-on-surface-variant);
  font: var(--type-label-large);
  letter-spacing: var(--tracking-label-large);
  cursor: pointer;
}


.sep {
  color: var(--text-muted);
}

.doc-title {
  /* Grows with its text where supported; the max keeps a long name from pushing the actions out. */
  field-sizing: content;
  min-width: 6ch;
  max-width: 28ch;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: var(--shape-md);
  background: transparent;
  color: var(--md-on-surface);
  font: var(--type-title-medium);
  letter-spacing: var(--tracking-title-medium);
}

.doc-title:hover,
.doc-title:focus-visible {
  border-color: var(--md-outline);
}

.state {
  display: flex;
  align-items: center;
  gap: 8px;
  font: var(--type-body-small);
  letter-spacing: var(--tracking-body-small);
  color: var(--md-on-surface-variant);
  white-space: nowrap;
}

.state--error {
  color: var(--danger);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--md-success);
}

.view {
  --container: transparent;
  min-height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--shape-full);
  color: var(--md-on-surface-variant);
  font: var(--type-label-large);
  letter-spacing: var(--tracking-label-large);
  cursor: pointer;
}

.view[aria-current='page'] {
  --container: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.spacer {
  flex: 1;
}

.icon {
  color: var(--md-on-surface-variant);
}


.divider {
  width: 1px;
  height: 24px;
  background: var(--md-outline-variant);
}

.ghost,
.primary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 24px;
  border: 0;
  border-radius: var(--shape-full);
  font: var(--type-label-large);
  letter-spacing: var(--tracking-label-large);
  cursor: pointer;
}

.ghost {
  --container: transparent;
  padding: 0 12px;
  color: var(--md-primary);
}

.primary {
  --container: var(--md-primary);
  color: var(--md-on-primary);
}
</style>
