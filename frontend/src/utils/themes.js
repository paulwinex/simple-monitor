export const THEME_STORAGE_KEY = 'sm-dashboard-theme'

const THEMES = [
  {
    id: 'dark',
    label: 'Dark',
    dark: true,
    widget: {
      background: '#424242',
      headerBackground: '#545454',
      border: '#616161',
      headerBorder: '#616161',
      titleColor: '#e0e0e0',
      contentColor: '#bdbdbd'
    }
  },
  {
    id: 'light',
    label: 'Light',
    dark: false,
    widget: {
      background: '#ffffff',
      headerBackground: '#f5f5f5',
      border: '#e0e0e0',
      headerBorder: '#e0e0e0',
      titleColor: '#424242',
      contentColor: '#616161'
    }
  }
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

export function hexToRgba(hex, alpha) {
  let h = (hex || '').replace('#', '').trim()
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    return hex
  }
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}