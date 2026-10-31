<script setup lang="ts">
/** Modal bottom sheet on a native <dialog>: focus trap, Esc, top layer and focus return come free. */
import { useId, useTemplateRef } from 'vue'
import { useI18n } from '@/i18n'
import { useModalDialog } from '@/composables/useModalDialog'

const props = defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const titleId = useId()

useModalDialog(dialog, () => props.open)

/**
 * `closedby="any"` handles the backdrop tap where it exists. Elsewhere (Safari) a click whose
 * target is the dialog itself and that lands outside its box is a backdrop click: the sheet has
 * no padding of its own, so inside clicks always target a child.
 */
function onBackdropClick(event: MouseEvent) {
  const el = dialog.value
  if (!el || event.target !== el || 'closedBy' in HTMLDialogElement.prototype) return
  const box = el.getBoundingClientRect()
  const inside =
    box.top <= event.clientY && event.clientY <= box.bottom &&
    box.left <= event.clientX && event.clientX <= box.right
  if (!inside) el.close()
}
</script>

<template>
  <!-- autofocus: the sheet itself takes the focus on open, not the close button, which Safari would
       ring as if reached by keyboard (WebKit bug 247416). Tab still goes to it. -->
  <dialog
    ref="dialog"
    class="sheet"
    autofocus
    closedby="any"
    :aria-labelledby="titleId"
    @close="emit('close')"
    @click="onBackdropClick"
  >
    <div class="grabber" aria-hidden="true" />
    <header class="head">
      <h2 :id="titleId" class="title">{{ title }}</h2>
      <button type="button" class="close m3-icon-btn m3-state" :aria-label="t('actions.close')" @click="dialog?.close()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </header>
    <div class="content"><slot /></div>
    <footer v-if="$slots.footer" class="foot"><slot name="footer" /></footer>
  </dialog>
</template>

<style scoped>
.sheet {
  /* Pinned to the bottom edge, full width: the thumb reaches it. */
  margin: auto 0 0;
  width: 100%;
  max-width: none;
  max-height: min(88dvh, 760px);
  padding: 0;
  border: 0;
  border-radius: var(--shape-xl) var(--shape-xl) 0 0;
  background: var(--md-surface-container-low);
  color: var(--md-on-surface);
  overscroll-behavior: contain;
  flex-direction: column;
}

.sheet[open] {
  display: flex;
}

/* The sheet is not a control: focused on open, it shows no ring of its own. */
.sheet:focus-visible {
  outline: none;
}

.sheet::backdrop {
  background: rgb(0 0 0 / 0.32);
}

/* Keep the page still behind the sheet. */
:global(html:has(dialog.sheet[open])) {
  overflow: hidden;
}

.grabber {
  align-self: center;
  flex-shrink: 0;
  width: 32px;
  height: 4px;
  margin-top: 16px;
  border-radius: var(--shape-full);
  background: color-mix(in srgb, var(--md-on-surface-variant) 40%, transparent);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  /* Room below for the close button's keyboard focus ring (2 px + 2 px offset), off the content. */
  padding: 4px 8px 8px 16px;
}

.title {
  margin: 0;
  font: var(--type-title-large);
}

.close {
  width: 48px;
  height: 48px;
  color: var(--md-on-surface-variant);
}

.content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px;
  overscroll-behavior: contain;
}

.foot {
  flex-shrink: 0;
  padding: 12px 16px calc(16px + var(--safe-bottom));
}

/* Slide up on open; closing is instant, which also avoids the engines that cannot transition
   `display` for the top layer. */
@media (prefers-reduced-motion: no-preference) {
  .sheet[open] {
    transition: transform 0.28s ease-out;

    @starting-style {
      transform: translateY(100%);
    }
  }

  .sheet[open]::backdrop {
    transition: background-color 0.28s ease-out;

    @starting-style {
      background-color: rgb(0 0 0 / 0);
    }
  }
}
</style>
