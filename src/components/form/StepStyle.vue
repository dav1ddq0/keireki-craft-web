<script setup lang="ts">
import { computed } from 'vue'
import { useCvStore } from '@/stores/cv'
import { useI18n } from '@/i18n'
import { useCapabilities } from '@/composables/useCapabilities'
import { accentIfChosen, getTemplate, templates } from '@/templates/registry'
import BaseField from '@/components/ui/BaseField.vue'
import RangeSlider from '@/components/ui/RangeSlider.vue'
import TemplateGallery from './TemplateGallery.vue'
import StylePreviewStrip from './StylePreviewStrip.vue'
import { useIsPhone } from '@/composables/useIsPhone'
import { CV_LANGUAGES, FONT_OPTIONS, PAGE_MARGINS, PALETTE, isSameColor } from '@/core/stylePresets'

const cv = useCvStore()
const { t } = useI18n()
const isPhone = useIsPhone()
const { supports, reasonFor } = useCapabilities()
const accentSupported = supports('accentColor')
const fontSupported = supports('customFont')
const accentReason = reasonFor('accentColor')
const fontReason = reasonFor('customFont')

const style = computed(() => cv.data.style)
/** The swatches of the template in use, if it has its own family of colours, else the shared ones (spec 052). */
const palette = computed(() => getTemplate(cv.templateId).palette ?? PALETTE)

</script>

<template>
  <div class="step">
    <StylePreviewStrip v-if="isPhone" />

    <TemplateGallery
      :templates="templates"
      :active-id="cv.templateId"
      :accent-for="(id: string) => accentIfChosen(id, style)"
      @pick="cv.chooseTemplate"
    />

    <section class="block">
      <div class="grid">
        <BaseField
          v-slot="{ id }"
          :label="t('style.accentColor')"
          :disabled="!accentSupported"
          :disabled-reason="accentReason"
        >
          <div class="color-row" role="group" :aria-label="t('style.palette')">
            <button
              v-for="color in palette"
              :key="color"
              type="button"
              class="swatch"
              :style="{ background: color }"
              :aria-label="t(`style.colorNames.${color.slice(1)}`)"
              :title="t(`style.colorNames.${color.slice(1)}`)"
              :aria-pressed="isSameColor(style.accentColor, color)"
              :disabled="!accentSupported"
              @click="style.accentColor = color"
            >
              <span v-if="isSameColor(style.accentColor, color)" aria-hidden="true">✓</span>
            </button>
            <input :id="id" v-model="style.accentColor" type="color" :disabled="!accentSupported" />
          </div>
        </BaseField>

        <BaseField
          v-slot="{ id }"
          :label="t('style.fontFamily')"
          :disabled="!fontSupported"
          :disabled-reason="fontReason"
        >
          <select :id="id" v-model="style.fontFamily" :disabled="!fontSupported">
            <option v-for="font in FONT_OPTIONS" :key="font.id" :value="font.value">
              {{ font.label }} · {{ t(`style.fonts.${font.id}`) }}{{ font.bundled ? '' : ` · ${t('style.systemFont')}` }}
            </option>
          </select>
        </BaseField>

        <BaseField v-slot="{ id }" :label="t('style.cvLanguage')" :hint="t('style.cvLanguageHint')">
          <select :id="id" v-model="cv.data.meta.language">
            <option v-for="language in CV_LANGUAGES" :key="language.code" :value="language.code" :lang="language.code">
              {{ language.label }}
            </option>
          </select>
        </BaseField>

        <BaseField v-slot="{ id }" :label="`${t('style.fontScale')} · ${style.fontScale.toFixed(2)}×`">
          <RangeSlider :id="id" v-model="style.fontScale" :min="0.85" :max="1.15" :step="0.01" />
        </BaseField>

        <BaseField
          v-slot="{ id }"
          :label="`${t('style.spacingScale')} · ${style.spacingScale.toFixed(2)}×`"
        >
          <RangeSlider :id="id" v-model="style.spacingScale" :min="0.85" :max="1.3" :step="0.01" />
        </BaseField>

        <BaseField v-slot="{ id }" :label="t('style.pageMargin')">
          <select :id="id" v-model="style.pageMargin">
            <option v-for="margin in PAGE_MARGINS" :key="margin" :value="margin">
              {{ margin }}
            </option>
          </select>
        </BaseField>
      </div>
    </section>
  </div>
</template>

<style scoped>
.step {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.color-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.swatch {
  width: 2.2em;
  height: 2.2em;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 50%;
  color: #1a1a1a;
  font-weight: 700;
  line-height: 1;
  text-shadow: 0 0 3px #fff;
}

.swatch[aria-pressed='true'] {
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent);
}

/*
 * The custom colour: the browser's own box drawn as one more swatch, a round one with a ring of
 * every hue around it to say "any colour" (spec 043). The ring is the input's padding showing its
 * gradient; the swatch inside it is the chosen colour.
 */
.color-row input[type='color'] {
  appearance: none;
  box-sizing: border-box;
  width: 2.2em;
  height: 2.2em;
  padding: 4px;
  border: 0;
  border-radius: 50%;
  background: conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444);
  cursor: pointer;
}

.color-row input[type='color']::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-row input[type='color']::-webkit-color-swatch {
  border: 2px solid var(--surface);
  border-radius: 50%;
}

.color-row input[type='color']::-moz-color-swatch {
  border: 2px solid var(--surface);
  border-radius: 50%;
}

.color-row input[type='color']:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

/* After the base rules, which would otherwise win on source order. */
@media (pointer: coarse) {
  .swatch {
    width: 44px;
    height: 44px;
  }

  .color-row input[type='color'] {
    width: 44px;
    height: 44px;
  }
}
</style>
