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
              <div class="text-subtitle2 q-mb-sm">
                Widget Slots - Configure data source for each slot
              </div>
              <div class="text-caption text-grey-7 q-mb-md">
                Click on a slot button to select Host → Device → Sensor.
                Slots without a sensor will be hidden in the widget.
              </div>

              <!-- Slots Configuration List -->
              <q-list bordered separator class="q-mb-md">
                <q-item
                  v-for="slotDef in slotDefinitions"
                  :key="slotDef.id"
                >
                  <q-item-section avatar>
                    <q-icon :name="getSlotIcon(slotDef.id)" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ slotDef.label }}</q-item-label>
                    <q-item-label caption>
                      {{ slotDef.required ? 'Required' : 'Optional' }}
                      <span v-if="getSlotSummary(slotDef.id)" class="text-grey-6 q-ml-xs">
                        — {{ getSlotSummary(slotDef.id) }}
                      </span>
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn flat dense :color="isSlotConfigured(slotDef.id) ? 'primary' : 'grey'" :label="getSlotButtonLabel(slotDef.id)">
                      <q-menu v-model="menuVisible" anchor="top middle" self="top middle">
                        <!-- Level 1: Host Selection -->
                        <q-list v-if="!tempHostSelection" dense style="min-width: 150px">
                          <q-item
                            v-for="host in hostOptions"
                            :key="host.value"
                            clickable
                            @click="tempHostSelection = host.value; tempDeviceSelection = null"
                          >
                            <q-item-section avatar>
                              <q-icon name="dns" color="primary" />
                            </q-item-section>
                            <q-item-section>
                              <q-item-label>{{ host.label }}</q-item-label>
                            </q-item-section>
                            <q-item-section side>
                              <q-icon name="chevron_right" color="grey-7" />
                            </q-item-section>
                          </q-item>
                        </q-list>

                        <!-- Level 2: Device Selection -->
                        <q-list v-else-if="!tempDeviceSelection" dense style="min-width: 150px">
                          <q-item clickable @click="tempHostSelection = null; tempDeviceSelection = null">
                            <q-item-section side>
                              <q-icon name="arrow_back" size="xs" />
                            </q-item-section>
                            <q-item-section>
                              <q-item-label caption>Back</q-item-label>
                            </q-item-section>
                          </q-item>
                          <q-separator />
                          <q-item
                            v-for="device in getDeviceOptions(tempHostSelection)"
                            :key="device.value"
                            clickable
                            @click="tempDeviceSelection = device.value"
                          >
                            <q-item-section avatar>
                              <q-icon name="memory" color="primary" />
                            </q-item-section>
                            <q-item-section>
                              <q-item-label>{{ device.label }}</q-item-label>
                              <q-item-label caption>{{ device.value }}</q-item-label>
                            </q-item-section>
                            <q-item-section side>
                              <q-icon name="chevron_right" color="grey-7" />
                            </q-item-section>
                          </q-item>
                        </q-list>

                        <!-- Level 3: Sensor Selection -->
                        <q-list v-else dense style="min-width: 150px">
                          <q-item clickable @click="tempDeviceSelection = null">
                            <q-item-section side>
                              <q-icon name="arrow_back" size="xs" />
                            </q-item-section>
                            <q-item-section>
                              <q-item-label caption>Back to {{ tempHostSelection }}</q-item-label>
                            </q-item-section>
                          </q-item>
                          <q-separator />
                          <q-item
                            v-for="sensor in getSensorOptions(tempHostSelection, tempDeviceSelection)"
                            :key="sensor.value"
                            clickable
                            @click="selectSensor(slotDef.id, sensor.value)"
                          >
                            <q-item-section avatar>
                              <q-icon name="sensors" color="primary" />
                            </q-item-section>
                            <q-item-section>
                              <q-item-label>{{ sensor.label }}</q-item-label>
                            </q-item-section>
                            <q-item-section side>
                              <q-icon name="check" v-if="slotConfigs[slotDef.id]?.sensor === sensor.value" color="primary" />
                            </q-item-section>
                          </q-item>
                        </q-list>
                      </q-menu>
                    </q-btn>
                  </q-item-section>
                </q-item>
              </q-list>
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
              <!-- Chart Options -->
              <div v-if="selectedType === 'chart'" class="widget-options-column">
                <div class="text-subtitle2 q-mb-sm">Chart Options</div>

                <!-- Time Range -->
                <q-select
                  v-model="widgetOptions.timeRange"
                  label="Time Range"
                  :options="['1m', '5m', '15m', '30m', '1h', '6h', '12h', '24h', '7d']"
                  outlined
                  dense
                  class="q-mb-sm"
                />

                <!-- Chart Color -->
                <q-input
                  v-model="widgetOptions.chartColor"
                  label="Chart Color"
                  outlined
                  dense
                  class="q-mb-sm"
                >
                  <template #append>
                    <q-btn round dense flat icon="colorize">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-color v-model="widgetOptions.chartColor" />
                      </q-popup-proxy>
                    </q-btn>
                  </template>
                </q-input>

                <!-- Legend -->
                <q-toggle
                  v-model="widgetOptions.showLegend"
                  label="Show Legend"
                  class="q-mb-sm"
                />

                <!-- Smooth Lines -->
                <q-toggle
                  v-model="widgetOptions.smooth"
                  label="Smooth Lines"
                  class="q-mb-sm"
                />

                <!-- Fill Area -->
                <q-toggle
                  v-model="widgetOptions.fill"
                  label="Fill Area"
                  class="q-mb-sm"
                />

                <!-- Show Points -->
                <q-toggle
                  v-model="widgetOptions.showPoints"
                  label="Show Points"
                  class="q-mb-sm"
                />

                <!-- Show X Axis -->
                <q-toggle
                  v-model="widgetOptions.showXAxis"
                  label="Show X Axis"
                  class="q-mb-sm"
                />

                <!-- Show Y Axis -->
                <q-toggle
                  v-model="widgetOptions.showYAxis"
                  label="Show Y Axis"
                  class="q-mb-sm"
                />

                <!-- Show Grid -->
                <q-toggle
                  v-model="widgetOptions.showGrid"
                  label="Show Grid"
                  class="q-mb-sm"
                />

                <!-- Show Axis Values -->
                <q-toggle
                  v-model="widgetOptions.showAxisValues"
                  label="Show Axis Values"
                />
              </div>

              <!-- Number Options -->
              <div v-if="selectedType === 'number'" class="widget-options-column">
                <div class="text-subtitle2 q-mb-sm">Number Options</div>

                <!-- Decimal Places -->
                <q-input
                  v-model.number="widgetOptions.decimals"
                  label="Decimal Places"
                  type="number"
                  :min="0"
                  :max="5"
                  outlined
                  dense
                  class="q-mb-sm"
                />

                <!-- Suffix -->
                <q-input
                  v-model="widgetOptions.suffix"
                  label="Suffix"
                  outlined
                  dense
                  class="q-mb-sm"
                />

                <!-- Font Size Slider -->
                <div class="q-mb-sm">
                  <div class="text-caption text-grey-7 q-mb-xs">Font Size: {{ widgetOptions.fontSize }}%</div>
                  <q-slider
                    v-model="widgetOptions.fontSize"
                    :min="20"
                    :max="100"
                    :step="5"
                    label
                    label-always
                    color="primary"
                    markers
                  />
                </div>

                <!-- Color -->
                <q-input
                  v-model="widgetOptions.color"
                  label="Color"
                  outlined
                  dense
                >
                  <template #append>
                    <q-btn round dense flat icon="colorize">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-color v-model="widgetOptions.color" />
                      </q-popup-proxy>
                    </q-btn>
                  </template>
                </q-input>
              </div>

              <div v-if="selectedType === 'gridContainer'" class="widget-options">
                <div class="text-subtitle2 q-mb-sm">Grid Container Options</div>
                <q-input
                  v-model.number="widgetOptions.colNum"
                  label="Number of Columns"
                  type="number"
                  :min="6"
                  :max="48"
                  outlined
                  dense
                  hint="Default is 12. Use 24 for finer control."
                />
              </div>
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
import { ref, computed, watch } from 'vue'
import { useDashboardStore } from 'stores/dashboard'
import { widgetRegistry, getSlotDefinitions } from './widget-registry'

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

