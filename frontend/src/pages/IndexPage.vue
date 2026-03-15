
<template>
  <q-page class="q-pa-md">
    <!-- Floating Edit Mode Toggle Button -->
    <div class="floating-menu-container">
      <q-btn
        v-if="!isEditMode"
        dense
        flat
        size="sm"
        icon="edit"
        color="grey-7"
        @click="toggleEditMode"
        class="floating-menu-btn"
        title="Edit Mode"
      />

      <!-- Edit Mode Menu -->
      <div v-else class="edit-mode-menu">
        <q-btn
          round
          dense
          flat
          icon="add"
          @click="handleAddWidget"
          title="Add Widget"
        />
        <q-btn
          round
          dense
          flat
          icon="save"
          @click="toggleEditMode"
          title="Save and Exit Edit Mode"
        />
        <q-btn
          round
          dense
          flat
          icon="edit"
          @click="handleDashboardSettings"
          title="Dashboard Settings"
        />
        <q-btn
          round
          dense
          flat
          icon="close"
          @click="confirmCancelEditMode"
          title="Discard Changes and Exit"
        />
      </div>
    </div>

    <div v-if="dashboardStore.isLoading" class="row justify-center q-mt-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="dashboardStore.hasError" class="row justify-center q-mt-xl">
      <q-banner class="bg-negative text-white">
        {{ dashboardStore.error }}
      </q-banner>
    </div>

    <div v-else :class="['dashboard-grid', { 'vue-grid-layout-light': !isDark }]">
      <GridLayout
        v-model:layout="dashboardStore.layout"
        :col-num="gridOptions.colNum"
        :row-height="gridOptions.rowHeight"
        :is-draggable="isEditMode"
        :is-resizable="isEditMode"
        :vertical-compact="gridOptions.verticalCompact"
        :use-css-transforms="true"
        @layout-updated="layoutUpdatedEvent"
      >
        <GridItem
          v-for="item in dashboardStore.layout"
          :key="item.i"
          :x="item.x"
          :y="item.y"
          :w="item.w"
          :h="item.h"
          :i="item.i"
          :static="!isEditMode"
          @resize="resizeEvent"
          @move="moveEvent"
          @resized="resizedEvent"
          @moved="movedEvent"
        >
          <div class="widget-wrapper">
            <component :is="renderWidget(getWidget(item.i))" />
            <div v-if="isEditMode && getWidget(item.i)?.type !== 'gridContainer'" class="widget-actions">
              <q-btn
                flat
                dense
                round
                size="sm"
                icon="edit"
                @click.stop="openEditWidget(item.i)"
              />
              <q-btn
                flat
                dense
                round
                size="sm"
                icon="close"
                @click.stop="removeWidget(item.i)"
              />
            </div>
          </div>
        </GridItem>
      </GridLayout>
    </div>

    <!-- Edit Widget Dialog -->
    <EditWidgetDialog
      v-model="showEditWidget"
      :widget="editingWidget"
      @update:widget="updateWidget"
    />

    <!-- Add Widget Dialog -->
    <AddWidgetDialog
      v-model="showAddWidget"
      parent-type="root"
    />
  </q-page>
</template>
<script setup>
import { onMounted, onUnmounted, computed, h, ref, watch } from 'vue'
import { GridLayout, GridItem } from 'vue-grid-layout-v3'
import { useQuasar } from 'quasar'
import { useDashboardStore } from 'stores/dashboard'
import { useUIStore } from 'stores/ui'
import { dataRefreshService } from 'src/services/dataRefreshService'
import NumberWidget from 'components/widgets/NumberWidget.vue'
import ChartWidget from 'components/widgets/ChartWidget.vue'
import GaugeWidget from 'components/widgets/GaugeWidget.vue'
import NumberChartWidget from 'components/widgets/NumberChartWidget.vue'
import GridContainerWidget from 'components/widgets/GridContainerWidget.vue'
import EditWidgetDialog from 'components/widgets/EditWidgetDialog.vue'
import AddWidgetDialog from 'components/widgets/AddWidgetDialog.vue'

