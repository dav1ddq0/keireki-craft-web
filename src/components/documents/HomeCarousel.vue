<script setup lang="ts">
/**
 * The home's preview (spec 077): the sample CV in one template at a time, turning by itself to the
 * next. Two faces, each a live render; the one turned away takes its next template unseen. A
 * showcase, not a picker: the template's name, what can be adjusted in it (its accent among the
 * style step's colours; its font, where the template lets it change) and a button to pause it.
 * Still with reduced motion, and paused while the tab is hidden or the carousel is out of view.
 */
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import type { CVData } from '@/types/cv'
import { useI18n } from '@/i18n'
import { applyTemplateDefaults, supports, templates } from '@/templates/registry'
import { FONT_OPTIONS, isSameColor, PALETTE } from '@/core/stylePresets'
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
/** Shown beside a template's own font, in this order: a spread of the style step's faces. */
const FONT_SHOWCASE = ['inter', 'sourceSans', 'raleway', 'garamond', 'georgia']

/** What a face's cards say: the template's accent among the suggested colours, and its font. */
function adjustable(data: CVData) {
  const { accentColor, fontFamily } = data.style
  const own = FONT_OPTIONS.find((font) => font.value === fontFamily)
  const others = FONT_SHOWCASE.map((id) => FONT_OPTIONS.find((font) => font.id === id)!).filter((font) => font !== own)
  return {
    accent: accentColor,
    swatches: [accentColor, ...PALETTE.filter((color) => !isSameColor(color, accentColor))],
    fontId: own?.id,
    fonts: supports(data.meta.templateId, 'customFont') ? [...(own ? [own] : []), ...others].slice(0, 4) : null,
  }
}

const faces = computed(() =>
  [front.value, back.value].map((index, side) => {
    const data = faceData(index)
    return { side: side === 0 ? 'front' : 'back', template: shown.value[index % shown.value.length]!, data, ...adjustable(data) }
  }),
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
/** The cards overlap the sheet's left edge, wherever its width puts it. */
const faceStyle = computed(() => ({ '--sheet-left': `calc(50% - ${sheetWidth.value / 2}px)` }))
</script>

<template>
  <div class="carousel">
    <!-- A picture of the sample, not content to read: each face's label says which template it is. -->
    <div ref="frame" class="frame" :style="frameStyle" aria-hidden="true" inert>
      <div ref="rig" class="rig">
        <div v-for="face in faces" :key="face.side" class="face" :class="face.side" :style="faceStyle" :data-template="face.template.id">
          <div class="sheet" :style="sheetStyle">
            <div class="page cv-preview-paper" :style="pageStyle">
              <div class="cv-page">
                <CvRenderer :data="face.data" :template-id="face.template.id" />
              </div>
            </div>
          </div>
          <span class="face-name">{{ face.template.name }}</span>
          <div class="card accent-card">
            <span class="card-title">{{ t('style.accentColor') }}</span>
            <span class="swatches">
              <span v-for="color in face.swatches" :key="color" class="swatch" :class="{ on: color === face.accent }" :style="{ background: color }" />
            </span>
          </div>
          <div v-if="face.fonts" class="card font-card">
            <span class="card-title">{{ t('style.fontFamily') }}</span>
            <ul>
              <li v-for="font in face.fonts" :key="font.id" :class="{ on: font.id === face.fontId }" :style="{ fontFamily: font.value }">{{ font.label }}</li>
            </ul>
          </div>
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

/* What can be adjusted in the template, overlapping the sheet's edge below its header (as in the
   reference): the CV's name stays in view. */
.card {
  position: absolute;
  left: calc(var(--sheet-left) - 32px);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--shape-md);
  background: var(--surface);
  box-shadow: var(--elevation-2);
  color: var(--text);
}

.accent-card {
  top: 34%;
}

.font-card {
  top: 54%;
}

.card-title {
  font: var(--type-label-small);
  color: var(--text-muted);
}

.swatches {
  display: flex;
  gap: 8px;
}

.swatch {
  width: 16px;
  height: 16px;
  border-radius: var(--shape-full);
}

.swatch.on {
  outline: 2px solid var(--text);
  outline-offset: 2px;
}

.font-card ul {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--size-14);
  color: var(--text-muted);
}

.font-card li.on {
  color: var(--accent);
  font-weight: 600;
}

/* On a narrow screen they would cover the sheet: the name says enough there. */
@media (max-width: 599px) {
  .card {
    display: none;
  }
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
