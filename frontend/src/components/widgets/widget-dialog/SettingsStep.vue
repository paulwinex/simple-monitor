<template>
  <div class="q-pa-md">
    <div class="text-subtitle2 q-mb-md">Widget Settings</div>
    
    <q-input
      v-model="localTitle"
      label="Widget Title"
      outlined
      dense
      class="q-mb-md"
    />
    
    <div class="text-subtitle2 q-mb-sm">Widget Options</div>
    
    <!-- Number widget options -->
    <template v-if="widgetType === 'number'">
      <number-widget-options v-model="localOptions" />
    </template>
    
    <!-- Chart widget options -->
    <template v-else-if="widgetType === 'chart'">
      <chart-widget-options v-model="localOptions" />
    </template>
    
    <!-- GridContainer widget options -->
    <template v-else-if="widgetType === 'gridContainer'">
      <div class="text-caption text-grey-7">
        Grid Container has no specific options. Add child widgets using the + button.
      </div>
    </template>
    
    <!-- Default options for other types -->
    <template v-else>
      <div class="text-caption text-grey-7">
        No specific options for {{ widgetType }} widget
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import NumberWidgetOptions from './NumberWidgetOptions.vue'
import ChartWidgetOptions from './ChartWidgetOptions.vue'

const props = defineProps<{
  title: string
  options: Record<string, any>
  widgetType: string
}>()

const emit = defineEmits<{
  'update:title': [value: string]
  'update:options': [value: Record<string, any>]
}>()

const localTitle = ref(props.title)
const localOptions = ref<Record<string, any>>({ ...props.options })
const isSyncing = ref(false)

// Emit changes to parent (only if not syncing from parent)
watch(localTitle, (newVal) => {
  if (!isSyncing.value) {
    emit('update:title', newVal)
  }
})

watch(localOptions, (newVal) => {
  if (!isSyncing.value) {
    emit('update:options', JSON.parse(JSON.stringify(newVal)))
  }
}, { deep: true, flush: 'post' })

// Sync with parent changes (only if different)
watch(() => props.title, (newVal) => {
  if (newVal !== localTitle.value) {
    isSyncing.value = true
    localTitle.value = newVal
    isSyncing.value = false
  }
})

watch(() => props.options, (newVal) => {
  // Only update if values are different (shallow comparison)
  const currentKeys = Object.keys(localOptions.value)
  const newKeys = Object.keys(newVal)
  const hasChanged = currentKeys.length !== newKeys.length ||
    currentKeys.some(key => localOptions.value[key] !== newVal[key])

  if (hasChanged) {
    isSyncing.value = true
    localOptions.value = { ...newVal }
    isSyncing.value = false
  }
})
</script>
