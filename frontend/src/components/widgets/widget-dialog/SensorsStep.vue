<template>
  <div class="q-pa-md">
    <div class="text-subtitle2 q-mb-md">Select Sensors</div>
    
    <div v-if="loading" class="row justify-center q-my-md">
      <q-spinner color="primary" size="2em" />
    </div>
    
    <div v-else-if="availableSensors.length === 0" class="text-center q-my-md">
      <q-icon name="info" size="2em" color="info" />
      <div class="q-mt-sm">No sensors available for this device</div>
    </div>
    
    <template v-else>
      <div class="text-caption q-mb-sm">
        Select at least one sensor to display in the widget
      </div>
      
      <q-list bordered separator>
        <q-item
          v-for="sensor in availableSensors"
          :key="sensor.name"
          clickable
          v-ripple
          @click="toggleSensor(sensor.name)"
        >
          <q-item-section avatar>
            <q-checkbox
              :model-value="isSensorSelected(sensor.name)"
              keep-color
              color="primary"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ sensor.label || sensor.name }}</q-item-label>
            <q-item-label caption>{{ sensor.name }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-select
              v-model="sensorTableMap[sensor.name]"
              :options="tableOptions"
              dense
              outlined
              style="min-width: 100px"
              @click.stop
            />
          </q-item-section>
        </q-item>
      </q-list>
      
      <div class="q-mt-md">
        <q-badge color="primary" :label="`Selected: ${selectedSensors.length}`" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'

const props = defineProps<{
  selectedSensors: { name: string; table: string }[]
  hostId: string | null
  deviceId: string | null
  widgetType: string
}>()

const emit = defineEmits<{
  'update:selectedSensors': [value: { name: string; table: string }[]]
}>()

const $q = useQuasar()

const loading = ref(false)
const sensorTableMap = ref<Record<string, string>>({})

// Available sensors based on device type (this would come from API in real implementation)
const availableSensors = computed(() => {
  if (!props.deviceId) return []
  
  // Mock sensor data - in real implementation, fetch from API
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
  
  return sensorMap[props.deviceId] || [
    { name: 'value', label: 'Value' }
  ]
})

const tableOptions = ['raw', 'hourly', 'history']

function isSensorSelected(name: string): boolean {
  return props.selectedSensors.some(s => s.name === name)
}

function toggleSensor(name: string) {
  const index = props.selectedSensors.findIndex(s => s.name === name)
  
  if (index >= 0) {
    // Remove sensor
    const newSensors = props.selectedSensors.filter(s => s.name !== name)
    emit('update:selectedSensors', newSensors)
    delete sensorTableMap.value[name]
  } else {
    // Add sensor with default table
    const defaultTable = props.widgetType === 'chart' ? 'raw' : 'raw'
    const newSensors = [...props.selectedSensors, { name, table: sensorTableMap.value[name] || defaultTable }]
    emit('update:selectedSensors', newSensors)
    
    if (!sensorTableMap.value[name]) {
      sensorTableMap.value[name] = defaultTable
    }
  }
}

// Watch for changes in selected sensors to update table mapping
watch(() => props.selectedSensors, (newSensors) => {
  for (const sensor of newSensors) {
    if (!sensorTableMap.value[sensor.name]) {
      sensorTableMap.value[sensor.name] = sensor.table
    }
  }
}, { deep: true })

// Watch for host/device changes to reset sensors
watch([() => props.hostId, () => props.deviceId], () => {
  emit('update:selectedSensors', [])
  sensorTableMap.value = {}
})
</script>
