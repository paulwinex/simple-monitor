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
      <div class="number-widget" ref="widgetRef">
        <div v-if="loading" class="text-center">
          <q-spinner size="2em" color="primary" />
        </div>
        <div v-else-if="error" class="text-center text-negative">
          {{ error }}
        </div>
        <div v-else class="text-center">
          <div
            v-for="slot in validSlots"
            :key="slot.id"
            class="value"
            :style="valueStyle(slot)"
          >
            {{ formatValue(slotValue(slot), slot) }}
          </div>
        </div>
      </div>
    </template>
  </BaseWidget>
</template>

<script setup>
import { computed, watch, ref, onMounted, onUpdated, onBeforeUnmount, nextTick } from 'vue'
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
const widgetRef = ref(null)
const valueFontSize = ref('2.5rem')

// Calculate font size based on widget dimensions
const calculateFontSize = () => {
  if (!widgetRef.value) return

  const rect = widgetRef.value.getBoundingClientRect()
  const minDimension = Math.min(rect.width, rect.height)
  const fontSizePercent = props.options?.fontSize ?? 50
  const fontSizePx = (minDimension * fontSizePercent) / 100
  valueFontSize.value = `${fontSizePx}px`
}

// Force reactivity by watching the entire widgets array
const widgetsVersion = ref(0)

watch(() => dashboardStore.widgets, () => {
  widgetsVersion.value++
}, { deep: true })

// Recalculate font size when options change (including real-time slider updates)
watch(() => [props.options?.fontSize, props.options?.color], () => {
  nextTick(() => {
    calculateFontSize()
  })
}, { immediate: true })

onMounted(() => {
  calculateFontSize()

  // Also recalculate on window resize
  window.addEventListener('resize', calculateFontSize)
})

onUpdated(() => {
  calculateFontSize()
})

// Cleanup
onBeforeUnmount(() => {
  window.removeEventListener('resize', calculateFontSize)
})

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

// Get reactive slot data from store - watch the entire widgets array for reactivity
const reactiveSlots = computed(() => {
  if (!props.widgetId || !props.slots) return []

  const widget = getWidgetData()

  if (!widget || !widget.slots) return props.slots || []

  // Merge slot config with reactive data from store
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

function slotValue(slot) {
  const slotData = slot.data
  if (!slotData) return null

  // slot.data is a wrapper object with data array inside
  const metrics = slotData.data
  if (!metrics) return null
  if (Array.isArray(metrics) && metrics.length > 0) {
    return metrics[metrics.length - 1].value ?? null
  }
  return null
}

function valueStyle(slot) {
  return {
    color: props.options?.color || slot.options?.color || '#4CAF50',
    fontSize: valueFontSize.value
  }
}

function formatValue(value, slot) {
  if (value === null || value === undefined) return '—'

  const numValue = Number(value)
  let decimals = 1

  // Check widget options first (user settings), then slot options (defaults)
  if (props.options && props.options.decimals != null) {
    decimals = Number(props.options.decimals)
  } else if (slot.options && slot.options.decimals != null) {
    decimals = Number(slot.options.decimals)
  }

  let formatted
  if (decimals === 0) {
    // Format as integer - use Math.round to ensure no decimal
    formatted = Math.round(numValue).toString()
  } else {
    // Format with specified decimal places
    formatted = numValue.toFixed(decimals)
  }
  if (slot.options?.prefix) {
    formatted = slot.options.prefix + formatted
  }
  if (slot.options?.suffix) {
    formatted = formatted + slot.options.suffix
  } else if (props.options?.suffix) {
    formatted = formatted + props.options.suffix
  }
  return formatted
}
</script>

<style scoped>
.number-widget {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
}

.value {
  font-weight: 700;
  line-height: 1;
  transition: font-size 0.2s ease;
}
</style>

<!-- Widget metadata - defines available slots -->
<script>
export const widgetDefinition = {
  type: 'number',
  label: 'Number',
  defaultSize: { w: 4, h: 4 },
  slotDefinitions: [
    {
      id: 'number',
      label: 'Number',
      required: true,
      allowMultiple: false,
      defaultOptions: {
        decimals: 0,
        suffix: '',
        color: '#4CAF50',
        fontSize: 50
      }
    }
  ]
}
</script>
