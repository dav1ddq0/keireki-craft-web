<script setup lang="ts">
/**
 * "Improve with AI" for one text of the CV (spec 063). It copies a ready prompt (only this field's
 * text, in the CV's language) and opens the chosen assistant; it also arrives in the box of the assistant
 * through the link. The app makes no request itself. If the clipboard is not
 * available the prompt is shown to be copied by hand. A popover on desktop, a bottom sheet on the phone.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { useCvStore } from '@/stores/cv'
import { useI18n } from '@/i18n'
import { useIsPhone } from '@/composables/useIsPhone'
import { buildImprovePrompt, type ImproveKind } from '@/core/aiPrompt'
import { AI_ASSISTANTS, assistantLink, type AiAssistant } from '@/core/aiAssistants'
import BottomSheet from '@/components/ui/BottomSheet.vue'

const props = defineProps<{ text?: string; kind: ImproveKind }>()

const cv = useCvStore()
const { t, locale } = useI18n()
const isPhone = useIsPhone()
const reasonId = useId()

const hasText = computed(() => (props.text ?? '').trim().length > 0)
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

/** Opens the tab in the click itself: browsers only allow it there, not after waiting for the clipboard. */
function openAssistant(assistant: AiAssistant, prompt: string) {
  window.open(assistantLink(assistant, prompt, locale.value), '_blank', 'noopener')
}

function announce(message: string) {
  notice.value = message
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = ''), 8000)
}

async function choose(assistant: AiAssistant) {
  const prompt = buildImprovePrompt(props.kind, props.text ?? '', cv.data.meta.language)
  // Open first, in the click, then copy: the tab already has the prompt in its link.
  openAssistant(assistant, prompt)
  closeMenu(false)
  try {
    await navigator.clipboard.writeText(prompt)
  } catch {
    // No clipboard (permissions, insecure context): show the prompt instead of failing silently.
    manual.value = { assistant, prompt }
    open.value = true
    return
  }
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

const sparkle =
  'M9 6.8Q10.92 12.88 17 14.8Q10.92 16.72 9 22.8Q7.08 16.72 1 14.8Q7.08 12.88 9 6.8ZM11.9 1.1Q12.6 3.3 14.8 4Q12.6 4.7 11.9 6.9Q11.2 4.7 9 4Q11.2 3.3 11.9 1.1ZM18.8 5.3Q19.71 8.19 22.6 9.1Q19.71 10.01 18.8 12.9Q17.89 10.01 15 9.1Q17.89 8.19 18.8 5.3Z'
const external = 'M7 17L17 7M9 7h8v8'
</script>

<template>
  <div ref="root" class="ai">
    <button
      ref="trigger"
      type="button"
      class="trigger m3-icon-btn m3-state m3-target"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="t('ai.button')"
      :aria-describedby="hasText ? undefined : reasonId"
      :disabled="!hasText"
      :title="hasText ? t('ai.button') : t('ai.empty')"
      @click="open ? closeMenu(false) : openMenu()"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path :d="sparkle" fill="currentColor" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round" />
      </svg>
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
            <span>{{ t('ai.item', { name: assistant.name }) }}</span>
            <svg class="out" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path :d="external" /></svg>
          </button>
        </div>
        <div v-if="manual" class="manual">
          <p class="intro">{{ t('ai.copyFailed') }}</p>
          <textarea readonly rows="5" :aria-label="t('ai.promptLabel')" :value="manual.prompt" @focus="($event.target as HTMLTextAreaElement).select()" />
          <button type="button" class="item item--primary m3-state" @click="openAssistant(manual.assistant, manual.prompt)">
            <span>{{ t('ai.openNamed', { name: manual.assistant.name }) }}</span>
            <svg class="out" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path :d="external" /></svg>
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
  width: 40px;
  height: 40px;
  border: 0;
  color: var(--md-primary);
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--shape-sm);
  color: var(--md-on-surface);
  font: var(--type-body-large);
  text-align: start;
  cursor: pointer;
}

.item--primary {
  color: var(--md-primary);
  font-weight: 500;
}

.out {
  flex: none;
  color: var(--md-on-surface-variant);
}

.item--primary .out {
  color: inherit;
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
