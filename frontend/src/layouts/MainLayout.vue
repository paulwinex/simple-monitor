<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Shared floating dialog windows (one instance for the whole app) -->
    <AddWidgetDialog />
    <EditWidgetDialog />
  </q-layout>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import AddWidgetDialog from 'components/widgets/AddWidgetDialog.vue'
import EditWidgetDialog from 'components/widgets/EditWidgetDialog.vue'
import { useThemeStore } from 'stores/theme'
import { getThemes, getSavedTheme, applyTheme } from 'src/utils/themes'

const $q = useQuasar()
const themeStore = useThemeStore()

const isDark = computed(() => $q.dark.mode === true || $q.dark.mode === 'true')

// Apply the theme globally whenever the current theme id changes
// (e.g. when switching dashboards that store their own theme).
watch(
  () => themeStore.currentThemeId,
  (id) => {
    const theme = getThemes().find((t) => t.id === id) || getSavedTheme()
    applyTheme(theme, $q)
  }
)

function toggleTheme() {
  const themes = getThemes()
  const currentDark = isDark.value
  const next = themes.find((t) => t.dark !== currentDark) || themes[0]
  applyTheme(next, $q)
}
</script>

<style scoped>
.container-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-actions {
  display: flex;
  gap: 4px;
}
</style>
