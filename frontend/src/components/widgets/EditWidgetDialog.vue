<template>
  <q-dialog v-model="dialogVisible">
    <q-card style="min-width: 700px; max-height: 90vh;">
      <q-card-section class="row items-center q-pb-none">
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

        <!-- GridContainer Options -->
        <div v-if="widget?.type === 'gridContainer'" class="widget-options q-mb-md">
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

        <!-- Slots Configuration -->
        <div v-if="widgetSlots.length > 0" class="q-mb-md">
          <div class="text-subtitle2 q-mb-sm">Data Sources</div>
          <div class="text-caption text-grey-7 q-mb-md">
            Click on a slot button to change Host → Device → Sensor. 
            Slots without a sensor will be hidden in the widget.
          </div>

          <q-list bordered separator>
            <q-item
              v-for="slot in widgetSlots"
              :key="slot.id"
              clickable
              v-ripple
              @click.stop="openCascadeMenu(slot, $event)"
            >
              <q-item-section avatar>
                <q-icon
                  :name="getSlotIcon(slot.id)"
                  :color="getSlotColor(slot)"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ slot.label || slot.id }}</q-item-label>
                <q-item-label caption>
                  {{ getSlotSummary(slot) }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  flat
                  dense
                  :color="slot.sensor ? 'primary' : 'grey'"
                  :label="slot.sensor ? slot.sensor.name : 'Configure'"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <!-- Chart Options -->
        <div v-if="widget?.type === 'chart'" class="widget-options q-mb-md">
          <div class="text-subtitle2 q-mb-sm">Chart Options</div>
          <q-select
            v-model="widgetOptions.timeRange"
            label="Time Range"
            :options="['1h', '6h', '12h', '24h', '7d']"
            outlined
            dense
            class="q-mb-sm"
          />
          <q-toggle
            v-model="widgetOptions.showLegend"
            label="Show Legend"
            dense
            class="q-mb-sm"
          />
          <q-toggle
            v-model="widgetOptions.smooth"
            label="Smooth Lines"
            dense
            class="q-mb-sm"
          />
          <q-toggle
            v-model="widgetOptions.fill"
            label="Fill Area"
            dense
          />
        </div>

        <!-- Number Options -->
        <div v-if="widget?.type === 'number'" class="widget-options q-mb-md">
          <div class="text-subtitle2 q-mb-sm">Number Options</div>
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
          <q-input
            v-model="widgetOptions.suffix"
            label="Suffix"
            outlined
            dense
            class="q-mb-sm"
          />
          <q-input
            v-model="widgetOptions.color"
            label="Color"
            outlined
            dense
          >
            <template #append>
              <q-avatar square color="white" size="20px">
                <div
                  :style="{
                    backgroundColor: widgetOptions.color,
                    width: '100%',
                    height: '100%'
                  }"
                />
              </q-avatar>
            </template>
          </q-input>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn flat label="Save" color="primary" @click="saveWidget" />
      </q-card-actions>
    </q-card>

    <!-- Cascade Menu with 3-level dropdown -->
    <q-menu
      v-model="cascadeMenuVisible"
      position="bottom"
      :no-parent-event="true"
      anchor="top middle"
      self="top middle"
      :offset="[0, 0]"
    >
      <q-card style="min-width: 350px">
        <q-card-section class="row items-center q-pb-sm bg-primary text-white">
          <div class="text-subtitle1">{{ currentSlot?.label || currentSlot?.id }}</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="cascadeMenuVisible = false" />
        </q-card-section>

        <q-card-section class="q-pa-md-none">
          <!-- Level 1: Host Selection -->
          <div v-if="!currentHostSelection" class="menu-column">
            <q-list dense>
              <q-item
                v-for="host in hostOptions"
                :key="host.value"
                clickable
                v-ripple
                @click="selectHost(host.value)"
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
          </div>

          <!-- Level 2: Device Selection -->
          <div v-else-if="!currentDeviceSelection" class="menu-column">
            <div class="menu-header">
              <q-btn flat dense round icon="arrow_back" size="sm" @click="currentHostSelection = null" />
              <span class="text-caption text-grey-7">{{ currentHostSelection }}</span>
            </div>
            <q-list dense>
              <q-item
                v-for="device in getDeviceOptions(currentHostSelection)"
                :key="device.value"
                clickable
                v-ripple
                @click="selectDevice(device.value)"
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
          </div>

          <!-- Level 3: Sensor Selection -->
          <div v-else class="menu-column">
            <div class="menu-header">
              <q-btn flat dense round icon="arrow_back" size="sm" @click="currentDeviceSelection = null" />
              <span class="text-caption text-grey-7">{{ currentDeviceSelection }}</span>
            </div>
            <q-list dense>
              <q-item
                v-for="sensor in getSensorOptions(currentHostSelection, currentDeviceSelection)"
                :key="sensor.value"
                clickable
                v-ripple
                @click="selectSensor(sensor.value)"
              >
                <q-item-section avatar>
                  <q-icon name="sensors" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ sensor.label }}</q-item-label>
                  <q-item-label caption>{{ sensor.value }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon name="check" color="grey-7" />
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-card-section>
      </q-card>
    </q-menu>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDashboardStore } from 'stores/dashboard'
