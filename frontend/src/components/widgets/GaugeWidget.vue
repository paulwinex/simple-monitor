<template>
  <BaseWidget :title="title" :show-header="showHeader">
    <template #content>
      <div ref="containerRef" class="gauge-widget">
        <div v-if="loading" class="text-center">
          <q-spinner size="2em" color="primary" />
        </div>
        <div v-else-if="error" class="text-center text-negative">
          ERR: {{ error }}
        </div>
        <div v-else class="gauge-container">
          <canvas
            ref="canvasRef"
            class="gauge-canvas"
          />
        </div>
      </div>
    </template>
  </BaseWidget>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useDashboardStore } from 'stores/dashboard'
import BaseWidget from './BaseWidget.vue'

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
const canvasRef = ref(null)
const containerRef = ref(null)

// Force reactivity
const widgetsVersion = ref(0)

watch(() => dashboardStore.widgets, () => {
  widgetsVersion.value++
}, { deep: true })

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

// Reactive slot data
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

const validSlots = computed(() => {
  return reactiveSlots.value.filter(s => s.sensor && s.data)
})

// Get current value from slot data
const currentValue = computed(() => {
  if (validSlots.value.length === 0) return 0

  const slotData = validSlots.value[0].data
  if (!slotData || !slotData.data || !Array.isArray(slotData.data)) return 0
  if (slotData.data.length === 0) return 0

  return slotData.data[slotData.data.length - 1].value ?? 0
})

// Display value with formatting
const displayValue = computed(() => {
  const value = currentValue.value
  const decimals = props.options?.decimals ?? 1
  const formatted = Number(value).toFixed(decimals)

  if (props.options?.suffix) {
    return `${formatted}${props.options.suffix}`
  }
  if (props.options?.prefix) {
    return `${props.options.prefix}${formatted}`
  }

  return formatted
})

// Gauge configuration
const strokeWidth = computed(() => props.options?.strokeWidth ?? 20)
const arcAngle = computed(() => Math.min(360, Math.max(30, props.options?.arcAngle ?? 270)))
const rangeMin = computed(() => props.options?.rangeMin ?? 0)
const rangeMax = computed(() => props.options?.rangeMax ?? 100)
const displayMode = computed(() => props.options?.displayMode ?? 'fill')
const gradientMode = computed(() => props.options?.gradientMode ?? 'smooth') // 'smooth' or 'sharp'
const scale = computed(() => Math.min(150, Math.max(10, props.options?.scale ?? 100))) // 10-150%

// Value percentage (0 to 1)
const valuePercentage = computed(() => {
  const value = currentValue.value
  const clampedValue = Math.max(rangeMin.value, Math.min(rangeMax.value, value))
  return (clampedValue - rangeMin.value) / (rangeMax.value - rangeMin.value)
})

// Needle color
const needleColor = computed(() => props.options?.needleColor ?? '#2c3e50')
const needleAxisColor = computed(() => props.options?.needleAxisColor ?? '#95a5a6')
const showValueText = computed(() => props.options?.showValue !== false)
const textColor = computed(() => props.options?.textColor ?? '#2c3e50')
const backgroundColor = computed(() => props.options?.backgroundColor ?? '#ebeef2')

// Canvas sizing
let containerSize = 0
let resizeObserver = null

const getContainerSize = () => {
  if (!containerRef.value) return 200
  const rect = containerRef.value.getBoundingClientRect()
  return Math.max(100, Math.min(rect.width, rect.height))
}

const setupCanvas = () => {
  if (!canvasRef.value || !containerRef.value) return

  const newSize = getContainerSize()
  if (newSize <= 0) return

  containerSize = newSize

  // Apply scale factor to canvas size
  const scaleFactor = scale.value / 100
  const scaledSize = newSize * scaleFactor

  const dpr = window.devicePixelRatio || 1
  const pixelSize = Math.floor(scaledSize * dpr)
  
  canvasRef.value.width = pixelSize
  canvasRef.value.height = pixelSize
  canvasRef.value.style.width = scaledSize + 'px'
  canvasRef.value.style.height = scaledSize + 'px'

  nextTick(() => {
    drawGauge()
  })
}

