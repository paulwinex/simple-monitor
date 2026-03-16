<template>
  <div class="sensor-slot-selector">
    <q-btn
      flat
      dense
      :color="isConfigured ? 'primary' : 'grey'"
      :label="buttonLabel"
      no-caps
      @click="openDialog"
    />
    
    <SensorSelectorDialog
      v-model="showDialog"
      :slot-config="localSlotConfig"
      @update:slot-config="updateSlotConfig"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import SensorSelectorDialog from './SensorSelectorDialog.vue'

const props = defineProps({
  slotConfig: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:slot-config'])

const showDialog = ref(false)

// Local copy of slot config
const localSlotConfig = ref({ ...props.slotConfig })

// Watch for external changes
watch(() => props.slotConfig, (newConfig) => {
  localSlotConfig.value = { ...newConfig }
}, { deep: true, immediate: true })

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

function openDialog() {
  showDialog.value = true
}

function updateSlotConfig(newConfig) {
  localSlotConfig.value = newConfig
  emit('update:slot-config', newConfig)
}
</script>

<style scoped>
.sensor-slot-selector {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
