<template>
  <DraggableDialog
    v-model="dialogVisible"
    state-key="edit-widget"
    title="Edit Widget"
    :width="640"
    :height="560"
  >
    <template v-if="editingWidget">
      <!-- Widget Title (common for all widgets) -->
      <q-input
        v-model="widgetTitle"
        label="Widget Title"
        outlined
        dense
        class="q-mb-md"
        @update:model-value="applyTitle"
      />

      <!-- Slots Configuration -->
      <div v-if="widgetSlots.length > 0" class="q-mb-md">
        <WidgetSlotsSelector
          :key="editFormKey"
          :slot-definitions="widgetSlotDefinitions"
          :initial-slot-configs="slotConfigsForSelector"
          title="Data Sources"
          description="Click on a slot button to change Host → Device → Sensor. Slots without a sensor will be hidden in the widget."
          @update:slot-configs="applySlotConfigs"
        />
      </div>

      <!-- Widget-specific options -->
      <div v-if="widgetEditComponent" class="widget-options-section">
        <component
          :is="widgetEditComponent"
          :key="editFormKey"
          :widget="editingWidget"
          :widget-options="widgetOptions"
          @update:widget-options="applyWidgetOptions"
          @update:widget="applyWidgetFromChild"
        />
      </div>
    </template>

    <template #actions>
      <q-btn
        flat
        label="Reset"
        color="negative"
        :disable="!canReset"
        @click="resetWidget"
      />
    </template>
  </DraggableDialog>
</template>

<script setup>
import { ref, computed, watch, shallowRef } from 'vue'
import { useDashboardStore } from 'stores/dashboard'
import { useWidgetWindowsStore } from 'stores/widgetWindows'
import DraggableDialog from '../common/DraggableDialog.vue'
import WidgetSlotsSelector from '../common/WidgetSlotsSelector.vue'
import { getSlotDefinitions } from './widget-registry'

// Import all edit dialog components
import NumberWidgetEditDialog from './NumberWidgetEditDialog.vue'
import ChartWidgetEditDialog from './ChartWidgetEditDialog.vue'
import GaugeWidgetEditDialog from './GaugeWidgetEditDialog.vue'
import NumberChartWidgetEditDialog from './NumberChartWidgetEditDialog.vue'
import MultiChartWidgetEditDialog from './MultiChartWidgetEditDialog.vue'
import GridContainerWidgetEditDialog from './GridContainerWidgetEditDialog.vue'

// Map of all edit dialog components
const editDialogComponents = {
  number: NumberWidgetEditDialog,
  chart: ChartWidgetEditDialog,
  gauge: GaugeWidgetEditDialog,
  numberChart: NumberChartWidgetEditDialog,
  multiChart: MultiChartWidgetEditDialog,
  gridContainer: GridContainerWidgetEditDialog
}

const dashboardStore = useDashboardStore()
const widgetWindows = useWidgetWindowsStore()

const dialogVisible = computed({
  get: () => widgetWindows.editOpen,
  set: (value) => {
    if (!value) widgetWindows.closeEdit()
  }
})

const editingWidget = computed(() => widgetWindows.editingWidget)
const canReset = computed(() => widgetWindows.canResetCurrent)

// Form state (source of truth for the form itself)
const widgetTitle = ref('')
const widgetOptions = ref({})
const widgetSlots = ref([])
const widgetSlotDefinitions = ref([])
const slotConfigsForSelector = ref({})
const widgetEditComponent = shallowRef(null)
const editFormKey = ref(0)

// Initialize form from the widget being edited
function loadWidget(widget) {
  widgetTitle.value = widget.title || ''
  widgetOptions.value = { ...widget.options }
  widgetSlots.value = JSON.parse(JSON.stringify(widget.slots || []))
  widgetSlotDefinitions.value = getSlotDefinitions(widget.type)
  widgetEditComponent.value = editDialogComponents[widget.type] || null

  const configs = {}
  for (const slot of (widget.slots || [])) {
    configs[slot.id] = {
      hostId: slot.hostId || null,
      deviceId: slot.deviceId || null,
      sensor: slot.sensor?.name || null
    }
  }
  slotConfigsForSelector.value = configs
  editFormKey.value = editFormKey.value + 1
}

// Re-initialize the form when the dialog opens or the target widget changes.
// Keyed on the target id (NOT the widget object ref): the periodic data
// refresh replaces widget objects in the store to drive grid reactivity,
// and reloading on every such replacement would remount the inputs and
// steal focus while the user is typing.
watch(
  () => [widgetWindows.editOpen, widgetWindows.editWidgetId],
  () => {
    if (widgetWindows.editOpen && editingWidget.value) {
      loadWidget(editingWidget.value)
    }
  },
  { immediate: true }
)

// --- Live-apply: every change immediately writes to the widget (memory only) ---

function applyTitle(value) {
  widgetTitle.value = value
  if (editingWidget.value) {
    dashboardStore.updateWidgetLive(editingWidget.value.id, { title: value })
  }
}

function applySlotConfigs(newConfigs) {
  const newSlots = widgetSlots.value.map(slot => {
    const config = newConfigs[slot.id]
    if (!config) return slot
    return {
      ...slot,
      hostId: config.hostId || undefined,
      deviceId: config.deviceId || undefined,
      sensor: config.sensor ? {
        name: config.sensor,
        table: 'raw'
      } : undefined
    }
  })
  widgetSlots.value = newSlots
  if (editingWidget.value) {
    dashboardStore.updateWidgetLive(editingWidget.value.id, { slots: newSlots })
  }
}

function applyWidgetOptions(newOptions) {
  widgetOptions.value = newOptions
  if (editingWidget.value) {
    dashboardStore.updateWidgetLive(editingWidget.value.id, { options: newOptions })
  }
}

function applyWidgetFromChild(updatedWidget) {
  if (!updatedWidget?.slots) return
  widgetSlots.value = JSON.parse(JSON.stringify(updatedWidget.slots))

  // Also update slot configs so the selector reflects child-driven changes
  const newConfigs = {}
  for (const slot of (updatedWidget.slots || [])) {
    newConfigs[slot.id] = {
      hostId: slot.hostId || null,
      deviceId: slot.deviceId || null,
      sensor: slot.sensor?.name || null
    }
  }
  slotConfigsForSelector.value = newConfigs

  if (editingWidget.value) {
    dashboardStore.updateWidgetLive(editingWidget.value.id, { slots: updatedWidget.slots })
  }
}

// Reset the current widget to its last DB-saved state
function resetWidget() {
  widgetWindows.resetCurrentWidget()
  loadWidget(editingWidget.value)
}
</script>

<style scoped>
.widget-options-section {
  margin-top: 16px;
}
</style>