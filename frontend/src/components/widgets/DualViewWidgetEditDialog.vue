<template>
  <div class="dual-view-edit-dialog">
    <q-tabs
      v-model="activeTab"
      class="text-grey"
      active-color="primary"
      indicator-color="primary"
      align="left"
      narrow-indicator
    >
      <q-tab
        name="number"
        label="Number"
        icon="format_list_numbered"
      />
      <q-tab
        name="chart"
        label="Chart"
        icon="insert_chart"
      />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated>
      <!-- Number Tab -->
      <q-tab-panel name="number">
        <div class="text-subtitle2 q-mb-sm">Number Options</div>

        <!-- Decimal Places -->
        <q-input
          v-model.number="localOptions.numberDecimals"
          label="Decimal Places"
          type="number"
          :min="0"
          :max="5"
          outlined
          dense
          class="q-mb-sm"
          @update:model-value="emitUpdate"
        />

        <!-- Suffix -->
        <q-input
          v-model="localOptions.numberSuffix"
          label="Suffix"
          outlined
          dense
          class="q-mb-sm"
          @update:model-value="emitUpdate"
        />

        <!-- Prefix -->
        <q-input
          v-model="localOptions.numberPrefix"
          label="Prefix"
          outlined
          dense
          class="q-mb-sm"
          @update:model-value="emitUpdate"
        />

        <!-- Color -->
        <q-input
          v-model="localOptions.numberColor"
          label="Color"
          outlined
          dense
          @update:model-value="emitUpdate"
        >
          <template #append>
            <q-btn round dense flat icon="colorize">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-color v-model="localOptions.numberColor" @update:model-value="emitUpdate" />
              </q-popup-proxy>
            </q-btn>
          </template>
        </q-input>
      </q-tab-panel>

      <!-- Chart Tab -->
      <q-tab-panel name="chart">
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
      </q-tab-panel>
    </q-tab-panels>
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

const activeTab = ref('number')

// Local copy of options with defaults
const localOptions = ref({
  numberDecimals: 1,
  numberSuffix: '',
  numberPrefix: '',
  numberColor: '#4CAF50',
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
  ...props.widgetOptions
})

// Watch for external changes
watch(() => props.widgetOptions, (newOptions) => {
  localOptions.value = {
    numberDecimals: 1,
    numberSuffix: '',
    numberPrefix: '',
    numberColor: '#4CAF50',
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
    ...newOptions
  }
}, { deep: true, immediate: true })

// Emit changes to parent
function emitUpdate() {
  emit('update:widget-options', { ...localOptions.value })
}
</script>

<style scoped>
.dual-view-edit-dialog {
  border-top: 1px solid #e0e0e0;
  padding-top: 16px;
}
</style>
