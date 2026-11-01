<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useCvStore } from '@/stores/cv'
import { useI18n } from '@/i18n'
import { useValidation } from '@/composables/useValidation'
import { useCapabilities } from '@/composables/useCapabilities'
import { usePhotoThumb } from '@/composables/usePhotoThumb'
import { createLink } from '@/core/factory'
import { PHOTO_ACCEPT, PHOTO_MAX_MB, checkPhoto } from '@/core/photo'
import { MARITAL_STATUSES } from '@/types/cv'
import { deletePhoto, loadPhoto, savePhoto, StorageQuotaError } from '@/services/storage'
import BaseField from '@/components/ui/BaseField.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import FileDropzone from '@/components/import/FileDropzone.vue'
import SortableList from '@/components/ui/SortableList.vue'
import PhotoCropDialog from './PhotoCropDialog.vue'
import PhoneField from './PhoneField.vue'

const cv = useCvStore()
const { t } = useI18n()
const { emailWarning, urlWarning } = useValidation()
const { supports, reasonFor } = useCapabilities()

const photoSupported = supports('photo')
const photoReason = reasonFor('photo')
const photoError = ref<string | null>(null)
const { thumbUrl, refresh: refreshThumb } = usePhotoThumb(() => cv.data.personal.photo)

/**
 * The extras are opt-in: collapsed unless the CV already has one. The initial state is read once,
 * so clearing the last field while typing does not fold the block under the cursor.
 */
const hasExtras = computed(() => {
  const p = cv.data.personal
  return [p.birthDate, p.birthPlace, p.nationality, p.drivingLicense, p.maritalStatus].some((v) => v.trim())
})
const extrasOpen = ref(hasExtras.value)

/** The photo being framed (spec 025); nothing is stored until the crop is confirmed. */
const cropping = shallowRef<Blob | null>(null)

function onPhoto(file: File) {
  photoError.value = null
  const check = checkPhoto(file)
  if (!check.ok) {
    photoError.value = t('personal.photoTooLarge', { size: check.sizeMb, max: PHOTO_MAX_MB })
    return
  }
  cropping.value = file
}

/** Re-frames the stored photo; it is already a crop, so this can only zoom further in. */
async function adjustPhoto() {
  const reference = cv.data.personal.photo
  const blob = reference ? await loadPhoto(reference) : undefined
  if (blob) cropping.value = blob
}

async function onCropped(blob: Blob) {
  cropping.value = null
  try {
    cv.data.personal.photo = await savePhoto(cv.data.meta.id, blob, cv.data.personal.photo)
    await refreshThumb()
  } catch (error) {
    photoError.value = error instanceof StorageQuotaError ? t('notices.quota') : t('importView.parseError')
  }
}

async function removePhoto() {
  const reference = cv.data.personal.photo
  cv.data.personal.photo = undefined
  if (reference) await deletePhoto(reference)
}
</script>

