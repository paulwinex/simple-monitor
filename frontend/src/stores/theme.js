import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getThemes, getSavedTheme } from 'src/utils/themes'

export const useThemeStore = defineStore('theme', () => {
  const currentThemeId = ref(getSavedTheme().id)

  const currentTheme = computed(
    () => getThemes().find((t) => t.id === currentThemeId.value) || getSavedTheme()
  )

  function setThemeId(id) {
    currentThemeId.value = id
  }

  return {
    currentThemeId,
    currentTheme,
    setThemeId
  }
})