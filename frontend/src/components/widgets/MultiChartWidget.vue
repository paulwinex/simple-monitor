<template>
  <BaseWidget
    :title="title"
    :label-enabled="options?.labelEnabled ?? false"
    :label-text="options?.labelText ?? ''"
    :label-font-size="options?.labelFontSize ?? 14"
    :label-vertical-align="options?.labelVerticalAlign ?? 'bottom'"
    :label-horizontal-align="options?.labelHorizontalAlign ?? 'right'"
    :label-padding="options?.labelPadding ?? 8"
    :label-color="options?.labelColor ?? '#ffffff'"
    :show-header="showHeader"
  >
    <template #content>
      <div class="multi-chart-widget">
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

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useDashboardStore } from 'stores/dashboard'
import BaseWidget from './BaseWidget.vue'

Chart.register(...registerables)

let resizeObserver = null

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

// Force reactivity by watching the entire widgets array
const widgetsVersion = ref(0)

watch(() => dashboardStore.widgets, () => {
  widgetsVersion.value++
}, { deep: true })

// Get widget data directly from store with proper reactivity
const getWidgetData = () => {
  if (!props.widgetId) return null

  // Access widgetsVersion to trigger re-computation when widgets change
  widgetsVersion.value

  // Find widget in root widgets
  let widget = dashboardStore.widgets.find(w => w.id === props.widgetId)

  // If not found, search in gridContainer children
  if (!widget) {
    for (const w of dashboardStore.widgets) {
      if (w.type === 'gridContainer' && w.children) {
        widget = w.children.find(c => c.id === props.widgetId)
        if (widget) break
      }
    }
  }

  return widget
}

// Reactive slot data - computed from store
const reactiveSlots = computed(() => {
  if (!props.slots || props.slots.length === 0) return []

  const widget = getWidgetData()
  if (!widget || !widget.slots) {
    // Return slots without data if widget not found
    return props.slots.map(s => ({ ...s, data: null }))
  }

  // Merge slot config with data from store
  return props.slots.map(slotConfig => {
    const storeSlot = widget.slots.find(s => s.id === slotConfig.id)
    return {
      ...slotConfig,
      data: storeSlot?.data || null
    }
  })
})

const chartRef = ref(null)
let chart = null
const defaultColors = ['#2196F3', '#4CAF50', '#FF5722', '#9C27B0', '#FF9800']

const validSlots = computed(() => {
  return reactiveSlots.value.filter(s => s.sensor && s.data)
})

// Get device name for legend label
function getDeviceName(slot) {
  if (!slot.deviceId || !dashboardStore.hosts) return slot.sensor?.name || 'Unknown'
  
  // Search through all hosts to find the device
  for (const host of dashboardStore.hosts) {
    if (host.devices) {
      const device = host.devices.find(d => d.name === slot.deviceId)
      if (device) {
        return device.label || device.name
      }
    }
  }
  return slot.deviceId
}

// Get legend label in format: deviceName/metricName
function getLegendLabel(slot) {
  const deviceName = getDeviceName(slot)
  const metricName = slot.sensor?.name || 'Unknown'
  return `${deviceName}/${metricName}`
}

// Watch for slot data changes - update chart when data arrives
watch(
  () => reactiveSlots.value.map(s => s.data),
  (newData) => {
    // Check if any slot has data
    const hasData = newData.some(d => d !== null && d !== undefined)

    if (hasData && !chart) {
      // Create chart on next tick to ensure DOM is ready
      setTimeout(() => {
        if (!chart && validSlots.value.length > 0 && chartRef.value) {
          createChart()
        }
      }, 50)
    } else if (chart && hasData) {
      // Check if chart canvas is still valid
      if (!chartRef.value) {
        // Canvas was removed, destroy old chart
        chart.destroy()
        chart = null
        return
      }
      // Update chart without animation for smooth data updates
      updateChart(false)
    }
  },
  { deep: true }
)

