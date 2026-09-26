<template>
  <div ref="containerRef" class="grid-container-outer">
    <div v-if="showHeader && title" class="grid-container-header">
      <span class="widget-title">{{ title }}</span>
    </div>
    <div
      class="grid-container-widget"
      :style="{ '--widget-gap': `${internalGap}px`, '--widget-edge-inset': `${edgeInset}px` }"
    >
      <div v-if="isEditing" class="container-actions">
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="add"
          @click="widgetWindows.openCreate('gridContainer', props.containerId)"
        />
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="edit"
          @click="editContainer"
        />
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="close"
          @click="removeContainer"
        />
      </div>

      <GridLayout
          v-model:layout="internalLayout"
          :col-num="internalGridColNum"
          :row-height="internalRowHeight"
          :margin="internalMargin"
          :is-draggable="isEditing"
          :is-resizable="isEditing"
          :vertical-compact="true"
          :use-css-transforms="true"
          :prevent-collision="true"
          :auto-size="false"
          class="internal-grid"
          :style="internalGridStyle"
          @layout-updated="onLayoutUpdated"
        >
          <GridItem
            v-for="item in internalLayout"
            :key="item.i"
            :x="item.x"
            :y="item.y"
            :w="item.w"
            :h="item.h"
            :i="item.i"
          >
            <div class="widget-content-wrapper" :style="contentWrapperStyle(item)">
              <div class="widget-inner-content">
                <component :is="renderWidget(getWidget(item.i))" />
              </div>
              <div
                v-if="isEditing"
                class="widget-actions"
                :class="{ 'widget-actions-centered': isWidgetInTopRightCorner(item.i) }"
              >
                <q-btn
                  flat
                  dense
                  round
                  size="xs"
                  icon="edit"
                  @click.stop="editWidget(item.i)"
                  title="Edit"
                />
                <q-btn
                  flat
                  dense
                  round
                  size="xs"
                  icon="content_copy"
                  @click.stop="duplicateWidget(item.i)"
                  title="Duplicate Widget"
                />
                <q-btn
                  flat
                  dense
                  round
                  size="xs"
                  icon="close"
                  @click.stop="removeWidget(item.i)"
                  title="Remove"
                />
              </div>
            </div>
          </GridItem>
        </GridLayout>

        <div v-if="internalLayout.length === 0" class="empty-state">
          <div class="text-center text-caption">
            Click + to add widgets
          </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, h, watch, computed } from 'vue'
import { GridLayout, GridItem } from 'vue-grid-layout-v3'
import { useDashboardStore } from 'stores/dashboard'
import { useWidgetWindowsStore } from 'stores/widgetWindows'
import NumberWidget from './NumberWidget.vue'
import ChartWidget from './ChartWidget.vue'
import GaugeWidget from './GaugeWidget.vue'
import NumberChartWidget from './NumberChartWidget.vue'
import MultiChartWidget from './MultiChartWidget.vue'
import { gridWidgetGap } from 'src/utils/grid'

// Fallback when neither the container nor the dashboard has a row height set.
const DEFAULT_INTERNAL_ROW_HEIGHT = 25

const props = defineProps({
  title: String,
  showHeader: Boolean,
  containerId: String,
  children: Array,
  childLayout: Array,
  childLayoutColNum: Number,  // Number of columns in the internal grid (default: 12)
  isEditing: Boolean
})

const dashboardStore = useDashboardStore()
const widgetWindows = useWidgetWindowsStore()

const emit = defineEmits([
  'update:layout',
  'update:children',
  'remove-container'
])

const layoutChanged = ref(false)
const containerRef = ref(null)

// Computed properties for internal widgets and layout - directly reference store for reactivity
const internalWidgets = computed(() => {
  if (!props.containerId) return []
  const widget = dashboardStore.getWidget(props.containerId)
  // console.log('[GridContainer] internalWidgets computed:', widget?.children?.length || 0, 'children')
  return widget?.children || []
})

