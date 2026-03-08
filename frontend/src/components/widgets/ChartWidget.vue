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
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Chart, registerables } from 'chart.js'
import BaseWidget from './BaseWidget.vue'

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
  data?: ChartDataPoint[]
  loading?: boolean
  error?: string | null
  options?: ChartWidgetOptions
}>()

const chartRef = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

function createChart() {
  if (!chartRef.value) return
  
  const ctx = chartRef.value.getContext('2d')
  if (!ctx) return
  
  const colors = props.options?.colors || ['#4CAF50']
  
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: props.data?.map(d => formatTimestamp(d.timestamp)) || [],
      datasets: [{
        label: 'Value',
        data: props.data?.map(d => d.value) || [],
        borderColor: colors[0],
        backgroundColor: props.options?.fill ? colors[0] + '20' : 'transparent',
        tension: props.options?.smooth ? 0.4 : 0,
        fill: props.options?.fill ?? false,
        pointRadius: 2,
        pointHoverRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: props.options?.showLegend ?? false
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
  
  chart.data.labels = props.data?.map(d => formatTimestamp(d.timestamp)) || []
  chart.data.datasets[0].data = props.data?.map(d => d.value) || []
  chart.update('none')
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const timeRange = props.options?.timeRange || '24h'
  
  if (timeRange === '7d') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

watch(() => props.data, () => {
  if (chart) {
    updateChart()
  } else if (!props.loading) {
    createChart()
  }
}, { deep: true })

onMounted(() => {
  if (!props.loading && props.data) {
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
