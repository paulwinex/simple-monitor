<template>
  <BaseWidget
    :widget="widget"
    :is-editing="isEditing"
    :data="data"
    :loading="loading"
    :error="error"
    icon="bar_chart"
    @refresh="refresh"
    @edit="$emit('edit', $event)"
    @delete="$emit('delete', $event)"
  >
    <template #content>
      <div ref="chartContainer" class="chart-container"></div>
    </template>
  </BaseWidget>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import BaseWidget from './BaseWidget.vue'
import { useWidgetPolling } from '../../composables/useWidgetPolling'
import type { WidgetConfig, MetricOut, BarWidgetOptions } from '../../types'

const props = defineProps<{
  widget: WidgetConfig
  isEditing: boolean
}>()

const emit = defineEmits<{
  edit: [widget: WidgetConfig]
  delete: [widgetId: string]
}>()

const chartContainer = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

// Parse options with defaults
const options = computed<BarWidgetOptions>(() => ({
  orientation: 'vertical',
  showValues: true,
  showLegend: false,
  ...(props.widget.options || {}),
}))

// Use polling composable - fetch all sensors
const { data, loading, error, refresh } = useWidgetPolling({
  widget: props.widget,
  enabled: true,
})

// Initialize chart
function initChart() {
  if (!chartContainer.value) return

  chart = echarts.init(chartContainer.value)

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    chart?.resize()
  })
  resizeObserver.observe(chartContainer.value)
}

// Update chart data
function updateChart() {
  if (!chart) return

  const metricData = data.value as MetricOut[] | MetricOut | null
  if (!metricData) return

  const dataArray = Array.isArray(metricData) ? metricData : [metricData]

  // For bar widget, we show multiple sensors as bars
  const labels = widget.sensors.map((s) => s.name)
  const values = dataArray.map((m) => m.value)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const point = params[0]
        return `${point.name}: ${point.value.toFixed(2)}`
      },
    },
    grid: {
      left: '10%',
      right: '10%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: options.value.orientation === 'horizontal'
      ? {
          type: 'value',
          min: options.value.min,
          max: options.value.max,
        }
      : {
          type: 'category',
          data: labels,
          axisLabel: {
            rotate: 45,
          },
        },
    yAxis: options.value.orientation === 'horizontal'
      ? {
          type: 'category',
          data: labels,
        }
      : {
          type: 'value',
          min: options.value.min,
          max: options.value.max,
        },
    series: [
      {
        type: 'bar',
        data: options.value.orientation === 'horizontal' ? values : values,
        label: {
          show: options.value.showValues,
          position: 'top',
          formatter: '{c}',
        },
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  }

  chart.setOption(option)
}

// Watch for data changes
watch(
  data,
  () => {
    nextTick(() => {
      updateChart()
    })
  },
  { immediate: true }
)

// Watch for theme changes
watch(
  () => props.isEditing,
  () => {
    nextTick(() => {
      chart?.resize()
    })
  }
)

// Lifecycle
onMounted(() => {
  nextTick(() => {
    initChart()
    updateChart()
  })
})

// Cleanup
const cleanup = () => {
  if (chart) {
    chart.dispose()
    chart = null
  }
}

import { onUnmounted } from 'vue'
onUnmounted(cleanup)
</script>

<style scoped lang="scss">
.chart-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
}
</style>
