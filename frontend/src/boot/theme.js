import { useUiThemeStore } from 'stores/uiTheme'

/**
 * Applies the UI chrome preference before the first paint, so the app never
 * flashes the wrong chrome. The dashboard theme is applied later, by
 * MainLayout, once the theme catalog has loaded.
 */
export default async ({ app }) => {
  const store = useUiThemeStore(app.$pinia)
  store.apply()

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    // addEventListener is the modern API; addListener is the Safari<14 fallback.
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', store.handleSystemChange)
    } else if (typeof query.addListener === 'function') {
      query.addListener(store.handleSystemChange)
    }
  }
}
