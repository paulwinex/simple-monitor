<template>
  <BaseWidget
    :widget="widget"
    :is-editing="isEditing"
    :data="data"
    :loading="loading"
    :error="error"
    icon="analytics"
    @refresh="refresh"
    @edit="$emit('edit', $event)"
    @delete="$emit('delete', $event)"
  >
    <template #content="{ data }">
      <div class="number-display" :class="{ 'number-large': isLarge }">
        <span v-if="options.prefix" class="number-prefix">{{ options.prefix }}</span>
        <span :style="{ color: displayColor }">{{ formattedValue }}</span>
        <span v-if="options.suffix" class="number-suffix">{{ options.suffix }}</span>
      </div>
    </template>
  </BaseWidget>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseWidget from './BaseWidget.vue'
import { useWidgetPolling } from '../../composables/useWidgetPolling'
import type { WidgetConfig, MetricOut, NumberWidgetOptions } from '../../types'
import { formatNumber } from '../../utils'

const props = defineProps<{
  widget: WidgetConfig
  isEditing: boolean
}>()

const emit = defineEmits<{
  edit: [widget: WidgetConfig]
  delete: [widgetId: string]
}>()

// Parse options with defaults
const options = computed<NumberWidgetOptions>(() => ({
  prefix: '',
  suffix: '',
  decimals: 1,
  color: undefined,
  ...(props.widget.options || {}),
}))

const isLarge = computed(() => {
  return !options.value.prefix && !options.value.suffix
})

const displayColor = computed(() => options.value.color || 'inherit')

// Use polling composable
const { data, loading, error, refresh } = useWidgetPolling({
  widget: props.widget,
})

// Format the value
const formattedValue = computed(() => {
  if (!data.value) return '--'

  const metricData = data.value as MetricOut
  const value = metricData.value

  if (value === null || value === undefined) return '--'

  return formatNumber(value, options.value.decimals)
})
</script>

<style scoped lang="scss">
.number-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  height: 100%;
  flex-direction: column;

  span:first-child {
    font-size: 0.4em;
    margin-right: 0.1em;
  }

  span:last-child {
    font-size: 0.4em;
    margin-left: 0.1em;
  }
}
</style>