<template>
  <div class="step">
    <div class="grid">
      <BaseField v-slot="{ id }" :label="t('personal.fullName')">
        <input :id="id" v-model="cv.data.personal.fullName" autocomplete="name" />
      </BaseField>

      <BaseField v-slot="{ id }" :label="t('personal.headline')" :hint="t('personal.headlineHint')">
        <input :id="id" v-model="cv.data.personal.headline" />
      </BaseField>

      <BaseField
        v-slot="{ id }"
        :label="t('personal.email')"
        :warning="emailWarning(cv.data.personal.email)"
      >
        <input :id="id" v-model="cv.data.personal.email" type="email" autocomplete="email" />
      </BaseField>

      <BaseField v-slot="{ id }" :label="t('personal.phone')">
        <PhoneField v-model="cv.data.personal.phone" :input-id="id" />
      </BaseField>

      <BaseField v-slot="{ id }" :label="t('personal.location')">
        <input :id="id" v-model="cv.data.personal.location" />
      </BaseField>

      <BaseField
        v-slot="{ id }"
        :label="t('personal.photo')"
        :disabled="!photoSupported"
        :disabled-reason="photoReason"
        :warning="photoError ?? undefined"
      >
        <div class="photo-row">
          <img v-if="thumbUrl" class="thumb" :src="thumbUrl" alt="" />
          <span v-else class="thumb thumb--empty" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="3.6" />
              <path d="M5 20c.6-3.6 3.4-5.6 7-5.6s6.4 2 7 5.6" />
            </svg>
          </span>
          <FileDropzone
            class="photo-drop"
            :input-id="id"
            compact
            :accept="PHOTO_ACCEPT"
            :disabled="!photoSupported"
            :hint="t('personal.photoHint')"
            @file="onPhoto"
          >
            {{ cv.data.personal.photo ? t('personal.photoReplace') : t('personal.photoDrop') }}
          </FileDropzone>
          <BaseButton v-if="cv.data.personal.photo" size="sm" :disabled="!photoSupported" @click="adjustPhoto">
            {{ t('personal.photoAdjust') }}
          </BaseButton>
          <BaseButton
            v-if="cv.data.personal.photo"
            size="sm"
            variant="danger"
            @click="removePhoto"
          >
            {{ t('personal.photoRemove') }}
          </BaseButton>
        </div>
      </BaseField>
      <PhotoCropDialog :photo="cropping" @confirm="onCropped" @cancel="cropping = null" />
    </div>

    <details class="extras" :open="extrasOpen" @toggle="extrasOpen = ($event.target as HTMLDetailsElement).open">
      <summary class="extras-summary">{{ t('personal.extras') }}</summary>
      <p class="extras-note">{{ t('personal.extrasNote') }}</p>
      <div class="grid">
        <BaseField v-slot="{ id }" :label="t('personal.birthDate')">
          <input :id="id" v-model="cv.data.personal.birthDate" type="date" autocomplete="bday" />
        </BaseField>
        <BaseField v-slot="{ id }" :label="t('personal.birthPlace')">
          <input :id="id" v-model="cv.data.personal.birthPlace" />
        </BaseField>
        <BaseField v-slot="{ id }" :label="t('personal.nationality')">
          <input :id="id" v-model="cv.data.personal.nationality" />
        </BaseField>
        <BaseField v-slot="{ id }" :label="t('personal.drivingLicense')" :hint="t('personal.drivingLicenseHint')">
          <input :id="id" v-model="cv.data.personal.drivingLicense" />
        </BaseField>
        <BaseField v-slot="{ id }" :label="t('personal.maritalStatus')">
          <select :id="id" v-model="cv.data.personal.maritalStatus">
            <option value="">{{ t('personal.maritalNone') }}</option>
            <option v-for="status in MARITAL_STATUSES" :key="status" :value="status">
              {{ t(`personal.marital.${status}`) }}
            </option>
          </select>
        </BaseField>
      </div>
    </details>

    <section class="links">
      <h3 class="subtitle">{{ t('personal.links') }}</h3>
      <SortableList
        :items="cv.data.personal.links"
        @reorder="cv.data.personal.links = $event"
      >
        <template #default="{ item, index }">
          <div class="link-row">
            <BaseField v-slot="{ id }" :label="t('personal.linkLabel')">
              <input :id="id" v-model="item.label" />
            </BaseField>
            <BaseField v-slot="{ id }" :label="t('personal.linkUrl')" :warning="urlWarning(item.url)">
              <input :id="id" v-model="item.url" inputmode="url" />
            </BaseField>
            <BaseButton
              size="sm"
              variant="danger"
              :aria-label="item.label || item.url ? t('actions.removeNamed', { name: item.label || item.url }) : undefined"
              @click="cv.data.personal.links.splice(index, 1)"
            >
              {{ t('actions.remove') }}
            </BaseButton>
          </div>
        </template>
      </SortableList>

      <BaseButton size="sm" @click="cv.data.personal.links.push(createLink())">
        + {{ t('personal.addLink') }}
      </BaseButton>
    </section>
  </div>
</template>

<style scoped>
.extras {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 0 16px;
}

.extras[open] {
  padding-bottom: 16px;
}

.extras-summary {
  display: flex;
  align-items: center;
  min-height: var(--target);
  font-weight: 600;
  cursor: pointer;
}

.extras-note {
  margin: 0 0 8px;
  font-size: var(--size-12);
  color: var(--text-muted);
}

.step {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}

.photo-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.thumb {
  flex: none;
  width: 3.6em;
  height: 3.6em;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border);
}

.thumb--empty {
  display: grid;
  place-items: center;
  color: var(--text-muted);
  background: var(--surface-2);
}

.photo-drop {
  flex: 1 1 14em;
}

.links {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.subtitle {
  margin: 0;
  font-size: var(--size-14);
  font-weight: 600;
}

.link-row {
  display: grid;
  grid-template-columns: 1fr 1.6fr auto;
  gap: 8px;
  align-items: end;
}

@media (max-width: 640px) {
  .link-row {
    grid-template-columns: 1fr;
  }
}
</style>
