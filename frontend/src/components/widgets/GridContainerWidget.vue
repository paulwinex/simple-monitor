<template>
  <div ref="containerRef" class="grid-container-outer" :class="{ 'dark-theme': isDark }">
    <div v-if="showHeader && title" class="grid-container-header" :class="{ 'dark-theme': isDark }">
      <span class="widget-title">{{ title }}</span>
    </div>
    <div class="grid-container-widget">
      <div v-if="isEditing" class="container-actions">
        <q-btn
          flat
          dense
          round
          size="sm"
          icon="add"
          @click="showAddWidget = true"
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
          :row-height="25"
          :is-draggable="isEditing"
          :is-resizable="isEditing"
          :vertical-compact="true"
          :use-css-transforms="true"
          :prevent-collision="true"
          class="internal-grid"
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
            <div class="widget-content-wrapper">
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
            Drop widgets here or click +
          </div>
        </div>
    </div>
  </div>

  <!-- Add Widget Dialog -->
  <add-widget-dialog
    v-model="showAddWidget"
    parent-type="gridContainer"
    :parent-id="containerId"
    @update:model-value="onDialogUpdate"
  />

  <!-- Edit Widget Dialog -->
  <edit-widget-dialog
    v-model="showEditWidget"
    :widget="editingWidget"
    @update:widget="updateInternalWidget"
  />
</template>

<script setup>
import { ref, h, watch, computed } from 'vue'
import { useQuasar } from 'quasar'
import { GridLayout, GridItem } from 'vue-grid-layout-v3'
import { useDashboardStore } from 'stores/dashboard'
import NumberWidget from './NumberWidget.vue'
import ChartWidget from './ChartWidget.vue'
import GaugeWidget from './GaugeWidget.vue'
import NumberChartWidget from './NumberChartWidget.vue'
import MultiChartWidget from './MultiChartWidget.vue'
import AddWidgetDialog from './AddWidgetDialog.vue'
import EditWidgetDialog from './EditWidgetDialog.vue'

const props = defineProps({
  title: String,
  showHeader: Boolean,
  containerId: String,
  children: Array,
  childLayout: Array,
  childLayoutColNum: Number,  // Number of columns in the internal grid (default: 12)
  isEditing: Boolean
})

const $q = useQuasar()
const dashboardStore = useDashboardStore()
const isDark = computed(() => $q.dark.mode === true || $q.dark.mode === 'true')

const emit = defineEmits([
  'update:layout',
  'update:children',
  'edit-container',
  'remove-container'
])

const showAddWidget = ref(false)
const showEditWidget = ref(false)
const editingWidget = ref(null)
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

function onDialogUpdate(value) {
  // No need to emit - data is already in store via dashboardStore.addWidget
  // Just close the dialog
}

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
  const widget = getWidget(widgetId)
  if (widget) {
    editingWidget.value = { ...widget }
    showEditWidget.value = true
  }
}

function updateInternalWidget(updatedWidget) {
  const widget = dashboardStore.getWidget(props.containerId)
  if (!widget || !widget.children) return

  const index = widget.children.findIndex(w => w.id === updatedWidget.id)
  if (index !== -1) {
    // Preserve position and size from current layout
    const layoutItem = internalLayout.value.find(l => l.i === updatedWidget.id)
    if (layoutItem) {
      updatedWidget.x = layoutItem.x
      updatedWidget.y = layoutItem.y
      updatedWidget.w = layoutItem.w
      updatedWidget.h = layoutItem.h
    }

    // Create new children array with updated widget
    const newChildren = widget.children.map((c, i) => i === index ? updatedWidget : c)

    // Update in store - this will trigger reactivity
    dashboardStore.updateWidget(props.containerId, { children: newChildren })
    layoutChanged.value = true
  }
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
    newWidget.title = `${widget.title} (Copy)`
    
    // Get parent container widget
    const parentWidget = dashboardStore.getWidget(props.containerId)
    if (!parentWidget) return
    
    // Create new children array with the duplicated widget
    const newChildren = [...(parentWidget.children || []), newWidget]
    
    // Auto-place widget in next available slot
    const containerWidth = internalGridColNum.value
    const itemW = 6
    const itemH = 6
    
    let x = 0
    let y = 0
    let placed = false
    
    // Try to find a non-overlapping position
    for (let row = 0; row < 100 && !placed; row++) {
      for (let col = 0; col < containerWidth && !placed; col += itemW) {
        x = col
        y = row * itemH
        
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
      const maxRow = Math.max(...(parentWidget.childLayout || []).map(item => Math.floor(item.y / itemH)), -1)
      y = (maxRow + 1) * itemH
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
  // Emit event to parent to open edit dialog for this container
  emit('edit-container', props.containerId)
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
  border-radius: 4px;
  overflow: hidden;
}

/* Dark theme */
.grid-container-outer.dark-theme {
  background: #424242;
  border: 1px solid #616161;
}

.grid-container-outer.dark-theme .grid-container-header {
  background: #545454;
  border-bottom: 1px solid #616161;
}

.grid-container-outer.dark-theme .widget-title {
  color: #e0e0e0;
}

/* Light theme */
.grid-container-outer:not(.dark-theme) {
  background: #ffffff;
  border: 1px solid #e0e0e0;
}

.grid-container-outer:not(.dark-theme) .grid-container-header {
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.grid-container-outer:not(.dark-theme) .widget-title {
  color: #424242;
}

.grid-container-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  flex-shrink: 0;
}

.widget-title {
  font-weight: 600;
  font-size: 14px;
}

.grid-container-widget {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
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

/* Dark theme for internal grid items */
:deep(.vue-grid-item:not(.vue-grid-placeholder)) {
  background: #424242;
  border: 1px solid #616161;
}

:deep(.vue-grid-layout-light .vue-grid-item:not(.vue-grid-placeholder)) {
  background: #ffffff;
  border: 1px solid #e0e0e0;
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
