<template>
  <div class="widget-slots-selector">
    <div v-if="title" class="text-subtitle2 q-mb-sm">{{ title }}</div>
    <div v-if="description" class="text-caption text-grey-7 q-mb-md">{{ description }}</div>

    <q-list bordered separator>
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
          <SensorSlotSelector
            :slot-config="slotConfigs[slotDef.id]"
            @update:slot-config="updateSlotConfig(slotDef.id, $event)"
          />
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import SensorSlotSelector from './SensorSlotSelector.vue'

const props = defineProps({
  slotDefinitions: {
    type: Array,
    required: true
  },
  initialSlotConfigs: {
    type: Object,
    default: () => ({})
  },
  title: {
    type: String,
    default: 'Configure Sensors'
  },
  description: {
    type: String,
    default: 'Click on a slot button to select Host → Device → Sensor. Slots without a sensor will be hidden in the widget.'
  }
})

const emit = defineEmits(['update:slot-configs'])

// Slot configurations
const slotConfigs = ref({ ...props.initialSlotConfigs })

// Watch for external changes
watch(() => props.initialSlotConfigs, (newConfigs) => {
  slotConfigs.value = { ...newConfigs }
}, { deep: true, immediate: true })

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

// Update slot config from SensorSlotSelector
function updateSlotConfig(slotId, newConfig) {
  slotConfigs.value[slotId] = newConfig
  emit('update:slot-configs', slotConfigs.value)
}
</script>

<style scoped>
.widget-slots-selector {
  padding: 8px 0;
}
</style>
