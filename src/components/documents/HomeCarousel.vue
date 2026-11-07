<script setup lang="ts">
/**
 * The home's preview (spec 077): the sample CV in one template at a time, turning by itself to the
 * next. Two faces, each a live render; the one turned away takes its next template unseen. A
 * showcase, not a picker: only the template's name, and a button to pause it. Still with reduced
 * motion, and paused while the tab is hidden or the carousel is out of view.
 */
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import type { CVData } from '@/types/cv'
import { useI18n } from '@/i18n'
import { applyTemplateDefaults, templates } from '@/templates/registry'
import CvRenderer from '@/components/preview/CvRenderer.vue'
import { facesAt, TURN_KEYFRAMES, TURN_MS } from '@/components/documents/homeCarousel'

const props = defineProps<{ sample: CVData; templateIds: string[] }>()

const { t } = useI18n()

const shown = computed(() => props.templateIds.map((id) => templates.find((t) => t.id === id)).filter((t) => t !== undefined))

const front = ref(0)
const back = ref(1)

/** The sample in a face's template, in that template's own accent and face. Never stored. */
const faceData = (index: number) => {
  const id = shown.value[index % shown.value.length]!.id
  return { ...props.sample, meta: { ...props.sample.meta, templateId: id }, style: applyTemplateDefaults(id, props.sample.style) }
}
const faces = computed(() =>
  [front.value, back.value].map((index, side) => ({
    side: side === 0 ? 'front' : 'back',
    template: shown.value[index % shown.value.length]!,
    data: faceData(index),
  })),
)

/* The page is laid out at its A4 width and scaled to the sheet's box, like the editor's preview. */
const PAGE_WIDTH = 794
const frame = useTemplateRef<HTMLElement>('frame')
const rig = useTemplateRef<HTMLElement>('rig')
const sheetWidth = ref(PAGE_WIDTH / 2)
const scale = computed(() => Math.min(1, sheetWidth.value / PAGE_WIDTH))

const paused = ref(false)
let animation: Animation | undefined
let tick = 0
let onScreen = true
let resize: ResizeObserver | undefined
let seen: IntersectionObserver | undefined

function sync() {
  const faces = facesAt(Number(animation?.currentTime ?? 0), shown.value.length)
  front.value = faces.front
  back.value = faces.back
}

function follow() {
  sync()
  tick = requestAnimationFrame(follow)
}

/** Runs only when nobody paused it and it can be seen. */
function update() {
  if (!animation) return
  const run = !paused.value && onScreen && document.visibilityState !== 'hidden'
  if (run && animation.playState !== 'running') {
    animation.play()
    tick = requestAnimationFrame(follow)
  } else if (!run && animation.playState === 'running') {
    animation.pause()
    cancelAnimationFrame(tick)
    sync()
  }
}

function toggle() {
  paused.value = !paused.value
  update()
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const canTurn = ref(false)

onMounted(() => {
  if (frame.value && typeof ResizeObserver !== 'undefined') {
    resize = new ResizeObserver(([entry]) => {
      if (entry) sheetWidth.value = entry.contentRect.width * 0.78
    })
    resize.observe(frame.value)
  }
  if (!rig.value || typeof rig.value.animate !== 'function' || reducedMotion()) return
  canTurn.value = true
  animation = rig.value.animate(TURN_KEYFRAMES, { duration: TURN_MS, iterations: Infinity })
  animation.pause()
  if (frame.value && typeof IntersectionObserver !== 'undefined') {
    seen = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true
      update()
    })
    seen.observe(frame.value)
  }
  document.addEventListener('visibilitychange', update)
  update()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(tick)
  animation?.cancel()
  resize?.disconnect()
  seen?.disconnect()
  document.removeEventListener('visibilitychange', update)
})

/* Seen from about 2.4 sheet widths away: a clear turn that stays inside the frame. */
const frameStyle = computed(() => ({ perspective: `${Math.round(sheetWidth.value * 2.4)}px` }))
const sheetStyle = computed(() => ({ width: `${sheetWidth.value}px`, height: `${(sheetWidth.value * 297) / 210}px` }))
const pageStyle = computed(() => ({ transform: `scale(${scale.value})` }))
</script>

<template>
  <div class="carousel">
    <!-- A picture of the sample, not content to read: each face's label says which template it is. -->
    <div ref="frame" class="frame" :style="frameStyle" aria-hidden="true" inert>
      <div ref="rig" class="rig">
        <div v-for="face in faces" :key="face.side" class="face" :class="face.side" :data-template="face.template.id">
          <div class="sheet" :style="sheetStyle">
            <div class="page cv-preview-paper" :style="pageStyle">
              <div class="cv-page">
                <CvRenderer :data="face.data" :template-id="face.template.id" />
              </div>
            </div>
          </div>
          <span class="face-name">{{ face.template.name }}</span>
        </div>
      </div>
    </div>
    <button
      v-if="canTurn"
      type="button"
      class="pause m3-icon-btn m3-state m3-target"
      :aria-label="paused ? t('welcome.carouselPlay') : t('welcome.carouselPause')"
      @click="toggle"
    >
      <svg v-if="paused" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z" /></svg>
      <svg v-else aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
    </button>
  </div>
</template>

<style scoped>
.carousel {
  position: relative;
}

/* The editor preview's surface, with the sheet narrower than it so the turn stays inside. */
.frame {
  position: relative;
  height: clamp(340px, 52vh, 520px);
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--surface-2);
}

.rig {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

.face {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  padding-top: 20px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.face.back {
  transform: rotateY(180deg);
}

.sheet {
  overflow: hidden;
}

.page {
  width: 210mm;
  transform-origin: top left;
}

.cv-page {
  box-shadow: var(--elevation-2);
}

/* The template's name, on the sheet, turning with it. */
.face-name {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--shape-full);
  background: var(--surface);
  box-shadow: var(--elevation-2);
  color: var(--text);
  font: var(--type-label-large);
  letter-spacing: var(--tracking-label-large);
  white-space: nowrap;
}

.pause {
  position: absolute;
  right: 12px;
  bottom: 12px;
  background: var(--surface);
  box-shadow: var(--elevation-2);
  color: var(--text);
}
</style>