const internalLayout = computed(() => {
  if (!props.containerId) return []
  const widget = dashboardStore.getWidget(props.containerId)
  // console.log('[GridContainer] internalLayout computed:', widget?.childLayout?.length || 0, 'items')
  return widget?.childLayout || []
})

// Get parent widget from store to access grid width
const parentWidget = computed(() => {
  if (!props.containerId) return null
  return dashboardStore.getWidget(props.containerId)
})

// Get the number of columns for the internal grid (from parent widget options or default to 12)
const internalGridColNum = computed(() => {
  if (!props.containerId) return 12
  const widget = parentWidget.value
  return widget?.options?.colNum || 12
})

// Internal widgets follow the dashboard widget gap and the container row height,
// which is either the container's own override or the dashboard-wide value. The grid
// gets a zero vertical margin and the plain row height, so an item box stays exactly
// `h * rowHeight` tall; the gap is painted inside the item (see
// .widget-content-wrapper) instead of being added to every row.
const internalRowHeight = computed(() => {
  const options = parentWidget.value?.options
  if (options?.rowHeightEnabled && Number.isFinite(options.rowHeight)) {
    return options.rowHeight
  }
  return dashboardStore.gridOptions?.containerRowHeight ?? DEFAULT_INTERNAL_ROW_HEIGHT
})
const dashboardGap = computed(() => dashboardStore.gridOptions?.margin?.x ?? 10)
const internalGap = computed(() => gridWidgetGap(dashboardGap.value, internalRowHeight.value))
const internalMargin = computed(() => [dashboardGap.value, 0])

// Edge inset keeps the nested widgets `gap` away from the container borders. It is on
// dashboard-wide and can be overridden per container; when it is off, the gap only
// appears between widgets and they sit flush with the borders.
const gapOnBorders = computed(() => {
  const options = parentWidget.value?.options
  const dashboardValue = dashboardStore.gridOptions?.containerGapOnBorders !== false
  if (options?.gapOnBordersEnabled && typeof options.gapOnBorders === 'boolean') {
    return options.gapOnBorders
  }
  return dashboardValue
})
const edgeInset = computed(() => (gapOnBorders.value ? internalGap.value : 0))

// The grid also applies the horizontal margin at the outer edges, so with the inset
// off the grid is pulled out by that margin to keep the widgets flush with the borders.
const internalGridStyle = computed(() => {
  const correction = dashboardGap.value - edgeInset.value
  return { marginLeft: `${-correction}px`, marginRight: `${-correction}px` }
})

const lastRowBottom = computed(() =>
  internalLayout.value.reduce((max, item) => Math.max(max, item.y + item.h), 0)
)

function contentWrapperStyle(item) {
  // Without the edge inset there is no gap below the last row of widgets either.
  if (!gapOnBorders.value && item.y + item.h >= lastRowBottom.value) {
    return { paddingBottom: '0px' }
  }
  return null
}

// Check if widget overlaps with parent container's action buttons
// Parent buttons are in top-right corner, so check if widget is near that area
// Uses PIXEL-based calculation: if widget's right edge is within 80px of
// the container's right edge, shift the widget action buttons down
function isWidgetInTopRightCorner(widgetId) {
  const layoutItem = internalLayout.value.find(item => item.i === widgetId)

  if (!layoutItem || !containerRef.value) return false

  // Get container width in pixels
  const containerWidth = containerRef.value.offsetWidth

  // Get the number of columns for this container
  const colNum = internalGridColNum.value

  // Widget's RIGHT edge position in grid units
  const widgetRightEdge = layoutItem.x + layoutItem.w

  // Calculate distance from widget's right edge to container's right edge in grid units
  const distanceInGridUnits = colNum - widgetRightEdge

  // Convert grid units to pixels: (distanceInGridUnits / colNum) * containerWidth
  const distanceInPixels = (distanceInGridUnits / colNum) * containerWidth

  // Threshold in pixels (80px from right edge)
  const PIXEL_THRESHOLD = 80

  // Widget must be at the top (y === 0)
  const isAtTop = layoutItem.y === 0

  // Widget's right edge must be within threshold distance from container's right edge
  const isNearRightEdge = distanceInPixels <= PIXEL_THRESHOLD && distanceInPixels >= 0

  return isAtTop && isNearRightEdge
}

