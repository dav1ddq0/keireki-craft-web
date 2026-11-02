import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { readPrefs } from '@/services/prefs'
import { LOCALE_TAGS, storedLocale } from '@/i18n'
import { resolveTheme, systemPrefersDark } from '@/core/theme'
import { isFramed, showFramedNotice } from '@/core/frameGuard'
import './styles/fonts.css'
import './styles/app.css'
import './styles/m3.css'
import './styles/print.css'

document.documentElement.lang = LOCALE_TAGS[storedLocale()]
document.documentElement.dataset.theme = resolveTheme(readPrefs().theme, systemPrefersDark())

if (isFramed()) showFramedNotice()
else createApp(App).use(createPinia()).mount('#app')

// Offline and installable (spec 067): the built site only, once the page has loaded.
if (import.meta.env.PROD && 'serviceWorker' in navigator && !isFramed()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => console.warn('Service worker not registered', error))
  })
}
