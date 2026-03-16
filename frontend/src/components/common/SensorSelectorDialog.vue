<template>
  <q-dialog v-model="dialogVisible" persistent>
    <q-card style="min-width: 500px; max-width: 600px;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Select Sensor</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="closeDialog" />
      </q-card-section>

      <q-card-section class="q-pt-none selector-list-container">
        <!-- Breadcrumb navigation - show only on device/sensor levels -->
        <div v-if="currentLevel === 'device' || currentLevel === 'sensor'" class="breadcrumb-nav q-mb-sm">
          <div
            class="breadcrumb-item clickable"
            @click="currentLevel = 'host'; selectedDevice = null; selectedSensor = null"
          >
            <q-icon name="dns" size="xs" />
            {{ selectedHost }}
          </div>
          <q-icon
            v-if="selectedHost && currentLevel === 'sensor'"
            name="chevron_right"
            size="xs"
            color="grey-7"
          />
          <div
            v-if="selectedHost && currentLevel === 'sensor'"
            class="breadcrumb-item"
          >
            <q-icon name="memory" size="xs" />
            {{ selectedDevice }}
          </div>
        </div>

        <q-list bordered separator class="selector-list">
          <!-- Loading state -->
          <div v-if="isLoading" class="loading-container">
            <q-spinner color="primary" size="3em" />
            <div class="loading-text">Loading hosts...</div>
          </div>
          
          <!-- Level 1: Host Selection -->
          <template v-else-if="currentLevel === 'host'">
            <q-item-label header class="text-primary">Select a Host</q-item-label>
            <q-item v-if="sortedHostOptions.length === 0">
              <q-item-section>
                <q-item-label class="text-grey-7">No hosts available</q-item-label>
              </q-item-section>
            </q-item>
            <q-item
              v-else
              v-for="host in sortedHostOptions"
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
          </template>

          <!-- Level 2: Device Selection -->
          <template v-else-if="currentLevel === 'device'">
            <q-item clickable v-ripple @click="currentLevel = 'host'; selectedDevice = null; selectedSensor = null">
              <q-item-section side>
                <q-icon name="arrow_back" size="xs" />
              </q-item-section>
              <q-item-section>
                <q-item-label caption>Back to Hosts</q-item-label>
              </q-item-section>
            </q-item>
            <q-separator />
            <q-item-label header class="text-primary">Select a Device</q-item-label>
            <q-item v-if="sortedDeviceOptions.length === 0">
              <q-item-section>
                <q-item-label class="text-grey-7">No devices available</q-item-label>
              </q-item-section>
            </q-item>
            <q-item
              v-else
              v-for="device in sortedDeviceOptions"
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
          </template>

          <!-- Level 3: Sensor Selection -->
          <template v-else-if="currentLevel === 'sensor'">
            <q-item clickable v-ripple @click="currentLevel = 'device'; selectedSensor = null">
              <q-item-section side>
                <q-icon name="arrow_back" size="xs" />
              </q-item-section>
              <q-item-section>
                <q-item-label caption>Back to Devices</q-item-label>
              </q-item-section>
            </q-item>
            <q-separator />
            <q-item-label header class="text-primary">Select a Sensor</q-item-label>
            <q-item v-if="sortedSensorOptions.length === 0">
              <q-item-section>
                <q-item-label class="text-grey-7">No sensors available</q-item-label>
              </q-item-section>
            </q-item>
            <q-item
              v-else
              v-for="sensor in sortedSensorOptions"
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
              </q-item-section>
              <q-item-section side>
                <q-icon
                  name="check"
                  :style="{ visibility: selectedSensor === sensor.value ? 'visible' : 'hidden' }"
                  color="primary"
                />
              </q-item-section>
            </q-item>
          </template>
        </q-list>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" @click="cancelSelection" />
        <q-btn flat label="Clear" color="grey-7" @click="clearSelection" />
        <q-btn flat label="OK" color="primary" @click="confirmSelection" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDashboardStore } from 'stores/dashboard'

const props = defineProps({
  modelValue: Boolean,
  slotConfig: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'update:slot-config'])

const dashboardStore = useDashboardStore()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Loading state
const isLoading = ref(false)

// Navigation state
const currentLevel = ref('host')
const selectedHost = ref(null)
const selectedDevice = ref(null)
const selectedSensor = ref(null)

