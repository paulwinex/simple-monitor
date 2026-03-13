<template>
  <div class="widget-options">
    <div class="text-subtitle2 q-mb-sm">Grid Container Options</div>
    <q-input
      v-model.number="localOptions.colNum"
      label="Number of Columns"
      type="number"
      :min="6"
      :max="48"
      outlined
      dense
      hint="Default is 12. Use 24 for finer control."
      @update:model-value="emitUpdate"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  widget: Object,
  widgetOptions: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:widget-options'])

// Local copy of options with defaults
const localOptions = ref({
  colNum: 12,
  ...props.widgetOptions
})

// Watch for external changes
watch(() => props.widgetOptions, (newOptions) => {
  localOptions.value = {
    colNum: 12,
    ...newOptions
  }
}, { deep: true, immediate: true })

// Emit changes to parent
function emitUpdate() {
  emit('update:widget-options', { ...localOptions.value })
}
</script>

<style scoped>
.widget-options {
  border-top: 1px solid #e0e0e0;
  padding-top: 16px;
}
</style>
