<template>
  <BaseWidget
    :widget="widget"
    :is-editing="isEditing"
    :data="data"
    :loading="loading"
    :error="error"
    icon="pie_chart"
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
import type { WidgetConfig, MetricOut, PieWidgetOptions } from '../../types'

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
const options = computed<PieWidgetOptions>(() => ({
  showLegend: true,
  colors: undefined,
  ...(props.widget.options || {}),
}))

// Use polling composable
const { data, loading, error, refresh } = useWidgetPolling({
  widget: props.widget,
  enabled: true,
})

// Default color palette
const defaultColors = [
  '#5470C6',
  '#91CC75',
  '#FAC858',
  '#EE6666',
  '#73C0DE',
  '#3BA272',
  '#FC8452',
  '#9A60B4',
  '#EA7CCC',
]

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

  // For pie chart, we show proportions of multiple sensors
  const chartData = widget.sensors.map((sensor, index) => {
    const metric = dataArray.find((m) => true) || dataArray[index]
    return {
      name: sensor.name,
      value: metric?.value || 0,
    }
  })

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: options.value.showLegend
      ? {
          orient: 'vertical',
          left: 'left',
          top: 'middle',
        }
      : undefined,
    series: [
      {
        type: 'pie',
        radius: '60%',
        data: chartData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          formatter: '{b}: {d}%',
        },
        itemStyle: {
          color: (params: any) => {
            const colors = options.value.colors || defaultColors
            return colors[params.dataIndex % colors.length]
          },
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
