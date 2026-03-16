<template>
  <div class="multi-chart-edit-dialog">
    <!-- Common Options -->
    <div class="text-subtitle2 q-mb-sm">Common Options</div>

    <!-- Time Range -->
    <q-select
      v-model="localOptions.timeRange"
      label="Time Range"
      :options="['1m', '5m', '15m', '30m', '1h', '6h', '12h', '24h', '7d']"
      outlined
      dense
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Smooth Lines -->
    <q-toggle
      v-model="localOptions.smooth"
      label="Smooth Lines"
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Fill Area -->
    <q-toggle
      v-model="localOptions.fill"
      label="Fill Area"
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Show Points -->
    <q-toggle
      v-model="localOptions.showPoints"
      label="Show Points"
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Show Legend -->
    <q-toggle
      v-model="localOptions.showLegend"
      label="Show Legend"
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Legend Position (only visible if legend is enabled) -->
    <q-select
      v-if="localOptions.showLegend"
      v-model="localOptions.legendPosition"
      label="Legend Position"
      :options="['top', 'bottom', 'left', 'right']"
      outlined
      dense
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Show X Axis -->
    <q-toggle
      v-model="localOptions.showXAxis"
      label="Show X Axis"
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Show Y Axis -->
    <q-toggle
      v-model="localOptions.showYAxis"
      label="Show Y Axis"
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Show Grid -->
    <q-toggle
      v-model="localOptions.showGrid"
      label="Show Grid"
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Show Axis Values -->
    <q-toggle
      v-model="localOptions.showAxisValues"
      label="Show Axis Values"
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Y-Axis Min -->
    <q-input
      v-model.number="localOptions.yAxisMin"
      label="Y-Axis Min (empty = auto)"
      type="number"
      outlined
      dense
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Y-Axis Max -->
    <q-input
      v-model.number="localOptions.yAxisMax"
      label="Y-Axis Max (empty = auto)"
      type="number"
      outlined
      dense
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Individual Chart Colors -->
    <div class="text-subtitle2 q-mt-md q-mb-sm">Chart Colors</div>

    <div v-for="slot in widgetSlots" :key="slot.id" class="row items-center q-mb-sm">
      <div class="col-6">
        <span class="text-caption">{{ slot.label }}</span>
      </div>
      <div class="col-6">
        <q-input
          v-model="slotColorMap[slot.id]"
          dense
          @update:model-value="emitColorUpdate(slot.id)"
        >
          <template #append>
            <q-btn round dense flat icon="colorize" size="sm">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-color
                  v-model="slotColorMap[slot.id]"
                  @update:model-value="emitColorUpdate(slot.id)"
                />
              </q-popup-proxy>
            </q-btn>
          </template>
        </q-input>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  widget: Object,
  widgetOptions: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:widget-options', 'update:widget'])

// Local copy of options with defaults
const localOptions = ref({
  timeRange: '1h',
  showLegend: true,
  legendPosition: 'top',
  smooth: false,
  fill: false,
  showPoints: false,
  showXAxis: false,
  showYAxis: false,
  showGrid: false,
  showAxisValues: false,
  yAxisMin: undefined,
  yAxisMax: undefined,
  ...props.widgetOptions
})

// Create a map of slot colors from widget slots
const slotColorMap = ref({})

// Initialize slotColorMap from widget slots
watch(() => props.widget?.slots, (newSlots) => {
  if (newSlots) {
    const colorMap = {}
    for (const slot of newSlots) {
      colorMap[slot.id] = slot.options?.color || '#2196F3'
    }
    slotColorMap.value = colorMap
  }
}, { immediate: true, deep: true })

// Get widget slots with labels and sensor info
const widgetSlots = computed(() => {
  if (!props.widget?.slots) return []
  return props.widget.slots.map(slot => ({
    id: slot.id,
    label: slot.sensor?.name ? `${slot.label} (${slot.sensor.name})` : slot.label,
    hasSensor: !!slot.sensor?.name
  }))
})

// Watch for external changes
watch(() => props.widgetOptions, (newOptions) => {
  localOptions.value = {
    timeRange: '1h',
    showLegend: true,
    legendPosition: 'top',
    smooth: false,
    fill: false,
    showPoints: false,
    showXAxis: false,
    showYAxis: false,
    showGrid: false,
    showAxisValues: false,
    yAxisMin: undefined,
    yAxisMax: undefined,
    ...newOptions
  }
}, { deep: true, immediate: true })

// Emit changes to parent
function emitUpdate() {
  emit('update:widget-options', { ...localOptions.value })
}

// Emit color update for a specific slot
function emitColorUpdate(slotId) {
  const color = slotColorMap.value[slotId]
  const updatedSlots = props.widget.slots.map(slot => {
    if (slot.id === slotId) {
      return {
        ...slot,
        options: {
          ...slot.options,
          color: color
        }
      }
    }
    return slot
  })
  emit('update:widget', {
    ...props.widget,
    slots: updatedSlots
  })
}
</script>

<style scoped>
.multi-chart-edit-dialog {
  border-top: 1px solid #e0e0e0;
  padding-top: 16px;
}
</style>
