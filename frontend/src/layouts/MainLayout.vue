<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary">
      <q-toolbar>
        <q-toolbar-title>
          Smart Monitor
        </q-toolbar-title>

        <q-btn
          v-if="isEditMode"
          flat
          dense
          round
          icon="add"
          @click="showAddWidget = true"
        >
          <q-tooltip>Add Widget</q-tooltip>
        </q-btn>

        <q-btn flat dense round icon="more_vert">
          <q-menu touch-position>
            <q-list style="min-width: 150px">
              <q-item clickable v-close-popup @click="toggleEditMode">
                <q-item-section avatar>
                  <q-icon :name="isEditMode ? 'edit' : 'edit_off'" />
                </q-item-section>
                <q-item-section>
                  {{ isEditMode ? 'Edit Mode: ON' : 'Edit Mode: OFF' }}
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="toggleTheme">
                <q-item-section avatar>
                  <q-icon :name="isDark ? 'light_mode' : 'dark_mode'" />
                </q-item-section>
                <q-item-section>
                  {{ isDark ? 'Light' : 'Dark' }}
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Add Widget Dialog -->
    <q-dialog v-model="showAddWidget">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Add Widget</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="selectedWidgetTitle"
            label="Widget Title"
            outlined
            dense
            class="q-mb-md"
          />
          <q-select
            v-model="selectedWidgetType"
            :options="widgetTypes"
            option-value="value"
            option-label="label"
            label="Widget Type"
            outlined
            dense
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn flat label="Add" color="primary" @click="confirmAddWidget" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useUIStore } from 'stores/ui'
import { useDashboardStore } from 'stores/dashboard'

const $q = useQuasar()
const uiStore = useUIStore()
const dashboardStore = useDashboardStore()

const showAddWidget = ref(false)
const selectedWidgetTitle = ref('')
const selectedWidgetType = ref('number')

const widgetTypes = [
  { value: 'number', label: 'Number' },
  { value: 'chart', label: 'Chart' },
  { value: 'gridContainer', label: 'Grid Container' }
]

let widgetCounter = 0

const isDark = computed(() => $q.dark.mode === true || $q.dark.mode === 'true')
const isEditMode = computed(() => uiStore.isEditMode)

function toggleTheme() {
  $q.dark.set(!isDark.value)
}

function toggleEditMode() {
  uiStore.toggleEditMode()
}

function confirmAddWidget() {
  widgetCounter++
  const widgetId = `widget-${widgetCounter}`
  const widgetType = selectedWidgetType.value

  const newWidget: any = {
    id: widgetId,
    type: widgetType,
    title: selectedWidgetTitle.value || `Widget ${widgetCounter}`,
    options: {},
    refreshInterval: 5000
  }

  if (widgetType === 'number') {
    newWidget.options = { decimals: 1, suffix: '', color: '#4CAF50' }
    newWidget.data = { value: 0 }
    newWidget.hostId = 'host-1'
    newWidget.deviceId = 'cpu'
    newWidget.sensors = [{ name: 'usage_percent', table: 'raw' }]
  } else if (widgetType === 'chart') {
    newWidget.options = { timeRange: '1h', showLegend: false, smooth: true, colors: ['#2196F3'], fill: true }
    newWidget.data = { data: [] }
    newWidget.hostId = 'host-1'
    newWidget.deviceId = 'cpu'
    newWidget.sensors = [{ name: 'usage_percent', table: 'raw' }]
  } else if (widgetType === 'gridContainer') {
    newWidget.children = []
    newWidget.childLayout = []
  }

  dashboardStore.addWidget(newWidget)
  
  showAddWidget.value = false
  selectedWidgetTitle.value = ''
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
