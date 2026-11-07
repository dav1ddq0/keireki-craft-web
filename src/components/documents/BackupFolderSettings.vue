<script setup lang="ts">
/**
 * "Also save to a folder" (spec 079), where the browser can write to one: choose it, see where and
 * when the last copy went, change it or stop; resume it when the browser asks for access again.
 * Nothing at all where the API does not exist.
 */
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import { useBackupFolder } from '@/composables/useBackupFolder'
import BaseButton from '@/components/ui/BaseButton.vue'

const { t, intlLocale } = useI18n()
const { state, name, lastWrittenAt, choose, stop, resume } = useBackupFolder()

const time = computed(() =>
  lastWrittenAt.value ? new Date(lastWrittenAt.value).toLocaleTimeString(intlLocale.value, { hour: '2-digit', minute: '2-digit' }) : null,
)
</script>

<template>
  <div v-if="state !== 'unsupported'" class="folder" :data-state="state">
    <span class="folder-title">{{ t('folder.title') }}</span>

    <template v-if="state === 'off'">
      <p class="folder-text">{{ t('folder.hint') }}</p>
      <div class="folder-actions">
        <BaseButton size="sm" @click="choose">{{ t('folder.choose') }}</BaseButton>
      </div>
    </template>

    <template v-else-if="state === 'ready'">
      <p class="folder-text" role="status">
        {{ t('folder.saving', { name: name ?? '' }) }}<template v-if="time"> · {{ t('folder.lastAt', { time }) }}</template>
      </p>
      <div class="folder-actions">
        <BaseButton size="sm" @click="choose">{{ t('folder.change') }}</BaseButton>
        <BaseButton size="sm" variant="ghost" @click="stop">{{ t('folder.stop') }}</BaseButton>
      </div>
    </template>

    <template v-else>
      <p class="folder-text" role="status">
        {{ state === 'missing' ? t('folder.missing', { name: name ?? '' }) : t('folder.paused', { name: name ?? '' }) }}
      </p>
      <div class="folder-actions">
        <BaseButton v-if="state === 'missing'" size="sm" @click="choose">{{ t('folder.chooseOther') }}</BaseButton>
        <BaseButton v-else size="sm" @click="resume">{{ t('folder.resume') }}</BaseButton>
        <BaseButton size="sm" variant="ghost" @click="stop">{{ t('folder.stop') }}</BaseButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.folder {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.folder-title {
  font-size: var(--size-12);
  font-weight: 600;
}

.folder-text {
  margin: 0;
  font-size: var(--size-12);
  line-height: 1.45;
  color: var(--text-muted);
}

.folder-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