const $q = useQuasar()
const dashboardStore = useDashboardStore()
const uiStore = useUIStore()

// Create a computed that tracks only widget structure (not data changes)
// This prevents restart loop when slot.data is updated
const widgetStructure = computed(() => {
  return dashboardStore.widgets.map(w => ({
    id: w.id,
    type: w.type,
    refreshInterval: w.refreshInterval,
    options: w.options,
    slots: w.slots?.map(s => ({
      id: s.id,
      hostId: s.hostId,
      deviceId: s.deviceId,
      sensor: s.sensor
    })) || [],
    // Include children structure for gridContainer widgets
    children: w.children?.map(c => ({
      id: c.id,
      type: c.type,
      refreshInterval: c.refreshInterval,
      options: c.options,
      slots: c.slots?.map(s => ({
        id: s.id,
        hostId: s.hostId,
        deviceId: s.deviceId,
        sensor: s.sensor
      })) || []
    })) || []
  }))
})

// Watch for widget structural changes and restart data refresh
watch(
  widgetStructure,
  (widgets) => {
    if (dataRefreshService.getIsRunning()) {
      dataRefreshService.restart(widgets)
    } else if (widgets.length > 0) {
      dataRefreshService.start(widgets)
    }
  },
  { deep: true, immediate: true }
)

// Clean up on unmount
onUnmounted(() => {
  dataRefreshService.stopAll()
})

const isDark = computed(() => $q.dark.mode === true || $q.dark.mode === 'true')
const isEditMode = computed(() => uiStore.isEditMode)
const gridOptions = computed(() => dashboardStore.gridOptions)

const showEditWidget = ref(false)
const editingWidget = ref(null)
const showAddWidget = ref(false)
const showDashboardSettings = ref(false)

onMounted(() => {
  dashboardStore.loadDashboard()
  dataRefreshService.init(dashboardStore)
})

function layoutUpdatedEvent(newLayout) {
  // Check for duplicate IDs before updating
  const seenIds = new Set()
  const hasDuplicates = newLayout.some(item => {
    if (seenIds.has(item.i)) {
      return true
    }
    seenIds.add(item.i)
    return false
  })

  if (!hasDuplicates) {
    dashboardStore.updateLayout(newLayout)
  }
}

// Grid layout event handlers (can be empty for now)
function moveEvent() {}
function resizeEvent() {}
function movedEvent() {}
function resizedEvent() {}

function getWidget(id) {
  return dashboardStore.widgets.find(w => w.id === id)
}

function renderWidget(widget) {
  if (!widget) return null

  const commonProps = {
    title: widget.title,
    showHeader: !!widget.title,
    options: widget.options,
    slots: widget.slots,
    widgetId: widget.id,
    loading: false,
    error: null
  }

  if (widget.type === 'number') {
    return h(NumberWidget, {
      ...commonProps
    })
  }

  if (widget.type === 'chart') {
    return h(ChartWidget, {
      ...commonProps
    })
  }

  if (widget.type === 'gauge') {
    return h(GaugeWidget, {
      ...commonProps
    })
  }

  if (widget.type === 'numberChart') {
    return h(NumberChartWidget, {
      ...commonProps
    })
  }

  if (widget.type === 'gridContainer') {
    return h(GridContainerWidget, {
      title: widget.title,
      containerId: widget.id,
      children: widget.children || [],
      childLayout: widget.childLayout || [],
      childLayoutColNum: widget.options?.colNum || 12,
      isEditing: isEditMode.value,
      showHeader: !!widget.title,
      'onUpdate:layout': (newLayout) => {
        // Update widget in store with new childLayout
        updateContainerWidget(widget.id, { childLayout: newLayout })
      },
      'onUpdate:children': (newChildren) => {
        // Update widget in store with new children
        updateContainerWidget(widget.id, { children: newChildren })
      },
      'onEdit-container': (containerId) => {
        openEditWidget(containerId)
      },
      'onRemove-container': (containerId) => {
        removeWidget(containerId)
      }
    })
  }

  return null
}

