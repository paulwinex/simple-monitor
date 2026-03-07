<template>
  <q-page>
    <DashboardGrid
      @edit-widget="openEditDialog"
      @delete-widget="deleteWidget"
    />

    <AddWidgetDialog />
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useDashboardStore } from '../stores/dashboard'
import { useHostsStore } from '../stores/hosts'
import DashboardGrid from '../components/DashboardGrid.vue'
import AddWidgetDialog from '../components/dialogs/AddWidgetDialog.vue'
import type { WidgetConfig } from '../types'

const $q = useQuasar()
const dashboardStore = useDashboardStore()
const hostsStore = useHostsStore()

// Load dashboard and hosts on mount
onMounted(async () => {
  try {
    await dashboardStore.loadFromBackend()
    await hostsStore.fetchHosts()
    await hostsStore.fetchAllDevices()
  } catch (error) {
    console.error('Failed to load initial data:', error)
    $q.notify({
      type: 'warning',
      message: 'Failed to load dashboard. Using empty state.',
    })
  }
})

function openEditDialog(widget: WidgetConfig) {
  $q.notify({
    type: 'info',
    message: `Edit widget: ${widget.title} (not yet implemented)`,
  })
}

function deleteWidget(widgetId: string) {
  dashboardStore.removeWidget(widgetId)
}
</script>

<style scoped>
.q-page {
  background-color: var(--bg-color, #f5f5f5);
}

.body--dark .q-page {
  background-color: var(--dark-page, #121212);
}
</style>
