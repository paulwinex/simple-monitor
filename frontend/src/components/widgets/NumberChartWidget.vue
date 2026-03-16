<template>
  <BaseWidget :title="title" :show-header="showHeader">
    <template #content>
      <div class="dual-view-widget" ref="widgetRef">
        <div v-if="loading" class="text-center">
          <q-spinner size="2em" color="primary" />
        </div>
        <div v-else-if="error" class="text-center text-negative">
          {{ error }}
        </div>
        <div v-else class="dual-view-container" :style="containerStyle">
          <!-- Left: Number Display (always square) -->
          <div class="number-section" :style="numberSectionStyle">
            <div class="number-value" :style="numberValueStyle">
              {{ displayNumberValue }}
            </div>
          </div>

          <!-- Right: Chart Display (dynamic width) -->
          <div class="chart-section">
            <div class="chart-container">
              <canvas ref="chartRef"></canvas>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseWidget>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useDashboardStore } from 'stores/dashboard'
import BaseWidget from './BaseWidget.vue'

Chart.register(...registerables)

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
const widgetRef = ref(null)
const chartRef = ref(null)
let chart = null

// Force reactivity
const widgetsVersion = ref(0)
watch(() => dashboardStore.widgets, () => {
  widgetsVersion.value++
}, { deep: true })

// Track widget dimensions for reactive sizing
const widgetDimensions = ref({ width: 0, height: 0 })

// Resize observer to track widget size changes
let resizeObserver = null
onMounted(() => {
  if (widgetRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        widgetDimensions.value = {
          width: entry.contentRect.width,
          height: entry.contentRect.height
        }
      }
    })
    resizeObserver.observe(widgetRef.value)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// Get widget data from store
