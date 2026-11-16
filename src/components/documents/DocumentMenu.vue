<script setup lang="ts">
/**
 * The ⋮ of a card in My CVs (spec 090): a menu button with Rename and Duplicate. Keyboard as a WAI-ARIA
 * menu button: opening moves the focus to an item, ↑/↓/Home/End move, Esc closes and returns the focus
 * to ⋮, Tab closes. A press outside closes it.
 */
import { nextTick, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from '@/i18n'

const props = defineProps<{ title: string }>()
const emit = defineEmits<{ rename: []; duplicate: [] }>()
const { t } = useI18n()

const open = ref(false)
const menuId = useId()
const root = useTemplateRef<HTMLElement>('root')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')

const items = () => Array.from(root.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])

function focusItem(index: number) {
  const all = items()
  if (!all.length) return
  all[(index + all.length) % all.length]!.focus()
}

async function show(at: 'first' | 'last') {
  open.value = true
  await nextTick()
  focusItem(at === 'first' ? 0 : -1)
}

function hide(returnFocus: boolean) {
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function toggle() {
  if (open.value) hide(true)
  else void show('first')
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    void show(event.key === 'ArrowDown' ? 'first' : 'last')
  }
}

function onMenuKeydown(event: KeyboardEvent) {
  const all = items()
  const current = all.indexOf(document.activeElement as HTMLButtonElement)
  const moves: Record<string, number> = { ArrowDown: current + 1, ArrowUp: current - 1, Home: 0, End: all.length - 1 }
  if (event.key in moves) {
    event.preventDefault()
    focusItem(moves[event.key]!)
  } else if (event.key === 'Escape') {
    // Only this menu: an Esc here must not also close something around it.
    event.preventDefault()
    event.stopPropagation()
    hide(true)
  } else if (event.key === 'Tab') {
    hide(false)
  }
}

function choose(action: 'rename' | 'duplicate') {
  hide(true)
  if (action === 'rename') emit('rename')
  else emit('duplicate')
}

function onPointerDown(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) hide(false)
}

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('pointerdown', onPointerDown)
  else document.removeEventListener('pointerdown', onPointerDown)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown))
</script>

<template>
  <div ref="root" class="wrap">
    <button
      ref="trigger"
      type="button"
      :class="['icon-btn', 'm3-state', 'm3-target', { 'icon-btn--open': open }]"
      :aria-label="t('documents.more', { title: props.title })"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="open ? menuId : undefined"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
    </button>
    <div v-if="open" :id="menuId" role="menu" class="menu" :aria-label="t('documents.more', { title: props.title })" @keydown="onMenuKeydown">
      <button type="button" role="menuitem" tabindex="-1" class="item m3-state" @click="choose('rename')">
        <!-- A text field with its cursor: renaming, not editing the CV. -->
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 7H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h9" /><g class="caret"><path d="M19 5v14" /><path d="M17 5h4" /><path d="M17 19h4" /></g><path d="M7 12h4" /></svg>
        {{ t('actions.rename') }}
      </button>
      <button type="button" role="menuitem" tabindex="-1" class="item m3-state" @click="choose('duplicate')">
        <!-- A page with a plus: a new copy, not the clipboard. Behind it, the copy that rises on hover. -->
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="sheet" d="M7.5 3V2.5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2h-.5" /><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M12 11v6" /><path d="M9 14h6" /></svg>
        {{ t('actions.duplicate') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
}

.icon-btn {
  --container: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--md-on-surface-variant);
  cursor: pointer;
}

.icon-btn--open {
  --layer: calc(var(--state-pressed) * 100%);
}

/* M3 menu under ⋮, over the cards below. */
.menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  min-width: 180px;
  /* The recipe of the app's floating lists: the selects' (spec 091), the phone prefix's, the AI's. */
  padding: 4px;
  border-radius: var(--shape-md);
  background: var(--md-surface-container-highest);
  box-shadow: var(--elevation-3), inset 0 0 0 1px var(--md-outline-variant);
}

.item {
  --container: transparent;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--shape-sm);
  color: var(--md-on-surface);
  font: var(--type-body-medium);
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.item svg {
  flex-shrink: 0;
  color: var(--md-on-surface-variant);
}

/* The copy behind the page shows only when it rises (below). */
.sheet {
  opacity: 0;
}

/* On hover or keyboard focus each icon acts out its item: Renombrar's cursor steps out of the field and
   blinks; Duplicar's copy rises from behind the page. Both in primary; none with reduced motion. */
@media (prefers-reduced-motion: no-preference) {
  .item svg {
    overflow: visible;
  }

  .caret,
  .sheet {
    transition:
      translate var(--duration-short) var(--motion-standard),
      opacity var(--duration-short) var(--motion-standard),
      color var(--duration-short) var(--motion-standard);
  }

  .sheet {
    translate: -2.5px 2.5px;
  }

  .item:hover .caret,
  .item:focus-visible .caret {
    color: var(--md-primary);
    translate: 2px 0;
    animation: blink 1s step-end infinite;
  }

  .item:hover .sheet,
  .item:focus-visible .sheet {
    color: var(--md-primary);
    opacity: 1;
    translate: 0 0;
  }

  @keyframes blink {
    60% {
      opacity: 0;
    }
  }
}
</style>