const drawGauge = () => {
  if (!canvasRef.value) return

  const ctx = canvasRef.value.getContext('2d')
  const size = canvasRef.value.width
  
  if (size <= 0) return

  const currentAngle = arcAngle.value
  
  // Calculate vertical offset based on arc angle
  // Smaller angles = more offset upward to reduce empty space at bottom
  // At 360°: no offset, at 30°: max offset
  const angleFactor = (360 - currentAngle) / 330 // 0 to 1
  const maxOffset = size * 0.25 // Maximum offset at 30°
  const verticalOffset = maxOffset * angleFactor

  const center = size / 2
  const padding = size * 0.12
  const radius = (size / 2) - padding

  ctx.clearRect(0, 0, size, size)

  const fill = valuePercentage.value * 100
  let totalAngleDeg = currentAngle

  if (totalAngleDeg >= 360) totalAngleDeg = 359.99

  const gapDeg = 360 - totalAngleDeg
  const startAngleDeg = 90 + (gapDeg / 2)
  const endAngleDeg = startAngleDeg + totalAngleDeg

  const startRad = (startAngleDeg * Math.PI) / 180
  const endRad = (endAngleDeg * Math.PI) / 180
  const progressRad = startRad + (endRad - startRad) * (fill / 100)

  const sw = Math.max(2, strokeWidth.value * (size / 200))
  ctx.lineCap = 'butt'
  ctx.lineWidth = sw

  if (displayMode.value === 'fill') {
    // Background arc
    ctx.beginPath()
    ctx.arc(center, center + verticalOffset, radius, startRad, endRad)
    ctx.strokeStyle = backgroundColor.value
    ctx.stroke()

    // Progress arc with gradient or sharp colors
    if (fill > 0) {
      ctx.beginPath()
      ctx.arc(center, center + verticalOffset, radius, startRad, progressRad)

      if (gradientMode.value === 'sharp') {
        // Sharp mode: draw segments with solid colors
        drawSharpGradient(ctx, center, center + verticalOffset, radius, startRad, progressRad, sw)
      } else {
        // Smooth mode: use conic gradient
        const gradient = ctx.createConicGradient(startRad, center, center + verticalOffset)
        const norm = totalAngleDeg / 360
        const rawColors = props.options?.gradientColors || [
          { color: '#2ecc71', position: 0 },
          { color: '#f1c40f', position: 0.5 },
          { color: '#e74c3c', position: 1 }
        ]

        // Handle both old format (array of colors) and new format (array of {color, position})
        const colors = rawColors.map((item, index) => {
          if (typeof item === 'string') {
            return { color: item, position: index / (rawColors.length - 1) }
          }
          // Validate color - must be a valid hex/rgb string starting with # or rgb/rgba
          let color = item.color
          if (typeof color !== 'string' || !color.startsWith('#')) {
            color = '#cccccc'
          }
          return {
            color: color,
            position: Math.max(0, Math.min(1, Number(item.position) || 0))
          }
        })

        colors.forEach(({ color, position }) => {
          gradient.addColorStop(position * norm, color)
        })

        ctx.strokeStyle = gradient
        ctx.stroke()
      }
    }

    // Value text - also shifted with the arc
    if (showValueText.value) {
      ctx.save()
      ctx.translate(center, center + verticalOffset)
      ctx.fillStyle = textColor.value
      ctx.font = `bold ${radius * 0.35}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(displayValue.value, 0, 0)
      ctx.restore()
    }
  } else {
    // Needle mode - full gradient
    ctx.beginPath()
    ctx.arc(center, center + verticalOffset, radius, startRad, endRad)

    if (gradientMode.value === 'sharp') {
      // Sharp mode: draw segments with solid colors
      drawSharpGradient(ctx, center, center + verticalOffset, radius, startRad, endRad, sw)
    } else {
      // Smooth mode: use conic gradient
      const gradient = ctx.createConicGradient(startRad, center, center + verticalOffset)
      const norm = totalAngleDeg / 360
      const rawColors = props.options?.gradientColors || [
        { color: '#2ecc71', position: 0 },
        { color: '#f1c40f', position: 0.5 },
        { color: '#e74c3c', position: 1 }
      ]

      // Handle both old format (array of colors) and new format (array of {color, position})
      const colors = rawColors.map((item, index) => {
        if (typeof item === 'string') {
          return { color: item, position: index / (rawColors.length - 1) }
        }
        // Validate color - must be a valid hex/rgb string starting with # or rgb/rgba
        let color = item.color
        if (typeof color !== 'string' || !color.startsWith('#')) {
          color = '#cccccc'
        }
        return {
          color: color,
          position: Math.max(0, Math.min(1, Number(item.position) || 0))
        }
      })

      colors.forEach(({ color, position }) => {
        gradient.addColorStop(position * norm, color)
      })

      ctx.strokeStyle = gradient
      ctx.stroke()
    }

    // Draw needle
    const needleRad = startRad + (endRad - startRad) * (fill / 100)
    drawNeedle(ctx, center, center + verticalOffset, radius, needleRad, sw)
  }
}

const drawSharpGradient = (ctx, cx, cy, radius, startRad, endRad, lineWidth) => {
  const rawColors = props.options?.gradientColors || [
    { color: '#2ecc71', position: 0 },
    { color: '#f1c40f', position: 0.5 },
    { color: '#e74c3c', position: 1 }
  ]

  // Handle both old format (array of colors) and new format (array of {color, position})
  let colors = rawColors.map((item, index) => {
    if (typeof item === 'string') {
      return { color: item, position: index / (rawColors.length - 1) }
    }
    // Validate color - must be a valid hex/rgb string starting with # or rgb/rgba
    let color = item.color
    if (typeof color !== 'string' || !color.startsWith('#')) {
      color = '#cccccc'
    }
    return {
      color: color,
      position: Math.max(0, Math.min(1, Number(item.position) || 0))
    }
  })

  // Sort colors by position
  colors = colors.sort((a, b) => a.position - b.position)

  // Draw each color segment
  for (let i = 0; i < colors.length - 1; i++) {
    const currentColor = colors[i]
    const nextColor = colors[i + 1]

    const segmentStartRad = startRad + (endRad - startRad) * currentColor.position
    const segmentEndRad = startRad + (endRad - startRad) * nextColor.position

    ctx.beginPath()
    ctx.arc(cx, cy, radius, segmentStartRad, segmentEndRad)
    ctx.strokeStyle = currentColor.color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'butt'
    ctx.stroke()
  }
}

const drawNeedle = (ctx, cx, cy, radius, angle, sw) => {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)

  ctx.beginPath()
  ctx.moveTo(0, -sw * 0.4)
  ctx.lineTo(radius - sw * 0.5, 0)
  ctx.lineTo(0, sw * 0.4)
  ctx.closePath()
  ctx.fillStyle = needleColor.value
  ctx.fill()

  ctx.beginPath()
  ctx.arc(0, 0, sw * 0.3, 0, Math.PI * 2)
  ctx.fillStyle = needleColor.value
  ctx.fill()

  ctx.beginPath()
  ctx.arc(0, 0, sw * 0.15, 0, Math.PI * 2)
  ctx.fillStyle = needleAxisColor.value
  ctx.fill()

  ctx.restore()
}

watch(
  [currentValue, arcAngle, strokeWidth, displayMode, gradientMode, backgroundColor, textColor, needleColor, needleAxisColor, () => props.options?.gradientColors],
  () => {
    nextTick(() => {
      drawGauge()
    })
  },
  { deep: true }
)

// Watch for scale changes - need to resize canvas
watch(
  scale,
  () => {
    nextTick(() => {
      setupCanvas()
    })
  },
  { immediate: false }
)

const setupResizeObserver = () => {
  if (resizeObserver) return

  resizeObserver = new ResizeObserver(() => {
    setupCanvas()
  })

  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
  }
}

onMounted(() => {
  nextTick(() => {
    setupCanvas()
    setupResizeObserver()
  })
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<style scoped>
.gauge-widget {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.gauge-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.gauge-canvas {
  display: block;
}
</style>

<!-- Widget metadata -->
<script>
export const widgetDefinition = {
  type: 'gauge',
  label: 'Gauge',
  defaultSize: { w: 4, h: 4 },
  slotDefinitions: [
    {
      id: 'gauge',
      label: 'Gauge Value',
      required: true,
      allowMultiple: false,
      defaultOptions: {
        strokeWidth: 20,
        arcAngle: 270,
        rangeMin: 0,
        rangeMax: 100,
        displayMode: 'fill',
        gradientMode: 'smooth', // 'smooth' or 'sharp'
        scale: 100,
        gradientAutoDistribute: true,
        gradientColors: [
          { color: '#2ecc71', position: 0 },
          { color: '#f1c40f', position: 0.5 },
          { color: '#e74c3c', position: 1 }
        ],
        showValue: true,
        textColor: '#2c3e50',
        backgroundColor: '#ebeef2',
        needleColor: '#2c3e50',
        needleAxisColor: '#95a5a6',
        decimals: 0,
        suffix: '',
        prefix: ''
      }
    }
  ]
}
</script>