function createChart() {
  if (!chartRef.value) return

  const ctx = chartRef.value.getContext('2d')
  if (!ctx) return

  const colors = props.options?.colors || defaultColors

  const datasets = validSlots.value.map((slot, index) => {
    const data = getSlotData(slot)
    const showPoints = props.options?.showPoints ?? false
    // Use slot's individual color, or fall back to default colors
    const color = slot.options?.color || colors[index % colors.length]

    return {
      label: getLegendLabel(slot),
      data: data.map(d => d.value),
      borderColor: color,
      backgroundColor: props.options?.fill ? color + '20' : 'transparent',
      tension: props.options?.smooth ? 0.4 : 0,
      fill: props.options?.fill ?? false,
      pointRadius: showPoints ? 3 : 0,
      pointHoverRadius: showPoints ? 5 : 0,
      pointBackgroundColor: color,
      pointBorderColor: '#fff',
      pointBorderWidth: 1
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
          display: props.options?.showLegend ?? false,
          position: props.options?.legendPosition || 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          display: props.options?.showXAxis ?? false,
          grid: {
            display: props.options?.showGrid ?? false
          },
          ticks: {
            display: props.options?.showAxisValues ?? false,
            maxTicksLimit: 6,
            maxRotation: 0
          }
        },
        y: {
          display: props.options?.showYAxis ?? false,
          grid: {
            display: props.options?.showGrid ?? false,
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            display: props.options?.showAxisValues ?? false
          },
          min: props.options?.yAxisMin ?? undefined,
          max: props.options?.yAxisMax ?? undefined
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

function updateChart(animate = true) {
  if (!chart || !chartRef.value) return

  const colors = props.options?.colors || defaultColors

  const newDatasets = validSlots.value.map((slot, index) => {
    const data = getSlotData(slot)
    const showPoints = props.options?.showPoints ?? false
    // Use slot's individual color, or fall back to default colors
    const color = slot.options?.color || colors[index % colors.length]

    return {
      label: getLegendLabel(slot),
      data: data.map(d => d.value),
      borderColor: color,
      backgroundColor: props.options?.fill ? color + '20' : 'transparent',
      tension: props.options?.smooth ? 0.4 : 0,
      fill: props.options?.fill ?? false,
      pointRadius: showPoints ? 3 : 0,
      pointHoverRadius: showPoints ? 5 : 0,
      pointBackgroundColor: color,
      pointBorderColor: '#fff',
      pointBorderWidth: 1
    }
  })

  // Update chart data
  chart.data.labels = getLabels()
  chart.data.datasets = newDatasets

  // Update chart options
  chart.options.plugins.legend.display = props.options?.showLegend ?? false
  chart.options.plugins.legend.position = props.options?.legendPosition || 'top'
  chart.options.plugins.tooltip.mode = 'index'
  chart.options.plugins.tooltip.intersect = false

  chart.options.scales.x.display = props.options?.showXAxis ?? false
  chart.options.scales.x.grid.display = props.options?.showGrid ?? false
  chart.options.scales.x.ticks.display = props.options?.showAxisValues ?? false
  chart.options.scales.x.ticks.maxTicksLimit = 6
  chart.options.scales.x.ticks.maxRotation = 0

  chart.options.scales.y.display = props.options?.showYAxis ?? false
  chart.options.scales.y.grid.display = props.options?.showGrid ?? false
  chart.options.scales.y.grid.color = 'rgba(0, 0, 0, 0.1)'
  chart.options.scales.y.ticks.display = props.options?.showAxisValues ?? false

  chart.options.interaction.mode = 'nearest'
  chart.options.interaction.axis = 'x'
  chart.options.interaction.intersect = false

  // Update with or without animation
  chart.update(animate ? 'default' : 'none')
}

function getLabels() {
  if (validSlots.value.length === 0) return []
  const firstSlot = validSlots.value[0]
  const data = getSlotData(firstSlot)
  return data.map(d => formatTimestamp(d.timestamp))
}

function getSlotData(slot) {
  const slotData = slot.data
  if (!slotData) return []

  // slot.data is a wrapper object with data array inside
  if (slotData.data && Array.isArray(slotData.data)) {
    return slotData.data.map(d => ({ timestamp: d.timestamp, value: d.value }))
  }

  // Fallback: if slotData itself is an array
  if (Array.isArray(slotData)) {
    return slotData.map(d => ({ timestamp: d.timestamp, value: d.value }))
  }

  return []
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1000)
  const timeRange = props.options?.timeRange || '24h'

  if (timeRange === '7d') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

watch(() => props.slots, () => {
  if (chart) {
    updateChart(false)
  }
}, { deep: true })

// Watch for options changes (legend, timeRange, etc.)
watch(() => props.options, () => {
  if (chart) {
    updateChart(false)
  }
}, { deep: true })

// Watch for hosts changes to update legend labels
watch(() => dashboardStore.hosts, () => {
  if (chart) {
    updateChart(false)
  }
}, { deep: true })

onMounted(() => {
  // Set up ResizeObserver to handle container size changes
  if (chartRef.value?.parentElement) {
    resizeObserver = new ResizeObserver(() => {
      if (chart) {
        // Chart.js automatically handles resize when canvas size changes
        // We just need to ensure the chart is aware of the new size
        chart.resize()
      }
    })
    resizeObserver.observe(chartRef.value.parentElement)
  }
  
  // Chart will be created by the watcher when data arrives
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (chart) {
    chart.destroy()
    chart = null
  }
})
</script>

<style scoped>
.multi-chart-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-container {
  flex: 1;
  min-height: 0;
  position: relative;
  width: 100%;
  height: 100%;
}

.chart-container canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>

<!-- Widget metadata - defines available slots -->
<script>
export const widgetDefinition = {
  type: 'multiChart',
  label: 'Multi Chart',
  defaultSize: { w: 8, h: 6 },
  slotDefinitions: [
    {
      id: 'chart1',
      label: 'Chart 1',
      required: true,
      allowMultiple: false,
      defaultOptions: {
        color: '#2196F3'
      }
    },
    {
      id: 'chart2',
      label: 'Chart 2',
      required: false,
      allowMultiple: false,
      defaultOptions: {
        color: '#4CAF50'
      }
    },
    {
      id: 'chart3',
      label: 'Chart 3',
      required: false,
      allowMultiple: false,
      defaultOptions: {
        color: '#FF5722'
      }
    },
    {
      id: 'chart4',
      label: 'Chart 4',
      required: false,
      allowMultiple: false,
      defaultOptions: {
        color: '#9C27B0'
      }
    },
    {
      id: 'chart5',
      label: 'Chart 5',
      required: false,
      allowMultiple: false,
      defaultOptions: {
        color: '#FF9800'
      }
    }
  ]
}
</script>
