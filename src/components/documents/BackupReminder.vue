<script setup lang="ts">
/**
 * The backup reminder (spec 078): only when it is due, never as a standing warning (the owner's
 * choice). "Not now" hides it for seven days; a backup made here or anywhere else hides it too.
 */
import { computed } from 'vue'
import { useCvStore } from '@/stores/cv'
import { useUiStore } from '@/stores/ui'
import { useI18n } from '@/i18n'
import { backupDue } from '@/core/backupReminder'
import { useBackup } from '@/composables/useBackup'
import { useBackupFolder } from '@/composables/useBackupFolder'
import BaseButton from '@/components/ui/BaseButton.vue'
import NoticeBar from '@/components/ui/NoticeBar.vue'

const cv = useCvStore()
const ui = useUiStore()
const { t } = useI18n()
const { busy, failed, backUp } = useBackup()
const folder = useBackupFolder()

const reminder = computed(() => backupDue(cv.documents, ui.backup))
</script>

<template>
  <!-- The folder copy is paused: it says so here, where the reminder would (spec 079). -->
  <NoticeBar v-if="folder.state.value === 'needs-permission' || folder.state.value === 'missing'" tone="warning" class="folder-paused">
    {{ folder.state.value === 'missing' ? t('folder.noticeMissing', { name: folder.name.value ?? '' }) : t('folder.noticePaused', { name: folder.name.value ?? '' }) }}
    <template #actions>
      <BaseButton v-if="folder.state.value === 'missing'" size="sm" @click="folder.choose">{{ t('folder.chooseOther') }}</BaseButton>
      <BaseButton v-else size="sm" @click="folder.resume">{{ t('folder.resume') }}</BaseButton>
    </template>
  </NoticeBar>
  <NoticeBar v-else-if="reminder.due" tone="warning" class="backup-reminder">
    {{ reminder.days === null ? t('notices.backupNever') : t('notices.backupDue', { n: reminder.days }) }}
    <template #actions>
      <BaseButton size="sm" variant="ghost" @click="ui.snoozeBackupReminder()">{{ t('notices.later') }}</BaseButton>
      <BaseButton size="sm" :disabled="busy" @click="backUp">{{ t('actions.backup') }}</BaseButton>
    </template>
  </NoticeBar>
  <NoticeBar v-if="failed" tone="warning">{{ t('notices.backupFailed') }}</NoticeBar>
</template>