// Watch for exit from edit mode - save layout changes only when editing stops
watch(() => props.isEditing, (newEditing, oldEditing) => {
  // Save only when exiting edit mode (transition from true to false)
  if (oldEditing && !newEditing && layoutChanged.value && props.containerId) {
    // Save both layout and children with position/size info
    const widget = dashboardStore.getWidget(props.containerId)
    if (widget && widget.children) {
      const widgets = widget.children.map(w => {
        const layoutItem = internalLayout.value.find(l => l.i === w.id)
        if (layoutItem) {
          return {
            ...w,
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
          }
        }
        return w
      })

      dashboardStore.updateWidget(props.containerId, {
        childLayout: internalLayout.value,
        children: widgets
      })
      dashboardStore.saveDashboard()
      layoutChanged.value = false
    }
  }
})

function getWidget(id) {
  const widget = dashboardStore.getWidget(props.containerId)
  if (!widget || !widget.children) return null
  return widget.children.find(w => w.id === id)
}

function renderWidget(widget) {
  if (!widget) return null

  // For nested widgets, pass slots directly with reactive data
  // The child widgets will use the slots prop directly
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
    return h(NumberWidget, commonProps)
  }

  if (widget.type === 'chart') {
    return h(ChartWidget, commonProps)
  }

  if (widget.type === 'gauge') {
    return h(GaugeWidget, commonProps)
  }

  if (widget.type === 'numberChart') {
    return h(NumberChartWidget, commonProps)
  }

  if (widget.type === 'multiChart') {
    return h(MultiChartWidget, commonProps)
  }

  return null
}

function editWidget(widgetId) {
  widgetWindows.openEdit(widgetId, props.containerId)
}

function onLayoutUpdated(newLayout) {
  // Update store directly with new layout
  if (props.containerId) {
    dashboardStore.updateWidget(props.containerId, { childLayout: newLayout })
  }
  layoutChanged.value = true
}

function removeWidget(widgetId) {
  const widget = dashboardStore.getWidget(props.containerId)
  if (!widget || !widget.children) return

  const newChildren = widget.children.filter(w => w.id !== widgetId)
  const newLayout = (widget.childLayout || []).filter(l => l.i !== widgetId)

  // Update in store
  dashboardStore.updateWidget(props.containerId, {
    children: newChildren,
    childLayout: newLayout
  })
  layoutChanged.value = true
}

function duplicateWidget(widgetId) {
  const widget = getWidget(widgetId)
  if (widget) {
    // Create a deep copy of the widget with a new unique ID
    const newWidget = JSON.parse(JSON.stringify(widget))
    newWidget.id = `${props.containerId}-copy-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`

    // Get parent container widget
    const parentWidget = dashboardStore.getWidget(props.containerId)
    if (!parentWidget) return

    // Get the original widget's layout item to preserve size
    const originalLayoutItem = internalLayout.value.find(l => l.i === widgetId)
    const itemW = originalLayoutItem?.w || 6
    const itemH = originalLayoutItem?.h || 6

    // Create new children array with the duplicated widget
    const newChildren = [...(parentWidget.children || []), newWidget]

    // Auto-place widget in next available slot
    const containerWidth = internalGridColNum.value

    let x = 0
    let y = 0
    let placed = false

    // Try to find a non-overlapping position
    for (let row = 0; row < 100 && !placed; row++) {
      for (let col = 0; col < containerWidth && !placed; col += 1) {
        x = col
        y = row

        const overlaps = (parentWidget.childLayout || []).some(item =>
          x < item.x + item.w &&
          x + itemW > item.x &&
          y < item.y + item.h &&
          y + itemH > item.y
        )

        if (!overlaps) {
          placed = true
        }
      }
    }

    // If no position found, place at the end
    if (!placed) {
      const maxRow = Math.max(...(parentWidget.childLayout || []).map(item => item.y + item.h), 0)
      y = maxRow
      x = 0
    }

    // Create new layout item
    const newLayoutItem = {
      i: newWidget.id,
      x,
      y,
      w: itemW,
      h: itemH
    }
    const newLayout = [...(parentWidget.childLayout || []), newLayoutItem]

    // Update in store
    dashboardStore.updateWidget(props.containerId, {
      children: newChildren,
      childLayout: newLayout
    })
    layoutChanged.value = true
  }
}

