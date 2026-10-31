<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useI18n } from '@/i18n'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useIsDesktop, useIsPhone } from '@/composables/useIsPhone'
import WizardNav from './WizardNav.vue'
import StepHeader from './StepHeader.vue'
import StepPersonal from './StepPersonal.vue'
import StepSummary from './StepSummary.vue'
import StepExperience from './StepExperience.vue'
import StepEducation from './StepEducation.vue'
import StepSkills from './StepSkills.vue'
import StepLanguages from './StepLanguages.vue'
import StepCustom from './StepCustom.vue'
import StepStyle from './StepStyle.vue'
import StepExport from './StepExport.vue'

const ui = useUiStore()
const { t } = useI18n()
const isPhone = useIsPhone()
const isDesktop = useIsDesktop()

/** Desktop footer names the neighbouring steps (spec 018); elsewhere the short labels stay. */
const prevLabel = computed(() => {
  const id = ui.steps[ui.stepIndex - 1]
  return isDesktop.value && id ? t(`steps.${id}`) : t('actions.back')
})
const nextLabel = computed(() => {
  const id = ui.steps[ui.stepIndex + 1]
  return isDesktop.value && id ? t('dock.next', { step: t(`steps.${id}`) }) : t('actions.next')
})

/** Statically mapped rather than dynamically imported: nine small steps, and the
 *  user navigates freely between them, so lazy loading would only add flicker. */
const STEP_COMPONENTS = {
  personal: StepPersonal,
  summary: StepSummary,
  experience: StepExperience,
  education: StepEducation,
  skills: StepSkills,
  languages: StepLanguages,
  custom: StepCustom,
  style: StepStyle,
  export: StepExport,
} as const

const current = computed(() => STEP_COMPONENTS[ui.step])

/** Which way the step slides: forward to a later step, back to an earlier one (spec 048). Set before the render. */
const direction = ref<'forward' | 'back'>('forward')
watch(
  () => ui.stepIndex,
  (next, previous) => {
    direction.value = next >= previous ? 'forward' : 'back'
  },
  { flush: 'sync' },
)

/** A new step starts at its top: the form is one scroller, and it kept the last step's position. */
const root = useTemplateRef<HTMLElement>('root')
watch(
  () => ui.step,
  () => {
    if (root.value) root.value.scrollTop = 0
  },
)
</script>

<template>
  <div ref="root" class="wizard">
    <StepHeader v-if="isPhone" />
    <!-- Desktop: the rail (StepRail, beside this form) replaces the tab strip. -->
    <div v-else-if="isDesktop" class="intro">
      <span class="position">{{ t('stepSheet.position', { n: ui.stepIndex + 1, total: ui.steps.length }) }}</span>
      <h2 class="heading view-title">{{ t(`steps.${ui.step}`) }}</h2>
      <p class="lead">{{ t(`stepIntro.${ui.step}`) }}</p>
    </div>
    <template v-else>
      <WizardNav />
      <h2 class="heading view-title">{{ t(`steps.${ui.step}`) }}</h2>
    </template>

    <div class="body">
      <Transition :name="`step-${direction}`" mode="out-in">
        <div :key="ui.step" class="step-frame">
          <component :is="current" />
        </div>
      </Transition>
    </div>

    <footer class="footer">
      <BaseButton :disabled="ui.stepIndex === 0" @click="ui.prevStep()">
        ← {{ prevLabel }}
      </BaseButton>

      <BaseButton
        variant="primary"
        :disabled="ui.stepIndex === ui.steps.length - 1"
        @click="ui.nextStep()"
      >
        {{ nextLabel }} →
      </BaseButton>
    </footer>
  </div>
</template>

<style scoped>
.wizard {
  /* Read by the pinned style preview (StylePreviewStrip), which covers exactly this gap. */
  --wizard-gap: 16px;
  display: flex;
  flex-direction: column;
  gap: var(--wizard-gap);
  min-height: 0;
  /* No bottom padding: the sticky footer anchors to the padding box, so any padding here leaves a gap where content shows through under the bar. */ padding: 16px 16px 0;
  overflow: auto;
}

.body {
  flex: 1;
  /* A step sliding in or out must not add a sideways scrollbar. */
  overflow-x: clip;
}

/* The step slides a little in the direction of travel and fades: out fast, in with the decelerate curve. */
.step-forward-enter-active,
.step-back-enter-active {
  transition: opacity var(--duration-medium) var(--motion-emphasized-decelerate), transform var(--duration-medium) var(--motion-emphasized-decelerate);
}

.step-forward-leave-active,
.step-back-leave-active {
  transition: opacity var(--duration-short) var(--motion-standard), transform var(--duration-short) var(--motion-standard);
}

.step-forward-enter-from,
.step-back-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.step-forward-leave-to,
.step-back-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}

/* Reduced motion: no slide and no fade, so not even a blank frame between the two forms. */
@media (prefers-reduced-motion: reduce) {
  .step-forward-enter-from,
  .step-forward-leave-to,
  .step-back-enter-from,
  .step-back-leave-to {
    opacity: 1;
    transform: none;
  }
}

.intro {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.position {
  font-size: var(--size-12);
  font-weight: 500;
  color: var(--text-muted);
}

.lead {
  margin: 0;
  max-width: 60ch;
  color: var(--text-muted);
}

@media (min-width: 1001px) {
  .wizard {
    padding: 20px 20px 0;
    gap: 16px;
  }
}

@media (min-width: 1280px) {
  .wizard {
    padding: 24px 36px 0;
  }
}

.footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
  position: sticky;
  bottom: 0;
  background: var(--bg);
}

/* On phones the dock (MobileDock, outside this form so it survives preview mode) takes over
   Next and the Edit / Preview switch, and the step bar has the arrows. */
@media (max-width: 640px) {
  .footer {
    display: none;
  }
}

/* A phone held sideways has ~390px of height: give it to the fields. */
@media (max-height: 500px) and (orientation: landscape) {
  .wizard {
    --wizard-gap: 8px;
    padding-top: 8px;
  }

  /* The active tab already names the step; keep the heading for screen readers only. */
  .heading {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  .footer {
    padding: 4px 0;
  }
}
</style>
