<template>
  <q-dialog v-model="dialogVisible">
    <q-card style="min-width: 700px; max-height: 90vh;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Add Widget</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="closeDialog" />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-stepper
          v-model="step"
          color="primary"
          flat
          animated
          header-nav
          vertical
        >
          <!-- Step 1: Widget Type Selection -->
          <q-step
            :name="1"
            title="Select Widget Type"
            icon="widgets"
            :done="step > 1"
          >
            <div class="widget-grid q-pa-md">
              <div
                v-for="widget in availableWidgets"
                :key="widget.type"
                class="widget-card"
                @click="selectWidgetType(widget.type)"
              >
                <q-card class="full-height cursor-pointer" bordered>
                  <q-card-section class="text-center q-pa-lg">
                    <q-icon
                      :name="getWidgetIcon(widget.type)"
                      size="48px"
                      color="primary"
                      class="q-mb-md"
                    />
                    <div class="text-h6 q-mb-xs">{{ widget.label }}</div>
                    <div class="text-caption text-grey-7">
                      {{ getSlotCount(widget) }} slot(s)
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-step>

          <!-- Step 2: Sensor Selection (Slots Configuration) -->
          <q-step
            :name="2"
            title="Configure Sensors"
            icon="sensors"
            :done="step > 2"
          >
            <div class="q-pa-md">
              <WidgetSlotsSelector
                :slot-definitions="slotDefinitions"
                :initial-slot-configs="slotConfigs"
                @update:slot-configs="slotConfigs = $event"
              />
            </div>
          </q-step>

          <!-- Step 3: Widget Options (Embedded Edit Dialog) -->
          <q-step
            :name="3"
            title="Widget Options"
            icon="settings"
          >
            <div class="q-pa-md">
              <!-- Widget Title (common for all widgets) -->
              <q-input
                v-model="widgetTitle"
                label="Widget Title"
                outlined
                dense
                class="q-mb-md"
              />

              <!-- Widget-specific options -->
              <component
                :is="widgetEditComponent"
                v-if="widgetEditComponent"
                :widget-options="widgetOptions"
                @update:widget-options="updateWidgetOptions"
              />
            </div>
          </q-step>

          <template #navigation>
            <q-stepper-navigation>
              <div class="row full-width justify-between">
                <q-btn
                  v-if="step === 2"
                  flat
                  @click="step = 1"
                  label="Back"
                  color="primary"
                />
                <q-btn
                  v-if="step === 2"
                  flat
                  @click="step = 3"
                  label="Next"
                  color="primary"
                  :disable="!canProceedToStep3"
                />
                <q-btn
                  v-if="step === 3"
                  flat
                  @click="step = 2"
                  label="Back"
                  color="primary"
                />
                <q-btn
                  v-if="step === 3"
                  flat
                  @click="createWidget"
                  label="Create"
                  color="primary"
                  :disable="!canCreate"
                />
              </div>
            </q-stepper-navigation>
          </template>
        </q-stepper>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch, defineAsyncComponent, markRaw } from 'vue'
import { useDashboardStore } from 'stores/dashboard'
import { widgetRegistry, getSlotDefinitions, getWidgetEditDialog } from './widget-registry'
import WidgetSlotsSelector from '../common/WidgetSlotsSelector.vue'

const props = defineProps({
  modelValue: Boolean,
  parentType: String,
  parentId: String
})

const emit = defineEmits([
  'update:modelValue'
])

const dashboardStore = useDashboardStore()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Filter widgets based on context
// If creating widget for main window (root), show GridContainer
// If creating nested widget (inside container), hide GridContainer
const availableWidgets = computed(() => {
  if (props.parentType === 'gridContainer') {
    return widgetRegistry.filter(w => w.type !== 'gridContainer')
  }
  return widgetRegistry
})

const step = ref(1)
const selectedType = ref('')
const selectedWidgetDef = computed(() =>
  availableWidgets.value.find(w => w.type === selectedType.value)
)

// Widget configuration
const widgetTitle = ref('')
const widgetOptions = ref({})
const slotConfigs = ref({})
const widgetEditComponent = ref(null)

const slotDefinitions = computed(() => {
  if (!selectedType.value) return []
  return getSlotDefinitions(selectedType.value)
})

// Check if widget can proceed to step 3
const canProceedToStep3 = computed(() => {
  const defs = slotDefinitions.value
  for (const def of defs) {
    if (def.required) {
      const config = slotConfigs.value[def.id]
      if (!config || !config.hostId || !config.deviceId || !config.sensor) {
        return false
      }
    }
  }
  return true
})

// Check if widget can be created
const canCreate = computed(() => {
  return canProceedToStep3.value
})

// Get widget icon
function getWidgetIcon(type) {
  const iconMap = {
    number: 'format_list_numbered',
    chart: 'insert_chart',
    gauge: 'speed',
    gridContainer: 'view_module',
    cpu: 'memory',
    numberChart: 'view_module',
    multiChart: 'multichart'
  }
  return iconMap[type] || 'widgets'
}

// Get slot count for display
function getSlotCount(widget) {
  return widget.slotDefinitions.length
}

// Update widget options from child component
function updateWidgetOptions(newOptions) {
  widgetOptions.value = newOptions
}