function editContainer() {
  widgetWindows.openEdit(props.containerId)
}

function removeContainer() {
  // Emit event to parent to remove this container
  emit('remove-container', props.containerId)
}

// Expose methods
defineExpose({
  getLayout: () => internalLayout.value,
  getWidgets: () => internalWidgets.value
})
</script>

<style scoped>
.grid-container-outer {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: var(--sm-widget-radius, 4px);
  overflow: hidden;
  background: var(--sm-widget-bg, #ffffff);
  border: var(--sm-widget-border-width, 1px) var(--sm-widget-border-style, solid)
    var(--sm-widget-border-color, #e0e0e0);
  box-shadow: var(--sm-widget-shadow, 0 1px 3px 0 rgba(0, 0, 0, 0.12));
  color: var(--sm-app-text, #333333);
  font-family: var(--sm-font-family, Roboto, 'Segoe UI', sans-serif);
  font-size: var(--sm-font-size, 13px);
  font-weight: var(--sm-font-weight, 400);
}

.grid-container-header {
  display: flex;
  justify-content: var(--sm-header-align, left);
  align-items: center;
  height: var(--sm-header-height, auto);
  padding: var(--sm-header-padding-y, 8px) var(--sm-header-padding-x, 12px);
  flex-shrink: 0;
  background: var(--sm-header-bg, #f5f5f5);
  border-bottom: var(--sm-widget-border-width, 1px) var(--sm-widget-border-style, solid)
    var(--sm-widget-border-color, #e0e0e0);
}

.widget-title {
  font-family: var(--sm-header-font-family, Roboto, 'Segoe UI', sans-serif);
  font-weight: var(--sm-header-font-weight, 600);
  font-size: var(--sm-header-font-size, 14px);
  letter-spacing: var(--sm-header-letter-spacing, 0);
  color: var(--sm-header-color, #424242);
  text-shadow: var(--sm-text-shadow, 0 1px 2px 0 rgba(0, 0, 0, 0.15));
}

.grid-container-widget {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
  /* Pushes the whole internal grid down so widgets keep the gap from the top border. */
  padding-top: var(--widget-edge-inset, 0px);
}

.container-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 100;
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 50px;
  padding: 4px;
}

.container-actions .q-btn {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.container-actions .q-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.internal-grid {
  height: 100%;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.5;
}

.widget-content-wrapper {
  height: 100%;
  box-sizing: border-box;
  /* Widget gap lives here, not in the grid margin, so it cannot inflate row height. */
  padding-bottom: var(--widget-gap, 0px);
  position: relative;
  display: flex;
  flex-direction: column;
}

.widget-inner-content {
  flex: 1;
  position: relative;
  min-height: 0;
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
  transition: all 0.2s ease;
}

.widget-actions-centered {
  top: 40px;
}

.widget-actions .q-btn {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.widget-actions .q-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

:deep(.vue-grid-item .vue-resizable-handle) {
  z-index: 10;
}

/* Отключаем выделение текста при ресайзе */
:deep(.vue-grid-item *) {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
</style>
