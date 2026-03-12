<template>
  <q-dialog v-model="dialogVisible" persistent>
    <q-card style="min-width: 600px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Edit Widget</div>
        <q-space />
        <q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <!-- Widget Title -->
        <q-input
          v-model="widgetTitle"
          label="Widget Title"
          outlined
          dense
          class="q-mb-md"
        />

        <!-- Slots Configuration -->
        <div class="q-mb-md">
          <div class="text-subtitle2 q-mb-sm">Data Sources</div>

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

        <!-- Widget-level Options for Chart -->
        <q-expansion-item
          v-if="widget?.type === 'chart'"
          label="Chart Options"
          icon="settings"
        >
          <q-card>
            <q-card-section class="q-pa-md">
              <q-select
                v-model="widgetOptions.timeRange"
                label="Time Range"
                :options="['1h', '6h', '12h', '24h', '7d']"
                outlined
                dense
              />
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn flat label="Save" color="primary" @click="saveWidget" />
      </q-card-actions>
    </q-card>

    <!-- Cascade Menu with Nested Submenus -->
    <q-menu
      v-model="cascadeMenuVisible"
      :target="menuAnchorEl"
      position="bottom"
      :no-parent-event="true"
    >
      <q-card style="min-width: 350px">
        <q-card-section class="row items-center q-pb-sm bg-primary text-white">
          <div class="text-subtitle1">{{ currentSlot?.label || currentSlot?.id }}</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="cascadeMenuVisible = false" />
        </q-card-section>

        <q-card-section class="q-pa-md-none">
          <!-- Step 1: Host Selection -->
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

          <!-- Step 2: Device Selection -->
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

          <!-- Step 3: Sensor Selection -->
          <div v-else-if="!currentSensorSelection" class="menu-column">
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

          <!-- Step 4: Options -->
          <div v-else class="menu-column">
            <div class="menu-header">
              <q-btn flat dense round icon="arrow_back" size="sm" @click="currentSensorSelection = null" />
              <span class="text-caption text-grey-7">{{ currentSensorSelection }}</span>
            </div>
            <div class="q-pa-md">
              <div class="text-subtitle2 q-mb-sm">Options</div>
              <q-input
                v-model.number="currentSlotOptions.decimals"
                label="Decimals"
                type="number"
                outlined
                dense
                class="q-mb-sm"
              />
              <q-input
                v-model="currentSlotOptions.suffix"
                label="Suffix"
                outlined
                dense
                class="q-mb-sm"
              />
              <q-input
                v-model="currentSlotOptions.color"
                label="Color"
                outlined
                dense
              >
                <template #append>
                  <q-avatar square color="white" size="20px">
                    <div
                      :style="{
                        backgroundColor: currentSlotOptions.color,
                        width: '100%',
                        height: '100%'
                      }"
                    />
                  </q-avatar>
                </template>
              </q-input>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-menu>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDashboardStore } from 'stores/dashboard'
import type { WidgetConfig, WidgetSlot } from 'src/components/models'

const props = defineProps<{
  modelValue: boolean
  widget: WidgetConfig | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:widget': [widget: WidgetConfig]
}>()

const dashboardStore = useDashboardStore()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Widget configuration
const widgetTitle = ref('')
const widgetOptions = ref<Record<string, any>>({})
const widgetSlots = ref<WidgetSlot[]>([])
const widgetType = ref('number')

// Cascade menu state
const cascadeMenuVisible = ref(false)
const currentSlot = ref<WidgetSlot | null>(null)

// Menu positioning
const menuAnchorEl = ref<HTMLElement | null>(null)

// Selections for cascade menu
const currentHostSelection = ref<string | null>(null)
const currentDeviceSelection = ref<string | null>(null)
const currentSensorSelection = ref<string | null>(null)
const currentSlotOptions = ref<Record<string, any>>({})

// Host options from store
const hostOptions = computed(() => {
  return dashboardStore.hosts.map(h => ({
    label: h.host_id,
    value: h.host_id
  }))
})

// Get device options for a host
function getDeviceOptions(hostId: string | null) {
  if (!hostId) return []
  const host = dashboardStore.hosts.find(h => h.host_id === hostId)
  if (!host) return []
  return host.devices.map(d => ({
    label: d.label || d.name,
    value: d.name
  }))
}

