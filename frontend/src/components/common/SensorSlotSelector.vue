<template>
  <div class="sensor-slot-selector">
    <q-btn-dropdown
      ref="dropdownRef"
      flat
      dense
      :color="isConfigured ? 'primary' : 'grey'"
      :label="buttonLabel"
      no-caps
      @update:model-value="onMenuToggle"
    >
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
              v-if="localSlotConfig.sensor === sensor.value"
              color="primary"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDashboardStore } from 'stores/dashboard'

const props = defineProps({
  slotConfig: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:slot-config'])

const dashboardStore = useDashboardStore()

const dropdownRef = ref(null)
const tempHostSelection = ref(null)
const tempDeviceSelection = ref(null)

// Local copy of slot config
const localSlotConfig = ref({ ...props.slotConfig })

// Watch for external changes
watch(() => props.slotConfig, (newConfig) => {
  localSlotConfig.value = { ...newConfig }
}, { deep: true, immediate: true })

// Host options from store
const hostOptions = computed(() => {
  const hosts = dashboardStore.hosts || []
  return hosts.map(h => ({
    label: h.host_id,
    value: h.host_id
  }))
})

// Get device options for a host
function getDeviceOptions(hostId) {
  if (!hostId) return []
  const hosts = dashboardStore.hosts || []
  const host = hosts.find(h => h.host_id === hostId)
  if (!host) return []
  const devices = host.devices || []
  return devices.map(d => ({
    label: d.label || d.name,
    value: d.name
  }))
}

// Get sensor options for a device
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
  }))
}

// Check if slot is configured
const isConfigured = computed(() => {
  return !!(localSlotConfig.value.hostId &&
    localSlotConfig.value.deviceId &&
    localSlotConfig.value.sensor)
})

// Get button label
const buttonLabel = computed(() => {
  if (!localSlotConfig.value.sensor) return 'Configure'
  return localSlotConfig.value.sensor
})

// Handle menu toggle - reset temp selections when menu opens
function onMenuToggle(isOpen) {
  if (isOpen) {
    // Initialize temp selections from current config when menu opens
    tempHostSelection.value = localSlotConfig.value.hostId || null
    tempDeviceSelection.value = localSlotConfig.value.deviceId || null
  } else {
    // Reset temp selections when menu closes
    tempHostSelection.value = null
    tempDeviceSelection.value = null
  }
}

// Select sensor from nested menu
function selectSensor(sensor) {
  localSlotConfig.value = {
    ...localSlotConfig.value,
    hostId: tempHostSelection.value,
    deviceId: tempDeviceSelection.value,
    sensor: sensor
  }
  emit('update:slot-config', localSlotConfig.value)
  // Close dropdown
  if (dropdownRef.value) {
    dropdownRef.value.show(false)
  }
}
</script>

<style scoped>
.sensor-slot-selector {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
