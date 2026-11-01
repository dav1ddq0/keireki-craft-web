<script setup lang="ts">
/**
 * "Improve with AI" for one text of the CV (spec 063). It copies a ready prompt (only this field's
 * text, in the CV's language) and opens the chosen assistant; the user pastes it there. Nothing is
 * sent by the app: no request, no text in a URL. If the clipboard is not available the prompt is
 * shown to be copied by hand. A popover on desktop, a bottom sheet on the phone.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { useCvStore } from '@/stores/cv'
import { useI18n } from '@/i18n'
import { useIsPhone } from '@/composables/useIsPhone'
import { buildImprovePrompt, type ImproveKind } from '@/core/aiPrompt'
import { AI_ASSISTANTS, type AiAssistant } from '@/core/aiAssistants'
import BottomSheet from '@/components/ui/BottomSheet.vue'

const props = defineProps<{ text: string; kind: ImproveKind }>()

const cv = useCvStore()
const { t } = useI18n()
const isPhone = useIsPhone()
const reasonId = useId()

const hasText = computed(() => props.text.trim().length > 0)
const open = ref(false)
/** Set when the clipboard failed: the prompt to copy by hand, and where to go afterwards. */
const manual = ref<{ assistant: AiAssistant; prompt: string } | null>(null)
const notice = ref('')
let noticeTimer: ReturnType<typeof setTimeout> | undefined

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)

function items(): HTMLElement[] {
  return [...(menu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
}

async function openMenu() {
  manual.value = null
  open.value = true
  await nextTick()
  items()[0]?.focus()
}

function closeMenu(refocus: boolean) {
  open.value = false
  manual.value = null
  if (refocus) trigger.value?.focus()
}

function openAssistant(assistant: AiAssistant) {
  window.open(assistant.url, '_blank', 'noopener,noreferrer')
}

function announce(message: string) {
  notice.value = message
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = ''), 8000)
}

async function choose(assistant: AiAssistant) {
  const prompt = buildImprovePrompt(props.kind, props.text, cv.data.meta.language)
  try {
    await navigator.clipboard.writeText(prompt)
  } catch {
    // No clipboard (permissions, insecure context): show the prompt instead of failing silently.
    manual.value = { assistant, prompt }
    return
  }
  closeMenu(false)
  openAssistant(assistant)
  announce(t('ai.copied', { name: assistant.name }))
}

function onMenuKey(event: KeyboardEvent) {
  const list = items()
  const at = list.indexOf(document.activeElement as HTMLElement)
  if (event.key === 'ArrowDown') list[(at + 1) % list.length]?.focus()
  else if (event.key === 'ArrowUp') list[(at - 1 + list.length) % list.length]?.focus()
  else if (event.key === 'Home') list[0]?.focus()
  else if (event.key === 'End') list[list.length - 1]?.focus()
  else if (event.key === 'Escape') closeMenu(true)
  else return
  event.preventDefault()
}

function onDocumentPointer(event: PointerEvent) {
  if (open.value && !isPhone.value && root.value && !root.value.contains(event.target as Node)) closeMenu(false)
}
onMounted(() => document.addEventListener('pointerdown', onDocumentPointer))
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointer)
  clearTimeout(noticeTimer)
})

const sparkle = 'M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z'
</script>

<template>
  <div ref="root" class="ai">
    <button
      ref="trigger"
      type="button"
      class="trigger m3-state"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-describedby="hasText ? undefined : reasonId"
      :disabled="!hasText"
      :title="hasText ? undefined : t('ai.empty')"
      @click="open ? closeMenu(false) : openMenu()"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path :d="sparkle" fill="currentColor" /></svg>
      {{ t('ai.button') }}
    </button>
    <span v-if="!hasText" :id="reasonId" class="sr-only">{{ t('ai.empty') }}</span>
    <span class="notice" role="status">{{ notice }}</span>

    <component
      :is="isPhone ? BottomSheet : 'div'"
      v-bind="isPhone ? { open, title: t('ai.title'), onClose: () => closeMenu(false) } : { class: 'popup', hidden: !open }"
    >
      <div ref="menu" class="body" @keydown="onMenuKey">
        <p class="intro">{{ t('ai.intro') }}</p>
        <div role="menu" :aria-label="t('ai.title')" class="list">
          <button
            v-for="assistant in AI_ASSISTANTS"
            :key="assistant.id"
            type="button"
            role="menuitem"
            class="item m3-state"
            @click="choose(assistant)"
          >
            {{ t('ai.item', { name: assistant.name }) }}
          </button>
        </div>
        <div v-if="manual" class="manual">
          <p class="intro">{{ t('ai.copyFailed') }}</p>
          <textarea readonly rows="5" :aria-label="t('ai.promptLabel')" :value="manual.prompt" @focus="($event.target as HTMLTextAreaElement).select()" />
          <button type="button" class="item m3-state" @click="openAssistant(manual.assistant)">
            {{ t('ai.openNamed', { name: manual.assistant.name }) }}
          </button>
        </div>
      </div>
    </component>
  </div>
</template>

<style scoped>
.ai {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.trigger {
  --container: transparent;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--shape-full);
  color: var(--md-primary);
  font: var(--type-label-large);
  letter-spacing: var(--tracking-label-large);
  cursor: pointer;
}

.trigger:disabled {
  color: color-mix(in srgb, var(--md-on-surface) 38%, transparent);
  cursor: not-allowed;
}

.notice {
  color: var(--md-on-surface-variant);
  font: var(--type-body-small);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.popup {
  position: absolute;
  z-index: 30;
  top: calc(100% + 4px);
  left: 0;
  width: min(360px, calc(100vw - 32px));
  border-radius: var(--shape-md);
  background: var(--md-surface-container-highest);
  box-shadow: var(--elevation-3), inset 0 0 0 1px var(--md-outline-variant);
}

.popup[hidden] {
  display: none;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 8px;
}

.intro {
  margin: 0;
  padding: 0 8px;
  color: var(--md-on-surface-variant);
  font: var(--type-body-small);
}

.list {
  display: flex;
  flex-direction: column;
}

.item {
  --container: transparent;
  min-height: 48px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--shape-sm);
  color: var(--md-on-surface);
  font: var(--type-body-large);
  text-align: start;
  cursor: pointer;
}

.manual {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.manual textarea {
  margin: 0 8px;
  padding: 8px;
  border: 1px solid var(--md-outline);
  border-radius: var(--shape-sm);
  background: var(--md-surface-container-high);
  color: var(--md-on-surface);
  font: var(--type-body-medium);
}
</style>