// Select widget type and go to next step
function selectWidgetType(type) {
  selectedType.value = type

  // GridContainer has no slots - create immediately
  if (type === 'gridContainer') {
    widgetTitle.value = ''
    widgetOptions.value = { colNum: 12 }
    slotConfigs.value = {}
    createWidget()
    return
  }

  const defs = getSlotDefinitions(type)

  // Initialize slot configs
  slotConfigs.value = {}
  for (const def of defs) {
    slotConfigs.value[def.id] = {
      hostId: null,
      deviceId: null,
      sensor: null,
      options: { ...def.defaultOptions }
    }
  }

  // Initialize widget options with defaults
  widgetTitle.value = ''
  widgetOptions.value = {}
  if (type === 'chart') {
    widgetOptions.value = {
      timeRange: '1h',
      chartColor: '#2196F3',
      showLegend: false,
      smooth: false,
      fill: false,
      showPoints: false,
      showXAxis: false,
      showYAxis: false,
      showGrid: false,
      showAxisValues: false,
      yAxisMin: undefined,
      yAxisMax: undefined
    }
  } else if (type === 'number') {
    widgetOptions.value = {
      decimals: 0,
      suffix: '',
      color: '#4CAF50',
      fontSize: 50
    }
  } else if (type === 'gauge') {
    widgetOptions.value = {
      strokeWidth: 20,
      arcAngle: 270,
      rangeMin: 0,
      rangeMax: 100,
      gradientColors: [
        { color: '#4CAF50', position: 0 },
        { color: '#FF9800', position: 0.5 },
        { color: '#F44336', position: 1 }
      ],
      showValue: true,
      textColor: '#ffffff',
      backgroundColor: '#424242',
      decimals: 0,
      suffix: '',
      prefix: ''
    }
  } else if (type === 'numberChart') {
    widgetOptions.value = {
      gap: 16,
      contentPadding: 8,
      numberFontSize: 50,
      numberDecimals: 0,
      numberSuffix: '',
      numberPrefix: '',
      numberColor: '#4CAF50',
      timeRange: '1h',
      chartColor: '#2196F3',
      showLegend: false,
      smooth: false,
      fill: false,
      showPoints: false,
      showXAxis: false,
      showYAxis: false,
      showGrid: false,
      showAxisValues: false,
      yAxisMin: undefined,
      yAxisMax: undefined
    }
  } else if (type === 'multiChart') {
    widgetOptions.value = {
      timeRange: '1h',
      showLegend: true,
      legendPosition: 'top',
      smooth: false,
      fill: false,
      showPoints: false,
      showXAxis: false,
      showYAxis: false,
      showGrid: false,
      showAxisValues: false,
      yAxisMin: undefined,
      yAxisMax: undefined
    }
  }

  // Load widget-specific edit dialog component
  const editDialog = getWidgetEditDialog(type)
  if (editDialog) {
    widgetEditComponent.value = markRaw(defineAsyncComponent(() => import(`./${editDialog}`)))
  } else {
    widgetEditComponent.value = null
  }

  step.value = 2
}

// Create widget
function createWidget() {
  const slots = slotDefinitions.value.map(def => {
    const config = slotConfigs.value[def.id]
    return {
      id: def.id,
      label: def.label,
      hostId: config.hostId || undefined,
      deviceId: config.deviceId || undefined,
      sensor: config.sensor ? {
        name: config.sensor,
        table: 'raw'
      } : undefined,
      // Merge slot options with widget-level options
      // For multiChart, preserve slot-level color
      options: {
        ...config.options,
        // Override with widget-level options for specific widget types
        ...(selectedType.value === 'number' ? {
          decimals: widgetOptions.value.decimals,
          color: widgetOptions.value.color,
          suffix: widgetOptions.value.suffix
        } : selectedType.value === 'chart' ? {
          chartColor: widgetOptions.value.chartColor
        } : {})
      }
    }
  })

  const newWidget = {
    id: `widget-${Date.now()}`,
    type: selectedType.value,
    title: widgetTitle.value || undefined,
    slots,
    options: { ...widgetOptions.value },
    refreshInterval: 5000
  }

  // Add default data structure based on widget type
  if (selectedType.value === 'number') {
    newWidget.data = { value: 0 }
  } else if (selectedType.value === 'chart') {
    newWidget.data = { data: [] }
  } else if (selectedType.value === 'gauge') {
    newWidget.data = { value: 0 }
  }

  dashboardStore.addWidget(newWidget, props.parentId)

  // Save to backend if added to container
  if (props.parentId) {
    dashboardStore.saveDashboard()
  }

  resetForm()
  dialogVisible.value = false
}

function closeDialog() {
  dialogVisible.value = false
}

function resetForm() {
  step.value = 1
  selectedType.value = ''
  widgetTitle.value = ''
  widgetOptions.value = {}
  slotConfigs.value = {}
  widgetEditComponent.value = null
}

// Reset form when dialog opens
watch(dialogVisible, (newVal) => {
  if (newVal) {
    resetForm()
    dashboardStore.loadHosts()
  }
})
</script>

<style scoped>
.widget-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.widget-card {
  transition: transform 0.2s;
}

.widget-card:hover {
  transform: translateY(-4px);
}

.q-stepper {
  background: transparent;
}

.menu-column {
  max-height: 400px;
  overflow-y: auto;
}

.menu-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
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
