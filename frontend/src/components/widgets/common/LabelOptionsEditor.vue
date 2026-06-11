<template>
  <div class="widget-label-options">
    <div class="text-subtitle2 q-mb-sm">Label Options</div>

    <!-- Label Enabled Toggle -->
    <q-toggle
      v-model="localOptions.labelEnabled"
      label="Enable Label"
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Label Text (only visible when enabled) -->
    <q-input
      v-if="localOptions.labelEnabled"
      v-model="localOptions.labelText"
      label="Label Text"
      outlined
      dense
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Font Size (only visible when enabled) -->
    <div v-if="localOptions.labelEnabled" class="q-mb-sm">
      <div class="text-caption text-grey-7 q-mb-xs">Font Size: {{ localOptions.labelFontSize }}px</div>
      <q-slider
        v-model="localOptions.labelFontSize"
        :min="10"
        :max="48"
        :step="1"
        label
        label-always
        color="primary"
        markers
        @update:model-value="emitUpdate"
      />
    </div>

    <!-- Vertical Alignment (only visible when enabled) -->
    <div v-if="localOptions.labelEnabled" class="q-mb-sm">
      <div class="text-caption text-grey-7 q-mb-xs">Vertical Align</div>
      <q-btn-toggle
        v-model="localOptions.labelVerticalAlign"
        toggle-color="primary"
        :options="[
          { label: 'Top', value: 'top' },
          { label: 'Center', value: 'center' },
          { label: 'Bottom', value: 'bottom' }
        ]"
        unelevated
        @update:model-value="emitUpdate"
      />
    </div>

    <!-- Horizontal Alignment (only visible when enabled) -->
    <div v-if="localOptions.labelEnabled" class="q-mb-sm">
      <div class="text-caption text-grey-7 q-mb-xs">Horizontal Align</div>
      <q-btn-toggle
        v-model="localOptions.labelHorizontalAlign"
        toggle-color="primary"
        :options="[
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' }
        ]"
        unelevated
        @update:model-value="emitUpdate"
      />
    </div>

    <!-- Padding (only visible when enabled) -->
    <q-input
      v-if="localOptions.labelEnabled"
      v-model.number="localOptions.labelPadding"
      label="Padding (px)"
      type="number"
      :min="0"
      :max="50"
      outlined
      dense
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Text Color (only visible when enabled) -->
    <q-input
      v-if="localOptions.labelEnabled"
      v-model="localOptions.labelColor"
      label="Text Color"
      outlined
      dense
      @update:model-value="emitUpdate"
    >
      <template #append>
        <q-btn round dense flat icon="colorize">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-color v-model="localOptions.labelColor" @update:model-value="emitUpdate" />
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

// Default label options
const defaultLabelOptions = {
  labelEnabled: false,
  labelText: '',
  labelFontSize: 14,
  labelVerticalAlign: 'bottom',
  labelHorizontalAlign: 'right',
  labelPadding: 8,
  labelColor: '#ffffff'
}

// Local copy of options - merge with all widget options
const localOptions = ref({
  ...defaultLabelOptions,
  ...props.widgetOptions
})

// Watch for external changes
watch(() => props.widgetOptions, (newOptions) => {
  localOptions.value = {
    ...defaultLabelOptions,
    ...newOptions
  }
}, { deep: true, immediate: true })

// Emit changes to parent
function emitUpdate() {
  emit('update:widget-options', { ...localOptions.value })
}
</script>

<style scoped>
.widget-label-options {
  border-top: 1px solid #e0e0e0;
  padding-top: 16px;
  margin-top: 16px;
  display: flex;
  flex-direction: column;
}
</style>
