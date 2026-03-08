<template>
  <div class="q-gutter-y-md">
    <q-select
      v-model="localOptions.timeRange"
      :options="timeRangeOptions"
      label="Time Range"
      outlined
      dense
    />
    
    <q-toggle
      v-model="localOptions.showLegend"
      label="Show Legend"
    />
    
    <q-toggle
      v-model="localOptions.smooth"
      label="Smooth Lines"
    />
    
    <q-toggle
      v-model="localOptions.fill"
      label="Fill Area"
    />
    
    <q-input
      v-model="colorsString"
      label="Colors (comma-separated)"
      outlined
      dense
      hint="e.g., #4CAF50, #2196F3"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  modelValue: Record<string, any>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()

const timeRangeOptions = ['1h', '6h', '12h', '24h', '7d', '30d']

const localOptions = ref<Record<string, any>>({
  timeRange: props.modelValue?.timeRange ?? '1h',
  showLegend: props.modelValue?.showLegend ?? false,
  smooth: props.modelValue?.smooth ?? true,
  fill: props.modelValue?.fill ?? true,
  colors: props.modelValue?.colors ?? ['#2196F3']
})

const colorsString = computed({
  get: () => localOptions.value.colors?.join(', ') || '',
  set: (val: string) => {
    localOptions.value.colors = val.split(',').map(c => c.trim()).filter(c => c)
  }
})

watch(localOptions, (newVal) => {
  emit('update:modelValue', { ...newVal })
}, { deep: true })

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    localOptions.value = {
      timeRange: newVal.timeRange ?? '1h',
      showLegend: newVal.showLegend ?? false,
      smooth: newVal.smooth ?? true,
      fill: newVal.fill ?? true,
      colors: newVal.colors ?? ['#2196F3']
    }
  }
}, { deep: true })
</script>
