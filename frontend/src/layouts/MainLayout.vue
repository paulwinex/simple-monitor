<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title>
          <q-icon name="dashboard" size="sm" class="q-mr-sm" />
          Smart Monitor
        </q-toolbar-title>

        <!-- Dashboard name -->
        <div class="text-subtitle1 q-mx-lg">
          {{ dashboardName }}
        </div>

        <q-space />

        <!-- Save/Load buttons -->
        <q-btn
          flat
          round
          icon="save"
          color="white"
          @click="saveDashboard"
        >
          <q-tooltip>Save Dashboard</q-tooltip>
        </q-btn>

        <q-btn
          flat
          round
          icon="refresh"
          color="white"
          @click="loadDashboard"
        >
          <q-tooltip>Reload Dashboard</q-tooltip>
        </q-btn>

        <!-- Theme toggle -->
        <q-btn
          flat
          round
          :icon="$q.dark.isActive ? 'brightness_3' : 'brightness_5'"
          color="white"
          @click="toggleTheme"
        >
          <q-tooltip>{{ $q.dark.isActive ? 'Light Mode' : 'Dark Mode' }}</q-tooltip>
        </q-btn>

        <!-- Settings -->
        <q-btn
          flat
          round
          icon="settings"
          color="white"
          @click="openDashboardSettings"
        >
          <q-tooltip>Dashboard Settings</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Floating Action Button for Add Widget -->
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn
        fab
        icon="add"
        color="accent"
        @click="openAddWidgetDialog"
      >
        <q-tooltip>Add Widget</q-tooltip>
      </q-btn>
    </q-page-sticky>

    <!-- Edit mode toggle -->
    <q-page-sticky position="bottom-left" :offset="[18, 18]">
      <q-btn
        :color="isEditing ? 'negative' : 'positive'"
        :icon="isEditing ? 'lock' : 'lock_open'"
        :label="isEditing ? 'Done Editing' : 'Edit Layout'"
        @click="toggleEditMode"
      />
    </q-page-sticky>
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { useDashboardStore } from '../stores/dashboard'

const $q = useQuasar()
const dashboardStore = useDashboardStore()

const dashboardName = computed(() => dashboardStore.dashboardName)
const isEditing = computed(() => dashboardStore.isEditing)

function toggleTheme() {
  $q.dark.toggle()
}

function toggleEditMode() {
  dashboardStore.toggleEditMode()
}

function openAddWidgetDialog() {
  dashboardStore.openAddWidgetDialog()
}

async function saveDashboard() {
  try {
    await dashboardStore.saveToBackend()
    $q.notify({
      type: 'positive',
      message: 'Dashboard saved successfully',
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to save dashboard',
    })
  }
}

async function loadDashboard() {
  try {
    await dashboardStore.loadFromBackend()
    $q.notify({
      type: 'positive',
      message: 'Dashboard loaded successfully',
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load dashboard',
    })
  }
}

function openDashboardSettings() {
  dashboardStore.openSettingsDialog()
}
</script>

<style scoped>
.q-header {
  min-height: 64px;
}
</style>