// Get sensor options for a device
function getSensorOptions(hostId: string | null, deviceId: string | null) {
  if (!hostId || !deviceId) return []

  const sensorMap: Record<string, { name: string; label: string }[]> = {
    cpu: [
      { name: 'usage_percent', label: 'CPU Usage' },
      { name: 'temperature', label: 'Temperature' },
      { name: 'frequency', label: 'Frequency' }
    ],
    ram: [
      { name: 'used_percent', label: 'RAM Usage' },
      { name: 'used_gb', label: 'Used GB' },
      { name: 'total_gb', label: 'Total GB' }
    ],
    disk: [
      { name: 'used_percent', label: 'Disk Usage' },
      { name: 'used_gb', label: 'Used GB' },
      { name: 'total_gb', label: 'Total GB' },
      { name: 'io_read', label: 'Read I/O' },
      { name: 'io_write', label: 'Write I/O' }
    ],
    network: [
      { name: 'bytes_sent', label: 'Bytes Sent' },
      { name: 'bytes_recv', label: 'Bytes Received' },
      { name: 'packets_sent', label: 'Packets Sent' },
      { name: 'packets_recv', label: 'Packets Received' }
    ]
  }

  const host = dashboardStore.hosts.find(h => h.host_id === hostId)
  if (!host) return []
  const device = host.devices.find(d => d.name === deviceId)
  if (!device) return []

  const sensors = sensorMap[device.type] || [{ name: 'value', label: 'Value' }]
  return sensors.map(s => ({
    label: s.label,
    value: s.name
  }))
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
function getSlotIcon(slotId: string): string {
  const iconMap: Record<string, string> = {
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
function getSlotColor(slot: WidgetSlot): string {
  if (slot.sensor) return 'primary'
  return 'grey-7'
}

// Get slot summary text
function getSlotSummary(slot: WidgetSlot): string {
  if (!slot.sensor) return ''
  const parts = []
  if (slot.hostId) parts.push(slot.hostId)
  if (slot.deviceId) parts.push(slot.deviceId)
  if (slot.sensor?.name) parts.push(slot.sensor.name)
  return parts.join(' / ')
}

// Open cascade menu for slot
function openCascadeMenu(slot: WidgetSlot, event: MouseEvent) {
  currentSlot.value = slot
  currentHostSelection.value = slot.hostId || null
  currentDeviceSelection.value = slot.deviceId || null
  currentSensorSelection.value = slot.sensor?.name || null
  currentSlotOptions.value = { ...slot.options }
  menuAnchorEl.value = event.currentTarget as HTMLElement
  cascadeMenuVisible.value = true
}

// Select host in cascade menu
function selectHost(hostId: string) {
  currentHostSelection.value = hostId
  currentDeviceSelection.value = null
  currentSensorSelection.value = null
}

// Select device in cascade menu
function selectDevice(deviceId: string) {
  currentDeviceSelection.value = deviceId
  currentSensorSelection.value = null
}

// Select sensor in cascade menu
function selectSensor(sensor: string) {
  currentSensorSelection.value = sensor
}

// Save slot configuration when menu closes
watch([cascadeMenuVisible, currentSensorSelection], ([closed, sensor]) => {
  if (closed || !currentSlot.value || !sensor) return

  const updatedSlot: WidgetSlot = {
    ...currentSlot.value,
    hostId: currentHostSelection.value || undefined,
    deviceId: currentDeviceSelection.value || undefined,
    sensor: {
      name: currentSensorSelection.value!,
      table: 'raw'
    },
    options: { ...currentSlotOptions.value }
  }

  const index = widgetSlots.value.findIndex(s => s.id === updatedSlot.id)
  if (index >= 0) {
    widgetSlots.value[index] = updatedSlot
  }
})

// Save widget
function saveWidget() {
  if (props.widget) {
    const updatedWidget: WidgetConfig = {
      ...props.widget,
      title: widgetTitle.value,
      slots: widgetSlots.value,
      options: { ...widgetOptions.value }
    }
    emit('update:widget', updatedWidget)
    dialogVisible.value = false
  }
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
</style>
