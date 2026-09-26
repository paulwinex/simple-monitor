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
import { onMounted } from 'vue'
import AddWidgetDialog from 'components/widgets/AddWidgetDialog.vue'
import EditWidgetDialog from 'components/widgets/EditWidgetDialog.vue'
import { useThemeStore } from 'stores/theme'

/**
 * The single place dashboard theme tokens reach the DOM.
 *
 * Every other component reads CSS variables and never writes them, so there is
 * exactly one writer and no ordering question between widgets. The store also
 * applies on theme change (switching dashboards, editor preview), so this
 * component only has to cover the first load.
 */
const themeStore = useThemeStore()

onMounted(async () => {
  if (!themeStore.hasThemes) await themeStore.loadThemes()
  themeStore.setThemeId(themeStore.currentThemeId)
})
</script>