const slotDefinitions = computed(() => {
  if (!selectedType.value) return []
  return getSlotDefinitions(selectedType.value)
})

// Temporary selections for nested menu (per-slot)
const tempHostSelection = ref(null)
const tempDeviceSelection = ref(null)
const menuVisible = ref(false)

// Host options from store
const hostOptions = computed(() => {
  return dashboardStore.hosts.map(h => ({
    label: h.host_id,
    value: h.host_id
  }))
})

// Get device options for a host
function getDeviceOptions(hostId) {
  if (!hostId) return []
  const host = dashboardStore.hosts.find(h => h.host_id === hostId)
  if (!host) return []
  return host.devices.map(d => ({
    label: d.label || d.name,
    value: d.name
  }))
}

// Get sensor options for a device - loads from store (populated from backend)
function getSensorOptions(hostId, deviceId) {
  if (!hostId || !deviceId) return []

  const host = dashboardStore.hosts.find(h => h.host_id === hostId)
  if (!host) return []

  const device = host.devices.find(d => d.name === deviceId)
  if (!device) return []

  // Use sensors array loaded from backend
  const sensors = device.sensors || []
  return sensors.map(s => ({
    label: s,
    value: s
  }))
}

// Check if slot is configured
function isSlotConfigured(slotId) {
  const config = slotConfigs.value[slotId]
  return !!(config && config.hostId && config.deviceId && config.sensor)
}

