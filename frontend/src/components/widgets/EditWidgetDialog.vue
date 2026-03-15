<template>
  <q-dialog v-model="dialogVisible">
    <q-card style="min-width: 700px; max-height: 90vh;">
      <q-card-section class="row items-center q-pb-none q-mb-md">
        <div class="text-h6">Edit Widget</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="closeDialog" />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <!-- Widget Title (common for all widgets) -->
        <q-input
          v-model="widgetTitle"
          label="Widget Title"
          outlined
          dense
          class="q-mb-md"
        />

        <!-- Slots Configuration -->
        <div v-if="widgetSlots.length > 0" class="q-mb-md">
          <WidgetSlotsSelector
            :slot-definitions="widgetSlotDefinitions"
            :initial-slot-configs="slotConfigsForSelector"
            title="Data Sources"
            description="Click on a slot button to change Host → Device → Sensor. Slots without a sensor will be hidden in the widget."
            @update:slot-configs="updateSlotConfigsFromSelector"
          />
        </div>

        <!-- Widget-specific options slot -->
        <component
          :is="widgetEditComponent"
          v-if="widgetEditComponent"
          ref="widgetEditRef"
          :widget="widget"
          :widget-options="widgetOptions"
          @update:widget-options="updateWidgetOptions"
          @update:widget="updateWidgetFromChild"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" @click="cancelChanges" />
        <q-btn flat label="Save" color="primary" @click="saveWidget" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch, defineAsyncComponent, markRaw } from 'vue'
import { useDashboardStore } from 'stores/dashboard'
import { getWidgetEditDialog, getSlotDefinitions } from './widget-registry'
import WidgetSlotsSelector from './WidgetSlotsSelector.vue'

const props = defineProps({
  modelValue: Boolean,
  widget: Object
})

const emit = defineEmits([
  'update:modelValue',
  'update:widget'
])

const dashboardStore = useDashboardStore()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Widget configuration
const widgetTitle = ref('')
const widgetOptions = ref({})
const widgetSlots = ref([])
const widgetType = ref('')
const widgetSlotDefinitions = ref([])
const slotConfigsForSelector = ref({})
const widgetEditComponent = ref(null)
const widgetEditRef = ref(null)

// Backup for cancel functionality
const backupSlots = ref([])
const backupTitle = ref('')
const backupOptions = ref({})

// Watch for widget changes - create backup for cancel
watch(() => props.widget, async (newWidget) => {
  if (newWidget) {
    widgetTitle.value = newWidget.title || ''
    widgetOptions.value = { ...newWidget.options }
    widgetType.value = newWidget.type
    widgetSlots.value = JSON.parse(JSON.stringify(newWidget.slots || []))
    backupSlots.value = JSON.parse(JSON.stringify(newWidget.slots || []))
    backupTitle.value = newWidget.title || ''
    backupOptions.value = { ...newWidget.options }

    // Load slot definitions for this widget type
    const defs = getSlotDefinitions(newWidget.type)
    widgetSlotDefinitions.value = defs

    // Convert slots to format expected by WidgetSlotsSelector
    const configs = {}
    for (const slot of (newWidget.slots || [])) {
      configs[slot.id] = {
        hostId: slot.hostId || null,
        deviceId: slot.deviceId || null,
        sensor: slot.sensor?.name || null
      }
    }
    slotConfigsForSelector.value = configs

    // Load widget-specific edit dialog component
    const editDialog = getWidgetEditDialog(newWidget.type)
    if (editDialog) {
      widgetEditComponent.value = markRaw(defineAsyncComponent(() => import(`./${editDialog}`)))
    } else {
      widgetEditComponent.value = null
    }
  }
}, { immediate: true })

// Update slot configs from WidgetSlotsSelector
function updateSlotConfigsFromSelector(newConfigs) {
  // Convert configs back to slot format
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
}

// Update widget options from child component
function updateWidgetOptions(newOptions) {
  widgetOptions.value = newOptions
}

// Update widget from child component (e.g., sensor change)
function updateWidgetFromChild(updatedWidget) {
  if (updatedWidget?.slots) {
    widgetSlots.value = JSON.parse(JSON.stringify(updatedWidget.slots))
    
    // Also update slot configs for selector
    const configs = {}
    for (const slot of (updatedWidget.slots || [])) {
      configs[slot.id] = {
        hostId: slot.hostId || null,
        deviceId: slot.deviceId || null,
        sensor: slot.sensor?.name || null
      }
    }
    slotConfigsForSelector.value = configs
  }
}

// Cancel changes and restore backup
function cancelChanges() {
  widgetSlots.value = JSON.parse(JSON.stringify(backupSlots.value))
  widgetTitle.value = backupTitle.value
  widgetOptions.value = backupOptions.value
  dialogVisible.value = false
}

// Save widget
function saveWidget() {
  if (props.widget) {
    const updatedWidget = {
      ...props.widget,
      title: widgetTitle.value,
      slots: widgetSlots.value,
      options: { ...widgetOptions.value }
    }
    emit('update:widget', updatedWidget)
    closeDialog()
  }
}

function closeDialog() {
  dialogVisible.value = false
}
</script>

<style scoped>
.q-card {
  max-height: 90vh;
}

.widget-options {
  border-top: 1px solid #e0e0e0;
  padding-top: 16px;
}

.widget-options-column {
  border-top: 1px solid #e0e0e0;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
}
</style>