// Watch for dialog open - load data and initialize selections
watch(dialogVisible, async (isOpen) => {
  if (isOpen) {
    isLoading.value = true
    
    // Load hosts if not already loaded
    if (!dashboardStore.hosts || dashboardStore.hosts.length === 0) {
      await dashboardStore.loadHosts()
    }
    
    isLoading.value = false
    
    // Initialize selections from slot config
    selectedHost.value = props.slotConfig.hostId || null
    selectedDevice.value = props.slotConfig.deviceId || null
    selectedSensor.value = props.slotConfig.sensor || null
    currentLevel.value = selectedSensor.value ? 'sensor' : (selectedDevice.value ? 'device' : 'host')
  }
})

// Host options from store - sorted by name
const hostOptions = computed(() => {
  const hosts = dashboardStore.hosts || []
  return hosts.map(h => ({
    label: h.host_id,
    value: h.host_id
  })).sort((a, b) => a.label.localeCompare(b.label))
})

const sortedHostOptions = computed(() => hostOptions.value)

// Get device options for a host - sorted by name
function getDeviceOptions(hostId) {
  if (!hostId) return []
  const hosts = dashboardStore.hosts || []
  const host = hosts.find(h => h.host_id === hostId)
  if (!host) return []
  const devices = host.devices || []
  return devices.map(d => ({
    label: d.label || d.name,
    value: d.name
  })).sort((a, b) => a.label.localeCompare(b.label))
}

const sortedDeviceOptions = computed(() => getDeviceOptions(selectedHost.value))

// Get sensor options for a device - sorted by name
function getSensorOptions(hostId, deviceId) {
  if (!hostId || !deviceId) return []

  const hosts = dashboardStore.hosts || []
  const host = hosts.find(h => h.host_id === hostId)
  if (!host) return []

  const devices = host.devices || []
  const device = devices.find(d => d.name === deviceId)
  if (!device) return []

  const sensors = device.sensors || []
  return sensors.map(s => ({
    label: s,
    value: s
  })).sort((a, b) => a.label.localeCompare(b.label))
}

const sortedSensorOptions = computed(() => getSensorOptions(selectedHost.value, selectedDevice.value))

function selectHost(hostId) {
  selectedHost.value = hostId
  selectedDevice.value = null
  selectedSensor.value = null
  currentLevel.value = 'device'
}

function selectDevice(deviceId) {
  selectedDevice.value = deviceId
  selectedSensor.value = null
  currentLevel.value = 'sensor'
}

function selectSensor(sensor) {
  selectedSensor.value = sensor
}

function confirmSelection() {
  const newConfig = {
    hostId: selectedHost.value || null,
    deviceId: selectedDevice.value || null,
    sensor: selectedSensor.value || null
  }
  emit('update:slot-config', newConfig)
  closeDialog()
}

function cancelSelection() {
  closeDialog()
}

function clearSelection() {
  selectedHost.value = null
  selectedDevice.value = null
  selectedSensor.value = null
  currentLevel.value = 'host'
  
  emit('update:slot-config', {
    hostId: null,
    deviceId: null,
    sensor: null
  })
  closeDialog()
}

function closeDialog() {
  dialogVisible.value = false
}
</script>

<style scoped>
.selector-list-container {
  padding: 0;
  position: relative;
}

.breadcrumb-nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid #e0e0e0;
  font-size: 14px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #757575;
}

.breadcrumb-item.clickable {
  cursor: pointer;
  color: #1976d2;
}

.breadcrumb-item.clickable:hover {
  color: #1565c0;
  text-decoration: underline;
}

/* Dark theme support */
:deep(.dark .breadcrumb-nav) {
  background: rgba(255, 255, 255, 0.05);
  border-bottom-color: #616161;
}

:deep(.dark .breadcrumb-item) {
  color: #9e9e9e;
}

:deep(.dark .breadcrumb-item.clickable) {
  color: #64b5f6;
}

:deep(.dark .breadcrumb-item.clickable:hover) {
  color: #42a5f5;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 350px;
  gap: 16px;
}

.loading-text {
  color: #757575;
  font-size: 14px;
}

/* Dark theme support */
:deep(.dark .loading-text) {
  color: #9e9e9e;
}

.selector-list {
  height: 350px;
  overflow-y: auto;
}

/* Custom scrollbar for better UX */
.selector-list::-webkit-scrollbar {
  width: 8px;
}

.selector-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.selector-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.selector-list::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* Dark theme scrollbar */
:deep(.dark .selector-list::-webkit-scrollbar-track) {
  background: #424242;
}

:deep(.dark .selector-list::-webkit-scrollbar-thumb) {
  background: #757575;
}

:deep(.dark .selector-list::-webkit-scrollbar-thumb:hover) {
  background: #9e9e9e;
}
</style>