// Get button label for slot
function getSlotButtonLabel(slotId) {
  const config = slotConfigs.value[slotId]
  if (!config || !config.sensor) return 'Configure'
  return config.sensor
}

// Get slot summary for display
function getSlotSummary(slotId) {
  const config = slotConfigs.value[slotId]
  if (!config || !config.hostId) return ''
  const parts = []
  if (config.hostId) parts.push(config.hostId)
  if (config.deviceId) parts.push(config.deviceId)
  if (config.sensor) parts.push(config.sensor)
  return parts.join(' / ')
}

// Select sensor from nested menu - saves immediately to slot config
function selectSensor(slotId, sensor) {
  const config = slotConfigs.value[slotId]
  if (config) {
    config.hostId = tempHostSelection.value
    config.deviceId = tempDeviceSelection.value
    config.sensor = sensor
  }
  // Close menu and reset temp selections
  menuVisible.value = false
  tempHostSelection.value = null
  tempDeviceSelection.value = null
}

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
    gridContainer: 'view_module',
    cpu: 'memory',
    dualNumber: 'view_module'
  }
  return iconMap[type] || 'widgets'
}

// Get slot icon
function getSlotIcon(slotId) {
  const iconMap = {
    number: 'format_list_numbered',
    chart: 'insert_chart',
    load: 'speed',
    temperature: 'thermometer',
    primary: 'looks_one',
    secondary: 'looks_two'
  }
  return iconMap[slotId] || 'data_usage'
}

// Get slot count for display
function getSlotCount(widget) {
  return widget.slotDefinitions.length
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
      showAxisValues: false
    }
  } else if (type === 'number') {
    widgetOptions.value = {
      decimals: 1,
      suffix: '',
      color: '#4CAF50',
      fontSize: 50
    }
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
      options: config.options
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
  tempHostSelection.value = null
  tempDeviceSelection.value = null
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
