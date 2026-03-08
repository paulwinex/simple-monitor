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

const isSyncing = ref(false)

const colorsString = computed({
  get: () => localOptions.value.colors?.join(', ') || '',
  set: (val: string) => {
    localOptions.value.colors = val.split(',').map(c => c.trim()).filter(c => c)
  }
})

// Emit changes to parent (only if not syncing from parent)
watch(localOptions, (newVal) => {
  if (!isSyncing.value) {
    emit('update:modelValue', { ...newVal })
  }
}, { deep: true, flush: 'post' })

// Sync with parent changes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    const hasChanged = 
      localOptions.value.timeRange !== newVal.timeRange ||
      localOptions.value.showLegend !== newVal.showLegend ||
      localOptions.value.smooth !== newVal.smooth ||
      localOptions.value.fill !== newVal.fill ||
      JSON.stringify(localOptions.value.colors) !== JSON.stringify(newVal.colors)
    
    if (hasChanged) {
      isSyncing.value = true
      localOptions.value = {
        timeRange: newVal.timeRange ?? '1h',
        showLegend: newVal.showLegend ?? false,
        smooth: newVal.smooth ?? true,
        fill: newVal.fill ?? true,
        colors: newVal.colors ?? ['#2196F3']
      }
      isSyncing.value = false
    }
  }
})
</script>
