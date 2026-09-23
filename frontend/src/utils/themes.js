export const THEME_STORAGE_KEY = 'sm-dashboard-theme'

const THEMES = [
  { id: 'dark', label: 'Dark', dark: true },
  { id: 'light', label: 'Light', dark: false }
]

export function getThemes() {
  return THEMES
}

export function getDefaultTheme() {
  return THEMES[0]
}

export function getSavedTheme() {
  const id = localStorage.getItem(THEME_STORAGE_KEY)
  return THEMES.find((t) => t.id === id) || getDefaultTheme()
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme.id)
}

export function applyTheme(theme, $q) {
  $q.dark.set(theme.dark)
  saveTheme(theme)
}