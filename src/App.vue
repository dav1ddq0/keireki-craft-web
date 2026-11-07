<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCvStore } from '@/stores/cv'
import { useUiStore } from '@/stores/ui'
import { useI18n } from '@/i18n'
import AppHeader from '@/components/AppHeader.vue'
import CvWizard from '@/components/form/CvWizard.vue'
import MobileDock from '@/components/form/MobileDock.vue'
import PreviewPane from '@/components/preview/PreviewPane.vue'
import DocumentList from '@/components/documents/DocumentList.vue'
import WelcomeView from '@/components/documents/WelcomeView.vue'
import NoticeBar from '@/components/ui/NoticeBar.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useBackup } from '@/composables/useBackup'
import { useBackupFolder } from '@/composables/useBackupFolder'
import StartupFailed from '@/components/StartupFailed.vue'
import { useIsDesktop, useIsPhone } from '@/composables/useIsPhone'
import StepRail from '@/components/form/StepRail.vue'
import { shortcutFor } from '@/core/shortcuts'

const cv = useCvStore()
const ui = useUiStore()
const { t } = useI18n()
const isPhone = useIsPhone()
const isDesktop = useIsDesktop()

// pdf.js is ~500 kB: the import view — and the parser behind it — load only when
// someone actually opens it, so the editor's first paint never pays for it.
const ImportView = defineAsyncComponent(() => import('@/components/import/ImportView.vue'))

const { busy: backingUp, backUp } = useBackup()
const backupFolder = useBackupFolder()

/** The stored CVs could not be opened: the root only decides whether to say so. */
const startupFailed = ref(false)

onMounted(async () => {
  ui.setTheme(ui.theme)
  await ui.probeEnvironment()
  try {
    await cv.init()
  } catch {
    startupFailed.value = true
    return
  }
  // First visit: nothing saved yet, so offer the ways in rather than an empty form (spec 019).
  if (!cv.documents.length) ui.view = 'welcome'
  // Where a backup folder was chosen, every save is copied there from now on (spec 079).
  backupFolder.start()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('beforeunload', flushPending)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('beforeunload', flushPending)
})

const reload = () => location.reload()

/** A debounced autosave must not be lost to a tab close. */
function flushPending() {
  void cv.flush()
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  const action = shortcutFor(event, {
    previewExpanded: ui.previewExpanded,
    dialogOpen: document.querySelector('dialog[open]') !== null,
    inTextField: !!target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName),
  })
  if (!action) return
  if (action === 'collapsePreview') {
    ui.setPreviewExpanded(false)
    return
  }
  event.preventDefault()
  if (action === 'redo') cv.redo()
  else cv.undo()
}
</script>

<template>
  <div class="app">
    <AppHeader />

    <!-- The eviction notice lives in the phone menu (016) and in the desktop rail and preferences (018);
         only tablets keep the bar. -->
    <div v-if="!ui.storageAvailable || (!isPhone && !isDesktop && !ui.storagePersisted)" class="notices">
      <NoticeBar v-if="!ui.storageAvailable" tone="warning">
        {{ t('notices.privateMode') }}
      </NoticeBar>
      <NoticeBar
        v-else-if="!ui.isDismissed('persistence')"
        class="notice--soft"
        tone="warning"
        dismissible
        @dismiss="ui.dismissNotice('persistence')"
      >
        {{ t('notices.notPersisted') }}
        <template v-if="cv.documents.length" #actions>
          <BaseButton size="sm" :disabled="backingUp" @click="backUp">{{ t('actions.backup') }}</BaseButton>
        </template>
      </NoticeBar>
    </div>

    <Transition name="view" mode="out-in">
      <StartupFailed v-if="startupFailed" key="failed" @reload="reload" />

      <main
        v-else-if="ui.view === 'editor'"
        key="editor"
        class="editor"
        :class="{ 'editor--preview-open': ui.previewOpen, 'editor--rail': isDesktop, 'editor--expanded': isDesktop && ui.previewExpanded }"
      >
        <StepRail v-if="isDesktop" class="editor-rail" :compact="ui.previewExpanded" />
        <CvWizard class="editor-form" />
        <PreviewPane class="editor-preview" />
      </main>

      <main v-else-if="ui.view === 'documents'" key="documents" class="scroll-view">
        <DocumentList />
      </main>

      <main v-else-if="ui.view === 'welcome'" key="welcome" class="scroll-view">
        <WelcomeView />
      </main>

      <main v-else key="import" class="scroll-view">
        <ImportView />
      </main>
    </Transition>

    <MobileDock v-if="ui.view === 'editor' && !startupFailed" />
  </div>
</template>

<style scoped>
/* Moving between the editor, My CVs, Import and the welcome screen: a short fade with a small lift (spec 048). */
.view-enter-active {
  transition: opacity var(--duration-medium) var(--motion-emphasized-decelerate), transform var(--duration-medium) var(--motion-emphasized-decelerate);
}

.view-leave-active {
  transition: opacity var(--duration-short) var(--motion-standard);
}

.view-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.view-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .view-enter-from,
  .view-leave-to {
    opacity: 1;
    transform: none;
  }
}

.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.notices {
  padding: 8px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* A phone held sideways has ~390px of height: the dismissible notice is not worth 70px of it. */
@media (max-height: 500px) and (orientation: landscape) {
  .notice--soft {
    display: none;
  }
}

.editor {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-height: 0;
}

.editor-form,
.editor-preview,
.editor-rail {
  min-height: 0;
}

/* Desktop (spec 018): step rail · form · preview. Below 1280px the form gets the larger share,
   or its footer and the template grid run out of room. */
.editor--rail {
  grid-template-columns: 220px minmax(0, 1fr) minmax(0, 0.7fr);
}

@media (min-width: 1280px) {
  .editor--rail {
    grid-template-columns: 248px minmax(0, 1fr) minmax(0, 1fr);
  }
}

/* Expanded preview (spec 030): the rail folds to a navigation rail, the form steps aside. */
.editor--rail.editor--expanded {
  grid-template-columns: 88px minmax(0, 1fr);
}

.editor--expanded .editor-form {
  display: none;
}

.scroll-view {
  flex: 1;
  overflow: auto;
  display: flex;
}

/* Tablets and a phone held sideways: both panes stay, the preview is a fixed column fitted to its width. */
@media (max-width: 1000px) {
  .editor {
    grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
  }
}

/* Phones: one pane at a time, switched from the dock. `1fr` alone lets the column grow to the page's
   794px, which overflowed the whole document. */
@media (max-width: 640px) {
  .editor {
    grid-template-columns: minmax(0, 1fr);
  }

  .editor-preview {
    display: none;
  }

  .editor--preview-open .editor-form {
    display: none;
  }

  .editor--preview-open .editor-preview {
    display: flex;
  }
}
</style>
