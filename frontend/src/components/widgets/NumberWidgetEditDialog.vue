<template>
  <div class="widget-options-column">
    <div class="text-subtitle2 q-mb-sm">Number Options</div>

    <!-- Decimal Places -->
    <q-input
      v-model.number="localOptions.decimals"
      label="Decimal Places"
      type="number"
      :min="0"
      :max="5"
      outlined
      dense
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Suffix -->
    <q-input
      v-model="localOptions.suffix"
      label="Suffix"
      outlined
      dense
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Font Size Slider -->
    <div class="q-mb-sm">
      <div class="text-caption text-grey-7 q-mb-xs">Font Size: {{ localOptions.fontSize }}%</div>
      <q-slider
        v-model="localOptions.fontSize"
        :min="20"
        :max="100"
        :step="5"
        label
        label-always
        color="primary"
        markers
        @update:model-value="emitUpdate"
      />
    </div>

    <!-- Color -->
    <q-input
      v-model="localOptions.color"
      label="Color"
      outlined
      dense
      @update:model-value="emitUpdate"
    >
      <template #append>
        <q-btn round dense flat icon="colorize">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-color v-model="localOptions.color" @update:model-value="emitUpdate" />
          </q-popup-proxy>
        </q-btn>
      </template>
    </q-input>
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

// Local copy of options
const localOptions = ref({
  decimals: 1,
  suffix: '',
  color: '#4CAF50',
  fontSize: 50,
  ...props.widgetOptions
})

// Watch for external changes
watch(() => props.widgetOptions, (newOptions) => {
  localOptions.value = {
    decimals: 1,
    suffix: '',
    color: '#4CAF50',
    fontSize: 50,
    ...newOptions
  }
}, { deep: true, immediate: true })

// Emit changes to parent
function emitUpdate() {
  emit('update:widget-options', { ...localOptions.value })
}
</script>

<style scoped>
.widget-options-column {
  border-top: 1px solid #e0e0e0;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
}
</style>
