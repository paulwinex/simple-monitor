<template>
  <BaseWidget :title="title" :show-header="showHeader">
    <template #content>
      <div class="chart-widget">
        <div v-if="loading" class="text-center">
          <q-spinner size="2em" color="primary" />
        </div>
        <div v-else-if="error" class="text-center text-negative">
          {{ error }}
        </div>
        <div v-else class="chart-container">
          <canvas ref="chartRef"></canvas>
        </div>
      </div>
    </template>
  </BaseWidget>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { Chart, registerables } from 'chart.js'
import BaseWidget from './BaseWidget.vue'
import type { WidgetSlot } from 'src/components/models'

Chart.register(...registerables)

export interface ChartDataPoint {
  timestamp: number
  value: number
}

export interface ChartWidgetOptions {
  timeRange?: '1h' | '6h' | '24h' | '7d'
  showLegend?: boolean
  smooth?: boolean
  colors?: string[]
  fill?: boolean
}

const props = defineProps<{
  title?: string
  showHeader?: boolean
  slots?: WidgetSlot[]
  loading?: boolean
  error?: string | null
  options?: ChartWidgetOptions
}>()

const chartRef = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const validSlots = computed(() => {
  return (props.slots || []).filter(s => s.sensor && s.data)
})

function createChart() {
  if (!chartRef.value) return

  const ctx = chartRef.value.getContext('2d')
  if (!ctx) return

  const defaultColors = ['#2196F3', '#4CAF50', '#FF5722', '#9C27B0', '#FF9800']
  const colors = props.options?.colors || defaultColors

  const datasets = validSlots.value.map((slot, index) => {
    const color = slot.options?.color || colors[index % colors.length]
    const data = getSlotData(slot)

    return {
      label: slot.label || slot.sensor?.name || 'Value',
      data: data.map(d => d.value),
      borderColor: color,
      backgroundColor: props.options?.fill ? color + '20' : 'transparent',
      tension: props.options?.smooth ? 0.4 : 0,
      fill: props.options?.fill ?? false,
      pointRadius: 2,
      pointHoverRadius: 4
    }
  })

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: getLabels(),
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: props.options?.showLegend ?? true
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false
          },
          ticks: {
            maxTicksLimit: 6,
            maxRotation: 0
          }
        },
        y: {
          display: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  })
}

function updateChart() {
  if (!chart) return

  chart.data.labels = getLabels()
  
  validSlots.value.forEach((slot, index) => {
    if (chart && chart.data.datasets[index]) {
      chart.data.datasets[index].data = getSlotData(slot)
      chart.data.datasets[index].label = slot.label || slot.sensor?.name || 'Value'
    }
  })

  // Remove extra datasets if slots were removed
  chart.data.datasets = chart.data.datasets.slice(0, validSlots.value.length)
  
  chart.update('none')
}

function getLabels(): string[] {
  if (validSlots.value.length === 0) return []
  const firstSlot = validSlots.value[0]
  const data = getSlotData(firstSlot)
  return data.map(d => formatTimestamp(d.timestamp))
}

function getSlotData(slot: WidgetSlot): ChartDataPoint[] {
  const data = slot.data
  if (!data) return []
  if (Array.isArray(data)) {
    return data.map(d => ({ timestamp: d.timestamp, value: d.value }))
  }
  if (data.data && Array.isArray(data.data)) {
    return data.data.map((d: any) => ({ timestamp: d.timestamp, value: d.value }))
  }
  return []
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const timeRange = props.options?.timeRange || '24h'

  if (timeRange === '7d') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

watch(() => props.slots, () => {
  if (chart) {
    updateChart()
  } else if (!props.loading) {
    createChart()
  }
}, { deep: true })

onMounted(() => {
  if (!props.loading && validSlots.value.length > 0) {
    createChart()
  }
})

onBeforeUnmount(() => {
  if (chart) {
    chart.destroy()
    chart = null
  }
})
</script>

<style scoped>
.chart-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-container {
  flex: 1;
  min-height: 0;
  position: relative;
}
</style>

<!-- Widget metadata - defines available slots -->
<script lang="ts">
import type { WidgetSlotDefinition } from 'src/components/models'

export const widgetDefinition = {
  type: 'chart',
  label: 'Chart',
  defaultSize: { w: 6, h: 6 },
  slotDefinitions: [
    {
      id: 'chart',
      label: 'Chart Data',
      required: true,
      allowMultiple: true,
      defaultOptions: {
        timeRange: '1h',
        showLegend: false,
        smooth: true,
        fill: true
      }
    }
  ] as WidgetSlotDefinition[]
}
</script>
