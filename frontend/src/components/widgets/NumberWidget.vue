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
import BaseWidget from './BaseWidget.vue'

const props = defineProps({
  title: String,
  showHeader: Boolean,
  slots: Array,
  loading: Boolean,
  error: String,
  options: Object
})

const validSlots = computed(() => {
  return (props.slots || []).filter(s => s.sensor && s.data)
})

function slotValue(slot) {
  const data = slot.data
  if (!data) return null
  if (Array.isArray(data) && data.length > 0) {
    return data[data.length - 1].value ?? null
  }
  if (data.value !== undefined) {
    return data.value
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
