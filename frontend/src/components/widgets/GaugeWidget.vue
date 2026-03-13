<template>
  <BaseWidget :title="title" :show-header="showHeader">
    <template #content>
      <div class="gauge-widget">
        <div v-if="loading" class="text-center">
          <q-spinner size="2em" color="primary" />
        </div>
        <div v-else-if="error" class="text-center text-negative">
          ERR: {{ error }}
        </div>
        <div v-else class="gauge-container">
          <svg
            :width="svgSize"
            :height="svgSize"
            :viewBox="`0 0 ${svgSize} ${svgSize}`"
            xmlns="http://www.w3.org/2000/svg"
            class="gauge-svg"
          >
            <!-- Background arc (gray) - full arc always visible -->
            <path
              :d="backgroundArcPath"
              fill="none"
              :stroke="options?.backgroundColor || '#424242'"
              :stroke-width="strokeWidth"
              stroke-linecap="round"
            />

            <!-- Value arc with color - shows filled portion -->
            <path
              :d="valueArcPath"
              fill="none"
              stroke="#4CAF50"
              :stroke-width="strokeWidth"
              stroke-linecap="round"
              class="value-arc"
            />

            <!-- Center value text -->
            <text
              :x="center"
              :y="center"
              text-anchor="middle"
              dominant-baseline="middle"
              :fill="options?.textColor || '#ffffff'"
              :font-size="textFontSize"
              font-weight="bold"
              class="value-text"
            >
              {{ displayValue }}
            </text>
          </svg>
        </div>
      </div>
    </template>
  </BaseWidget>
</template>

<script setup>
import { computed } from 'vue'
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

// SVG sizing
const svgSize = 200
const center = svgSize / 2
const radius = 80

// Gauge configuration
const strokeWidth = computed(() => props.options?.strokeWidth ?? 12)
const arcAngle = computed(() => Math.min(360, Math.max(0, props.options?.arcAngle ?? 270)))
const rangeMin = computed(() => props.options?.rangeMin ?? 0)
const rangeMax = computed(() => props.options?.rangeMax ?? 100)

// Get current value from slot data
const currentValue = computed(() => {
  // TEMP: Hardcoded value for testing
  return 75
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

// Value percentage (0 to 1)
const valuePercentage = computed(() => {
  const value = currentValue.value
  const clampedValue = Math.max(rangeMin.value, Math.min(rangeMax.value, value))
  return (clampedValue - rangeMin.value) / (rangeMax.value - rangeMin.value)
})

// Calculate start and end points for the arc
// For 270° arc with gap at bottom:
// Start: 135° (bottom-left)
// End: 45° (bottom-right, going clockwise through top)
const startAngle = 135  // degrees
const endAngle = 45     // degrees

// Convert angle to radians and calculate coordinates
function toRad(deg) {
  return (deg * Math.PI) / 180
}

const startX = center + radius * Math.cos(toRad(startAngle))
const startY = center + radius * Math.sin(toRad(startAngle))
const endX = center + radius * Math.cos(toRad(endAngle))
const endY = center + radius * Math.sin(toRad(endAngle))

// Background arc path (full 270° arc)
const backgroundArcPath = `M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${radius} ${radius} 0 1 1 ${endX.toFixed(1)} ${endY.toFixed(1)}`

// Value arc: calculate end point based on current value
const valueArcPath = computed(() => {
  // Calculate the end angle based on value percentage
  // Start at 135° and go clockwise by (arcAngle * valuePercentage)
  const currentEndAngle = startAngle - (arcAngle.value * valuePercentage.value)
  
  const valueEndX = center + radius * Math.cos(toRad(currentEndAngle))
  const valueEndY = center + radius * Math.sin(toRad(currentEndAngle))
  
  // For value arc, we need to determine large-arc-flag based on the angle
  const angleDiff = Math.abs(startAngle - currentEndAngle)
  const largeArcFlag = angleDiff > 180 ? '1' : '0'
  
  return `M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${valueEndX.toFixed(1)} ${valueEndY.toFixed(1)}`
})

// Text font size
const textFontSize = computed(() => {
  return Math.min(28, radius * 0.4)
})
</script>

<style scoped>
.gauge-widget {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gauge-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.gauge-svg {
  max-width: 100%;
  max-height: 100%;
}

.value-arc {
  transition: stroke-dashoffset 0.3s ease-out;
}

.value-text {
  transition: all 0.3s ease;
}
</style>

<!-- Widget metadata - defines available slots -->
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
        strokeWidth: 12,
        arcAngle: 270,
        rangeMin: 0,
        rangeMax: 100,
        gradientColors: ['#4CAF50', '#8BC34A', '#FFC107', '#F44336'],
        showArrow: false,
        arrowColor: '#ffffff',
        textColor: '#ffffff',
        backgroundColor: '#424242',
        decimals: 1,
        suffix: '',
        prefix: ''
      }
    }
  ]
}
</script>