import { getSlotDefinitions } from './widget-registry'

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

// Cascade menu state
const cascadeMenuVisible = ref(false)
const currentSlot = ref(null)

// Selections for cascade menu
const currentHostSelection = ref(null)
const currentDeviceSelection = ref(null)
const currentSensorSelection = ref(null)

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

// Get sensor options for a device
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

// Get slot definitions for widget type
function getSlotDefs(type) {
  return getSlotDefinitions(type)
}

// Watch for widget changes
watch(() => props.widget, (newWidget) => {
  if (newWidget) {
    widgetTitle.value = newWidget.title || ''
    widgetOptions.value = { ...newWidget.options }
    widgetType.value = newWidget.type
    widgetSlots.value = newWidget.slots || []
  }
}, { immediate: true })

// Get slot icon based on slot ID
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

// Get slot color based on configuration
function getSlotColor(slot) {
  if (slot.sensor) return 'primary'
  return 'grey-7'
}

// Get slot summary text
function getSlotSummary(slot) {
  if (!slot.sensor) return ''
  const parts = []
  if (slot.hostId) parts.push(slot.hostId)
  if (slot.deviceId) parts.push(slot.deviceId)
  if (slot.sensor?.name) parts.push(slot.sensor.name)
  return parts.join(' / ')
}

// Open cascade menu for slot
function openCascadeMenu(slot, event) {
  currentSlot.value = slot
  currentHostSelection.value = slot.hostId || null
  currentDeviceSelection.value = slot.deviceId || null
  currentSensorSelection.value = slot.sensor?.name || null
  cascadeMenuVisible.value = true
}

// Select host in cascade menu
function selectHost(hostId) {
  currentHostSelection.value = hostId
  currentDeviceSelection.value = null
  currentSensorSelection.value = null
}

// Select device in cascade menu
function selectDevice(deviceId) {
  currentDeviceSelection.value = deviceId
  currentSensorSelection.value = null
}

// Select sensor in cascade menu
function selectSensor(sensor) {
  currentSensorSelection.value = sensor
  // Save the slot config immediately after sensor selection
  saveSlotConfig()
}

// Save slot configuration when sensor is selected
function saveSlotConfig() {
  if (!currentSlot.value || !currentSensorSelection.value) return

  const updatedSlot = {
    ...currentSlot.value,
    hostId: currentHostSelection.value || undefined,
    deviceId: currentDeviceSelection.value || undefined,
    sensor: {
      name: currentSensorSelection.value,
      table: 'raw'
    }
  }

  const index = widgetSlots.value.findIndex(s => s.id === updatedSlot.id)
  if (index >= 0) {
    widgetSlots.value[index] = updatedSlot
  }
  cascadeMenuVisible.value = false
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
</style>
