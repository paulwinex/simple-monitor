import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import {
  UI_THEMES,
  UI_THEME_STORAGE_KEY,
  isUiTheme,
  resolveUiTheme
} from 'src/utils/themes'

const LABELS = {
  light: 'Светлая',
  dark: 'Тёмная',
  system: 'Системная'
}

/**
 * UI chrome preference (light/dark/system).
 *
 * Deliberately independent of the dashboard theme: the app chrome follows the
 * OS or the user's explicit pick, while the dashboard content follows the theme
 * assigned to that dashboard. Tying them together is what made the old
 * `theme.dark` flag necessary, and it forced Quasar's palette to change
 * whenever a dashboard theme was selected.
 */
export const useUiThemeStore = defineStore('uiTheme', () => {
  const $q = useQuasar()

  function readPreference() {
    try {
      const stored = window.localStorage.getItem(UI_THEME_STORAGE_KEY)
      return isUiTheme(stored) ? stored : 'system'
    } catch {
      // Private mode / disabled storage: fall back to the OS preference.
      return 'system'
    }
  }

  const preference = ref(readPreference())

  /** The concrete mode Quasar should render with, 'system' already resolved. */
  const resolved = computed(() => resolveUiTheme(preference.value))

  const options = computed(() =>
    UI_THEMES.map((value) => ({ label: LABELS[value], value }))
  )

  function apply() {
    $q.dark.set(resolved.value === 'dark')
  }

  function setPreference(value) {
    const next = isUiTheme(value) ? value : 'system'
    preference.value = next
    try {
      window.localStorage.setItem(UI_THEME_STORAGE_KEY, next)
    } catch {
      // Not being able to remember the choice is not worth breaking the app.
    }
    apply()
  }

  /** Re-resolve after the OS preference changes, without touching the stored pick. */
  function handleSystemChange() {
    if (preference.value === 'system') apply()
  }

  return {
    preference,
    resolved,
    options,
    setPreference,
    apply,
    handleSystemChange
  }
})
