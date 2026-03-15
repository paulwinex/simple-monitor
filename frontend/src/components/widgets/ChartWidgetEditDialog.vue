<template>
  <div class="widget-options-column">
    <div class="text-subtitle2 q-mb-sm">Chart Options</div>

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

    <!-- Chart Color -->
    <q-input
      v-model="localOptions.chartColor"
      label="Color"
      outlined
      dense
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    >
      <template #append>
        <q-btn round dense flat icon="colorize">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-color v-model="localOptions.chartColor" @update:model-value="emitUpdate" />
          </q-popup-proxy>
        </q-btn>
      </template>
    </q-input>

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
      @update:model-value="emitUpdate"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  widget: Object,
  widgetOptions: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:widget-options'])

// Local copy of options with defaults
const localOptions = ref({
  timeRange: '1h',
  chartColor: '#2196F3',
  showLegend: false,
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

// Watch for external changes
watch(() => props.widgetOptions, (newOptions) => {
  localOptions.value = {
    timeRange: '1h',
    chartColor: '#2196F3',
    showLegend: false,
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
</script>

<style scoped>
.widget-options-column {
  border-top: 1px solid #e0e0e0;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
}
</style>
