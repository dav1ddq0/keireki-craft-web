import { computed, ref } from 'vue'
import { readPrefs, writePrefs } from '@/services/prefs'
import es from './es'
import en from './en'
import fr from './fr'
import it from './it'
import pt from './pt'
import de from './de'

export const LOCALES = ['es', 'en', 'fr', 'it', 'pt', 'de'] as const
export type Locale = (typeof LOCALES)[number]
export type Messages = typeof es

/** Each UI language named in itself, so it reads right whatever the current UI language (spec 027). */
export const LOCALE_NAMES: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  it: 'Italiano',
  pt: 'Português',
  de: 'Deutsch',
}

/** The tag for `Intl` and `lang`: the Portuguese of the interface is European (spec 057). */
export const LOCALE_TAGS: Record<Locale, string> = { es: 'es', en: 'en', fr: 'fr', it: 'it', pt: 'pt-PT', de: 'de' }

const dictionaries: Record<Locale, Messages> = { es, en, fr, it, pt, de }

export function isLocale(value: unknown): value is Locale {
  return (LOCALES as readonly unknown[]).includes(value)
}

/** The stored UI language, or Spanish when it is missing or not one of ours. */
export function storedLocale(): Locale {
  const stored = readPrefs().uiLanguage
  return isLocale(stored) ? stored : 'es'
}

const current = ref<Locale>(storedLocale())

/**
 * Deliberately hand-rolled instead of vue-i18n: a handful of locales, flat interpolation
 * and no plural rules do not justify the dependency. Every other dictionary is typed as
 * `typeof es`, so a missing key is a compile error rather than a runtime blank.
 */
export function useI18n() {
  const locale = computed<Locale>({
    get: () => current.value,
    set: (value) => setLocale(value),
  })

  function t(path: string, params?: Record<string, string | number>): string {
    const raw = resolve(dictionaries[current.value], path) ?? resolve(dictionaries.es, path) ?? path
    if (typeof raw !== 'string') return path
    return params
      ? raw.replace(/\{(\w+)\}/g, (m, key) => (key in params ? String(params[key]) : m))
      : raw
  }

  /** The current locale's tag for `Intl` (`pt-PT` for Portuguese). */
  const intlLocale = computed(() => LOCALE_TAGS[current.value])

  return { t, locale, intlLocale, setLocale, availableLocales: [...LOCALES] as Locale[] }
}

export function setLocale(value: Locale) {
  current.value = value
  writePrefs({ uiLanguage: value })
  document.documentElement.lang = LOCALE_TAGS[value]
}

function resolve(obj: unknown, path: string): unknown {
  return path.split('.').reduce<any>((acc, key) => (acc == null ? acc : acc[key]), obj)
}

/** Locale-aware date formatting for the document list. */
export function formatDate(iso: string, locale: Locale = current.value): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

/** "2022-03" → "mar 2022" in the UI language; anything else is returned as typed. */
export function formatMonth(value: string, locale: Locale = current.value): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return value
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1)
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], { month: 'short', year: 'numeric' }).format(date)
}
