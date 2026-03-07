<template>
  <BaseWidget
    :widget="widget"
    :is-editing="isEditing"
    :data="data"
    :loading="loading"
    :error="error"
    icon="show_chart"
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
import type { WidgetConfig, MetricOut, ChartWidgetOptions } from '../../types'

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
const options = computed<ChartWidgetOptions>(() => ({
  timeRange: '1h',
  showLegend: true,
  smooth: true,
  ...(props.widget.options || {}),
}))

// Use polling composable
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
  if (!chart || !data.value) return

  const metricData = data.value as MetricOut[]

  // Prepare data for ECharts
  const timestamps = metricData.map((m) => new Date(m.timestamp * 1000).toLocaleTimeString())
  const values = metricData.map((m) => m.value)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const point = params[0]
        return `${point.name}<br/>${point.seriesName}: ${point.value.toFixed(2)}`
      },
    },
    grid: {
      left: '10%',
      right: '5%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: timestamps,
      axisLabel: {
        rotate: 45,
        interval: 'auto',
      },
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: props.widget.title,
        type: 'line',
        data: values,
        smooth: options.value.smooth,
        showSymbol: false,
        areaStyle: {
          opacity: 0.2,
        },
        lineStyle: {
          width: 2,
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

// Dispose chart on unmount
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
