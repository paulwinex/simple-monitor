<template>
  <BaseWidget :title="title" :show-header="showHeader">
    <template #content>
      <div class="number-widget">
        <div v-if="loading" class="text-center">
          <q-spinner size="2em" color="primary" />
        </div>
        <div v-else-if="error" class="text-center text-negative">
          {{ error }}
        </div>
        <div v-else class="text-center">
          <div
            v-for="slot in validSlots"
            :key="slot.id"
            class="value"
            :style="{ color: slotColor(slot) }"
          >
            {{ formatValue(slotValue(slot), slot) }}
          </div>
        </div>
      </div>
    </template>
  </BaseWidget>
</template>

<script setup>
import { computed } from 'vue'
import { useDashboardStore } from 'stores/dashboard'
import BaseWidget from './BaseWidget.vue'

const props = defineProps({
  title: String,
  showHeader: Boolean,
  slots: Array,
  widgetId: String,
  loading: Boolean,
  error: String,
  options: Object
})

const dashboardStore = useDashboardStore()

// Get reactive slot data from store
const reactiveSlots = computed(() => {
  if (!props.widgetId || !props.slots) return []
  
  const widget = dashboardStore.getWidget(props.widgetId)
  if (!widget || !widget.slots) return props.slots || []
  
  // Merge slot config with reactive data from store
  return props.slots.map(slotConfig => {
    const storeSlot = widget.slots.find(s => s.id === slotConfig.id)
    return {
      ...slotConfig,
      data: storeSlot?.data || null
    }
  })
})

const validSlots = computed(() => {
  return reactiveSlots.value.filter(s => s.sensor && s.data)
})

function slotValue(slot) {
  const slotData = slot.data
  if (!slotData) return null

  // slot.data is a wrapper object with data array inside
  const metrics = slotData.data
  if (!metrics) return null
  if (Array.isArray(metrics) && metrics.length > 0) {
    return metrics[metrics.length - 1].value ?? null
  }
  return null
}

function slotColor(slot) {
  return slot.options?.color || props.options?.color || '#4CAF50'
}

function formatValue(value, slot) {
  if (value === null || value === undefined) return '—'

  const decimals = slot.options?.decimals ?? props.options?.decimals ?? 1
  let formatted = Number(value).toFixed(decimals)

  if (slot.options?.prefix) {
    formatted = slot.options.prefix + formatted
  }
  if (slot.options?.suffix) {
    formatted = formatted + slot.options.suffix
  } else if (props.options?.suffix) {
    formatted = formatted + props.options.suffix
  }

  return formatted
}
</script>

<style scoped>
.number-widget {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
}

.value {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
}
</style>

<!-- Widget metadata - defines available slots -->
<script>
export const widgetDefinition = {
  type: 'number',
  label: 'Number',
  defaultSize: { w: 4, h: 4 },
  slotDefinitions: [
    {
      id: 'number',
      label: 'Number',
      required: true,
      allowMultiple: false,
      defaultOptions: {
        decimals: 1,
        suffix: '',
        color: '#4CAF50'
      }
    }
  ]
}
</script>
