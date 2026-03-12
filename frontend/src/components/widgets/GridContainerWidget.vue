<template>
  <div class="grid-container-outer" :class="{ 'dark-theme': isDark }">
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
          :col-num="12"
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
import AddWidgetDialog from './AddWidgetDialog.vue'
import EditWidgetDialog from './EditWidgetDialog.vue'

const props = defineProps({
  title: String,
  showHeader: Boolean,
  containerId: String,
  children: Array,
  childLayout: Array,
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

const internalLayout = ref([])
const internalWidgets = ref([])
const showAddWidget = ref(false)
const showEditWidget = ref(false)
const editingWidget = ref(null)

// Get parent widget from store to access grid width
const parentWidget = computed(() => {
  if (!props.containerId) return null
  return dashboardStore.getWidget(props.containerId)
})

// Get the grid container layout item from parent to determine grid boundaries
const gridContainerLayout = computed(() => {
  if (!props.containerId) return null
  const layout = dashboardStore.layout
  return layout.find(item => item.i === props.containerId)
})

// Check if widget overlaps with parent container's action buttons
// Parent buttons are in top-right corner, so check if widget is near that area
function isWidgetInTopRightCorner(widgetId) {
  const layoutItem = internalLayout.value.find(item => item.i === widgetId)
  const containerLayout = gridContainerLayout.value

  if (!layoutItem || !containerLayout) return false

  // Parent container buttons are in top-right corner
  // Check if widget's top-right area overlaps with where parent buttons would be

  // Widget must be at the top (y === 0)
  const isAtTop = layoutItem.y === 0

  // Widget's right edge must align with container's right edge (within 1 unit)
  // This means widget is at the very right edge
  const containerRightEdge = containerLayout.x + containerLayout.w
  const widgetRightEdge = layoutItem.x + layoutItem.w
  const isAtRightEdge = (containerRightEdge - widgetRightEdge) < 1

  return isAtTop && isAtRightEdge
}

// Watch for changes in parent widget from store - this is the primary source
watch(() => parentWidget.value, (newParent) => {
  console.log('[GridContainerWidget] parentWidget changed:', newParent ? 'yes' : 'no')
  if (newParent) {
    if (newParent.children && newParent.children.length > 0) {
      internalWidgets.value = JSON.parse(JSON.stringify(newParent.children))
      console.log('[GridContainerWidget] Updated internalWidgets:', internalWidgets.value.length)
    } else {
      internalWidgets.value = []
      console.log('[GridContainerWidget] Cleared internalWidgets')
    }
    if (newParent.childLayout && newParent.childLayout.length > 0) {
      internalLayout.value = JSON.parse(JSON.stringify(newParent.childLayout))
      console.log('[GridContainerWidget] Updated internalLayout:', internalLayout.value.length)
    } else {
      internalLayout.value = []
      console.log('[GridContainerWidget] Cleared internalLayout')
    }
  }
}, { immediate: true, deep: true })

function onDialogUpdate(value) {
  console.log('[GridContainerWidget] Dialog updated, value:', value)
  // No need to emit - data is already in store via dashboardStore.addWidget
  // Just close the dialog
}

function getWidget(id) {
  return internalWidgets.value.find(w => w.id === id)
}

function renderWidget(widget) {
  if (!widget) return null

  const commonProps = {
    title: widget.title,
    showHeader: !!widget.title,
    options: widget.options,
    loading: false,
    error: null
  }

  if (widget.type === 'number') {
    return h(NumberWidget, {
      ...commonProps,
      value: widget.data?.value ?? 0
    })
  }

  if (widget.type === 'chart') {
    return h(ChartWidget, {
      ...commonProps,
      data: widget.data?.data ?? []
    })
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
  const index = internalWidgets.value.findIndex(w => w.id === updatedWidget.id)
  if (index !== -1) {
    internalWidgets.value[index] = updatedWidget
    // Update in store
    if (props.containerId) {
      dashboardStore.updateWidget(props.containerId, { children: internalWidgets.value })
      dashboardStore.saveDashboard()
    }
  }
}

function onLayoutUpdated(newLayout) {
  internalLayout.value = newLayout
  // Update in store
  if (props.containerId) {
    dashboardStore.updateWidget(props.containerId, { childLayout: newLayout })
    dashboardStore.saveDashboard()
  }
}

function removeWidget(widgetId) {
  internalWidgets.value = internalWidgets.value.filter(w => w.id !== widgetId)
  internalLayout.value = internalLayout.value.filter(l => l.i !== widgetId)

  // Update in store
  if (props.containerId) {
    dashboardStore.updateWidget(props.containerId, {
      children: internalWidgets.value,
      childLayout: internalLayout.value
    })
    dashboardStore.saveDashboard()
  }
}

function editContainer() {
  console.log('[GridContainerWidget] editContainer called')
  // Emit event to parent to open edit dialog for this container
  emit('edit-container', props.containerId)
}

function removeContainer() {
  console.log('[GridContainerWidget] removeContainer called')
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