const getWidgetData = () => {
  if (!props.widgetId) return null
  widgetsVersion.value
  let widget = dashboardStore.widgets.find(w => w.id === props.widgetId)
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

// Reactive slot data - same pattern as NumberWidget
const reactiveSlots = computed(() => {
  if (!props.widgetId || !props.slots) return []
  const widget = getWidgetData()
  if (!widget || !widget.slots) return props.slots || []
  return props.slots.map(slotConfig => {
    const storeSlot = widget.slots.find(s => s.id === slotConfig.id)
    return {
      ...slotConfig,
      data: storeSlot?.data || null
    }
  })
})

// Get number slot
const numberSlot = computed(() => {
  return reactiveSlots.value.find(s => s.id === 'number')
})

// Get chart slot
const chartSlot = computed(() => {
  return reactiveSlots.value.find(s => s.id === 'chart')
})

// Get number value
const displayNumberValue = computed(() => {
  const slot = numberSlot.value
  if (!slot?.data) return 'NO DATA'
  const metrics = slot.data.data
  if (Array.isArray(metrics) && metrics.length > 0) {
    const value = metrics[metrics.length - 1].value
    return formatNumberValue(value, slot)
  }
  return 'EMPTY'
})

// Format number value based on options
function formatNumberValue(value, slot) {
  if (value === null || value === undefined) return '—'

  const numValue = Number(value)
  let decimals = 0

  // Get decimals from widget options first (user settings), then slot options (defaults)
  if (props.options && props.options.numberDecimals != null) {
    decimals = Number(props.options.numberDecimals)
  } else if (slot?.options && slot.options.decimals != null) {
    decimals = Number(slot.options.decimals)
  }
  
  let formatted
  if (decimals === 0) {
    formatted = Math.round(numValue).toString()
  } else {
    formatted = numValue.toFixed(decimals)
  }
  
  // Add prefix/suffix - widget options first, then slot options
  if (props.options?.numberPrefix) {
    formatted = props.options.numberPrefix + formatted
  } else if (slot?.options?.prefix) {
    formatted = slot.options.prefix + formatted
  }
  
  if (props.options?.numberSuffix) {
    formatted = formatted + props.options.numberSuffix
  } else if (slot?.options?.suffix) {
    formatted = formatted + slot.options.suffix
  }
  
  return formatted
}

// Get chart data
const chartData = computed(() => {
  const slot = chartSlot.value
  if (!slot?.data?.data) return []
  return slot.data.data
})

// Calculate number section size (always square, based on widget height)
const numberSectionSize = computed(() => {
  // Use widget height minus padding for square size
  const availableHeight = widgetDimensions.value.height - 16
  return Math.max(50, availableHeight) // Minimum size of 50px
})

const numberSectionStyle = computed(() => {
  const size = numberSectionSize.value
  return {
    width: `${size}px`,
    height: `${size}px`,
    flexShrink: '0'
  }
})

const numberValueStyle = computed(() => {
  const size = numberSectionSize.value
  const fontSizePercent = props.options?.numberFontSize ?? 50
  const fontSize = size * (fontSizePercent / 100)
  return {
    fontSize: `${fontSize}px`,
    color: props.options?.numberColor || '#4CAF50',
    fontWeight: '700'
  }
})

// Computed styles for padding/gap
const gapStyle = computed(() => {
  const gap = props.options?.gap ?? props.options?.padding ?? 16
  return `${gap}px`
})

const paddingStyle = computed(() => {
  const padding = props.options?.contentPadding ?? props.options?.padding ?? 8
  return `${padding}px`
})

const containerStyle = computed(() => ({
  gap: gapStyle.value,
  padding: paddingStyle.value
}))

// Create chart
function createChart() {
  if (!chartRef.value || chartData.value.length === 0) return
  
  // Check if chart already exists and destroy it
  if (chart) {
    chart.destroy()
    chart = null
  }
  
  const ctx = chartRef.value.getContext('2d')
  if (!ctx) return

  const color = props.options?.chartColor || '#2196F3'
  const data = chartData.value
  
  // Get chart options from widget options
  const showPoints = props.options?.showPoints ?? false
  const smooth = props.options?.smooth ?? false
  const fill = props.options?.fill ?? false
  const showXAxis = props.options?.showXAxis ?? false
  const showYAxis = props.options?.showYAxis ?? false
  const showGrid = props.options?.showGrid ?? false
  const showAxisValues = props.options?.showAxisValues ?? false
  const showLegend = props.options?.showLegend ?? false

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => {
        const date = new Date(d.timestamp * 1000)
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }),
      datasets: [{
        label: 'Value',
        data: data.map(d => d.value),
        borderColor: color,
        backgroundColor: fill ? color + '20' : 'transparent',
        tension: smooth ? 0.4 : 0,
        fill: fill,
        pointRadius: showPoints ? 3 : 0,
        pointHoverRadius: showPoints ? 5 : 0,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: showLegend },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          display: showXAxis,
          grid: {
            display: showGrid
          },
          ticks: {
            display: showAxisValues,
            maxTicksLimit: 6,
            maxRotation: 0
          }
        },
        y: {
          display: showYAxis,
          grid: {
            display: showGrid,
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            display: showAxisValues
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

// Watch for chart data changes
watch(() => chartData.value, () => {
  // Destroy existing chart first
  if (chart) {
    chart.destroy()
    chart = null
  }
  // Create chart on next tick
  nextTick(() => {
    if (chartData.value.length > 0 && chartRef.value && !chart) {
      createChart()
    }
  })
}, { deep: true })

// Watch for options changes to update chart appearance
watch(() => props.options, () => {
  // Destroy existing chart first
  if (chart) {
    chart.destroy()
    chart = null
  }
  // Recreate chart on next tick
  nextTick(() => {
    if (chartData.value.length > 0 && chartRef.value && !chart) {
      createChart()
    }
  })
}, { deep: true })

onMounted(() => {
  // ResizeObserver is already set up, chart will be created by watcher
})

onBeforeUnmount(() => {
  if (chart) {
    chart.destroy()
    chart = null
  }
})
</script>

<style scoped>
.dual-view-widget {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dual-view-container {
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
}

.number-section {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  flex-shrink: 0;
}

.number-value {
  text-align: center;
  line-height: 1;
}

.chart-section {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.chart-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>

<!-- Widget metadata -->
<script>
export const widgetDefinition = {
  type: 'numberChart',
  label: 'Number + Chart',
  defaultSize: { w: 8, h: 6 },
  slotDefinitions: [
    {
      id: 'number',
      label: 'Number',
      required: true,
      allowMultiple: false,
      defaultOptions: {
        color: '#4CAF50'
      }
    },
    {
      id: 'chart',
      label: 'Chart',
      required: true,
      allowMultiple: false,
      defaultOptions: {
        timeRange: '1h',
        chartColor: '#2196F3',
        yAxisMin: null,
        yAxisMax: null
      }
    }
  ]
}
</script>