function removeWidget(widgetId) {
  dashboardStore.removeWidget(widgetId)
}

function openEditWidget(widgetId) {
  const widget = getWidget(widgetId)
  if (widget) {
    editingWidget.value = { ...widget }
    showEditWidget.value = true
  }
}

function updateWidget(updatedWidget) {
  dashboardStore.updateWidget(updatedWidget.id, updatedWidget)
  dashboardStore.saveDashboard()
}

function updateContainerWidget(containerId, updates) {
  dashboardStore.updateWidget(containerId, updates)
  dashboardStore.saveDashboard()
}

function toggleEditMode() {
  uiStore.toggleEditMode()
}

// Confirm before canceling edit mode (discard changes)
function confirmCancelEditMode() {
  $q.dialog({
    title: 'Discard Changes?',
    message: 'You have unsaved changes. Are you sure you want to discard them and reload the last saved dashboard?',
    cancel: {
      label: 'Keep Editing',
      color: 'primary',
      flat: true
    },
    ok: {
      label: 'Discard',
      color: 'negative',
      flat: true
    },
    persistent: true
  }).onOk(async () => {
    // User confirmed - cancel edit mode and reload from server
    await uiStore.cancelEditMode()
  })
}

function handleAddWidget() {
  showAddWidget.value = true
}

function handleDashboardSettings() {
  showDashboardSettings.value = true
}
</script>

<style scoped>
.dashboard-grid {
  background: var(--q-card-background);
  border-radius: 8px;
  padding: 16px;
  min-height: 400px;
  position: relative;
}

/* Floating Menu Container */
.floating-menu-container {
  position: fixed;
  top: 5px;
  right: 5px;
  z-index: 1000;
}

.floating-menu-btn {
  background: rgba(41, 41, 41, 0.5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  color: #434343 !important;
}

.floating-menu-btn:hover {
  background: rgba(128, 128, 128, 0.7);
}

/* Edit Mode Menu */
.edit-mode-menu {
  display: flex;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px;
  border-radius: 50px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.edit-mode-menu .q-btn {
  background: rgba(255, 255, 255, 0.2);
}

.edit-mode-menu .q-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Light theme support - keep dark background */
:deep(.vue-grid-layout-light .floating-menu-btn) {
  background: rgba(0, 0, 0, 0.3);
}

:deep(.vue-grid-layout-light .floating-menu-btn:hover) {
  background: rgba(0, 0, 0, 0.4);
}

:deep(.vue-grid-layout-light .edit-mode-menu) {
  background: rgba(0, 0, 0, 0.3);
}

:deep(.vue-grid-layout-light .edit-mode-menu .q-btn) {
  background: rgba(255, 255, 255, 0.2);
}

:deep(.vue-grid-layout-light .edit-mode-menu .q-btn:hover) {
  background: rgba(255, 255, 255, 0.3);
}

.vue-grid-layout {
  background: transparent;
}

/* Dark theme */
.vue-grid-item:not(.vue-grid-placeholder) {
  background: #424242;
  border: 1px solid #616161;
  border-radius: 4px;
}

.vue-grid-item.static {
  background: #545454;
}

/* Light theme */
.vue-grid-layout-light .vue-grid-item:not(.vue-grid-placeholder) {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.vue-grid-layout-light .vue-grid-item.static {
  background: #f5f5f5;
}

.vue-grid-item .vue-resizable-handle {
  z-index: 10;
}

/* Отключаем выделение текста при ресайзе */
.vue-grid-item * {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.widget-wrapper {
  height: 100%;
  position: relative;
}

.widget-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 100;
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 50px;
  padding: 4px;
}

.widget-actions .q-btn {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.widget-actions .q-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
