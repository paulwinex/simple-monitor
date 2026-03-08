<template>
  <div class="q-pa-md">
    <div class="text-subtitle2 q-mb-md">Select Host and Device</div>
    
    <div v-if="loading" class="row justify-center q-my-md">
      <q-spinner color="primary" size="2em" />
    </div>
    
    <div v-else-if="hosts.length === 0" class="text-center q-my-md">
      <q-icon name="warning" size="2em" color="warning" />
      <div class="q-mt-sm">No hosts available</div>
    </div>
    
    <template v-else>
      <q-select
        v-model="localHost"
        :options="hostOptions"
        option-value="value"
        option-label="label"
        label="Host"
        outlined
        dense
        class="q-mb-md"
        emit-value
        map-options
      />
      
      <q-select
        v-model="localDevice"
        :options="deviceOptions"
        option-value="value"
        option-label="label"
        label="Device"
        outlined
        dense
        :disable="!localHost"
        emit-value
        map-options
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useDashboardStore } from 'stores/dashboard'

const props = defineProps<{
  selectedHost: string | null
  selectedDevice: string | null
}>()

const emit = defineEmits<{
  'update:selectedHost': [value: string | null]
  'update:selectedDevice': [value: string | null]
}>()

const dashboardStore = useDashboardStore()

const loading = ref(false)
const localHost = ref<string | null>(props.selectedHost)
const localDevice = ref<string | null>(props.selectedDevice)

const hosts = computed(() => dashboardStore.hosts)

const hostOptions = computed(() => {
  return hosts.value.map(h => ({
    value: h.host_id,
    label: h.host_id
  }))
})

const deviceOptions = computed(() => {
  if (!localHost.value) return []
  
  const host = hosts.value.find(h => h.host_id === localHost.value)
  if (!host) return []
  
  return host.devices.map(d => ({
    value: d.name,
    label: d.label || d.name
  }))
})

watch(localHost, (newVal) => {
  emit('update:selectedHost', newVal)
  // Reset device when host changes
  localDevice.value = null
  emit('update:selectedDevice', null)
})

watch(localDevice, (newVal) => {
  emit('update:selectedDevice', newVal)
})

watch(() => props.selectedHost, (newVal) => {
  localHost.value = newVal
})

watch(() => props.selectedDevice, (newVal) => {
  localDevice.value = newVal
})

onMounted(async () => {
  loading.value = true
  try {
    await dashboardStore.loadHosts()
  } catch (err) {
    console.error('Failed to load hosts:', err)
  } finally {
    loading.value = false
  }
})
</script>
