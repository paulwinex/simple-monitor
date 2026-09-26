
<template>
  <q-page>
    <!-- Floating Edit Mode Menu -->
    <EditModeButton />

    <div v-if="dashboardStore.isLoading" class="row justify-center q-mt-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="dashboardStore.hasError" class="row justify-center q-mt-xl">
      <q-banner class="bg-negative text-white">
        {{ dashboardStore.error }}
      </q-banner>
    </div>

    <div v-else :class="'dashboard-grid'" :style="gridStyle">
      <GridLayout
        v-model:layout="dashboardStore.layout"
        :col-num="gridOptions.colNum"
        :row-height="gridOptions.rowHeight"
        :is-draggable="isEditMode"
        :is-resizable="isEditMode"
        :vertical-compact="gridOptions.verticalCompact"
        :margin="gridMargin"
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
                icon="content_copy"
                @click.stop="duplicateWidget(item.i)"
                title="Duplicate Widget"
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
  </q-page>
</template>
<script setup>
import { onMounted, onUnmounted, computed, h, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { GridLayout, GridItem } from 'vue-grid-layout-v3'
import { useQuasar } from 'quasar'
import { useDashboardStore } from 'stores/dashboard'
import { useUIStore } from 'stores/ui'
import { dataRefreshService } from 'src/services/dataRefreshService'
import { useThemeStore } from 'stores/theme'
import { hexToRgba } from 'src/utils/themes'
import { gridWidgetGap } from 'src/utils/grid'
import NumberWidget from 'components/widgets/NumberWidget.vue'
import ChartWidget from 'components/widgets/ChartWidget.vue'
import GaugeWidget from 'components/widgets/GaugeWidget.vue'
import NumberChartWidget from 'components/widgets/NumberChartWidget.vue'
import MultiChartWidget from 'components/widgets/MultiChartWidget.vue'
import GridContainerWidget from 'components/widgets/GridContainerWidget.vue'
import EditModeButton from 'components/common/EditModeButton.vue'
import { useWidgetWindowsStore } from 'stores/widgetWindows'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const dashboardStore = useDashboardStore()
const uiStore = useUIStore()
const widgetWindows = useWidgetWindowsStore()
const themeStore = useThemeStore()

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

const isEditMode = computed(() => uiStore.isEditMode)
const gridOptions = computed(() => dashboardStore.gridOptions)
const gridMargin = computed(() => {
  const m = gridOptions.value.margin || { x: 10, y: 10 }
  return [m.x, 0]
})
// Vertical gap is painted inside the grid item (see .widget-wrapper) instead of being
// handed to the grid, which would otherwise add it to every row of every widget.
const widgetGap = computed(() => gridWidgetGap(gridMargin.value[0], gridOptions.value.rowHeight))
const gridStyle = computed(() => {
  const p = gridOptions.value.padding || { top: 16, right: 16, bottom: 16, left: 16 }
  const widget = themeStore.currentTheme.widget
  const bgAlpha = (gridOptions.value.widgetBackgroundOpacity ?? 100) / 100
  const headerAlpha = (gridOptions.value.widgetHeaderOpacity ?? 100) / 100
  const borderAlpha = (gridOptions.value.widgetBorderOpacity ?? 100) / 100
  return {
    // The top gap of the root layout is always applied, so it is not part of the
    // edge padding settings below.
    padding: `${p.top + widgetGap.value}px ${p.right}px ${p.bottom}px ${p.left}px`,
    '--widget-gap': `${widgetGap.value}px`,
    '--widget-bg': hexToRgba(widget.background, bgAlpha),
    '--widget-header-bg': hexToRgba(widget.headerBackground, headerAlpha),
    '--widget-border': hexToRgba(widget.border, borderAlpha),
    '--widget-header-border': hexToRgba(widget.headerBorder, borderAlpha),
    '--widget-title-color': widget.titleColor,
    '--widget-content-color': widget.contentColor
  }
})

function getDashboardIdFromQuery() {
  const value = route.query.dashboard
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }
  return null
}

// Keep the URL in sync with the currently open dashboard: edit the address
// in place (no navigation, no history entry) so F5 and shared links reopen
// the same dashboard.
watch(
  () => dashboardStore.currentDashboardId,
  (id) => {
    if (id == null) return
    router.replace({ query: { ...route.query, dashboard: String(id) } })
  }
)

// Load a dashboard when the URL id changes externally (direct link, F5
// reload, manual edit of the address bar). Skip when it already matches the
// open dashboard to avoid reload loops.
watch(
  () => route.query.dashboard,
  (value) => {
    const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : null
    if (id == null || id === dashboardStore.currentDashboardId) return
    dashboardStore.loadDashboard(id)
  }
)

onMounted(() => {
  dashboardStore.loadDashboard(getDashboardIdFromQuery())
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

  if (widget.type === 'multiChart') {
    return h(MultiChartWidget, {
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

function duplicateWidget(widgetId) {
  const widget = getWidget(widgetId)
  if (widget) {
    // Create a deep copy of the widget with a new unique ID
    const newWidget = JSON.parse(JSON.stringify(widget))
    newWidget.id = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`

    // Add the new widget to the store (null parentId = add to main dashboard)
    dashboardStore.addWidget(newWidget, null)
  }
}

function openEditWidget(widgetId) {
  widgetWindows.openEdit(widgetId)
}

function updateContainerWidget(containerId, updates) {
  dashboardStore.updateWidget(containerId, updates)
}
</script>

<style scoped>
.dashboard-grid {
  background: var(--q-card-background);
  border-radius: 8px;
  min-height: 400px;
  position: relative;
}

.vue-grid-layout {
  background: transparent;
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
  box-sizing: border-box;
  /* Widget gap lives here, not in the grid margin, so it cannot inflate row height. */
  padding-bottom: var(--widget-gap, 0px);
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
