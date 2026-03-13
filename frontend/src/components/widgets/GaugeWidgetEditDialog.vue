<template>
  <div class="widget-options-column">
    <div class="text-subtitle2 q-mb-sm">Gauge Options</div>

    <!-- Stroke Width -->
    <q-input
      v-model.number="localOptions.strokeWidth"
      label="Stroke Width"
      type="number"
      :min="5"
      :max="50"
      outlined
      dense
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Arc Angle -->
    <div class="q-mb-sm">
      <div class="text-caption text-grey-7 q-mb-xs">Arc Angle: {{ localOptions.arcAngle }}°</div>
      <q-slider
        v-model="localOptions.arcAngle"
        :min="90"
        :max="360"
        :step="10"
        label
        label-always
        color="primary"
        markers
        @update:model-value="emitUpdate"
      />
    </div>

    <!-- Range Min/Max -->
    <div class="row q-col-gutter-sm q-mb-sm">
      <div class="col-6">
        <q-input
          v-model.number="localOptions.rangeMin"
          label="Range Min"
          type="number"
          outlined
          dense
          @update:model-value="emitUpdate"
        />
      </div>
      <div class="col-6">
        <q-input
          v-model.number="localOptions.rangeMax"
          label="Range Max"
          type="number"
          outlined
          dense
          @update:model-value="emitUpdate"
        />
      </div>
    </div>

    <!-- Gradient Colors -->
    <div class="q-mb-sm">
      <div class="text-caption text-grey-7 q-mb-xs">Gradient Colors</div>
      <div class="row q-col-gutter-xs">
        <div
          v-for="(color, index) in localOptions.gradientColors"
          :key="index"
          class="col-3"
        >
          <q-input
            v-model="localOptions.gradientColors[index]"
            :label="`Color ${index + 1}`"
            outlined
            dense
            @update:model-value="emitUpdate"
          >
            <template #append>
              <q-btn round dense flat icon="colorize">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-color v-model="localOptions.gradientColors[index]" @update:model-value="emitUpdate" />
                </q-popup-proxy>
              </q-btn>
            </template>
          </q-input>
        </div>
      </div>
    </div>

    <!-- Display Mode: Arrow or Number -->
    <q-toggle
      v-model="localOptions.showArrow"
      label="Show Arrow (instead of number)"
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    />

    <!-- Arrow Color (if showArrow is true) -->
    <q-input
      v-if="localOptions.showArrow"
      v-model="localOptions.arrowColor"
      label="Arrow Color"
      outlined
      dense
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    >
      <template #append>
        <q-btn round dense flat icon="colorize">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-color v-model="localOptions.arrowColor" @update:model-value="emitUpdate" />
          </q-popup-proxy>
        </q-btn>
      </template>
    </q-input>

    <!-- Text Color (if showArrow is false) -->
    <q-input
      v-else
      v-model="localOptions.textColor"
      label="Text Color"
      outlined
      dense
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    >
      <template #append>
        <q-btn round dense flat icon="colorize">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-color v-model="localOptions.textColor" @update:model-value="emitUpdate" />
          </q-popup-proxy>
        </q-btn>
      </template>
    </q-input>

    <!-- Background Color -->
    <q-input
      v-model="localOptions.backgroundColor"
      label="Background Color"
      outlined
      dense
      class="q-mb-sm"
      @update:model-value="emitUpdate"
    >
      <template #append>
        <q-btn round dense flat icon="colorize">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-color v-model="localOptions.backgroundColor" @update:model-value="emitUpdate" />
          </q-popup-proxy>
        </q-btn>
      </template>
    </q-input>

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

    <!-- Prefix -->
    <q-input
      v-model="localOptions.prefix"
      label="Prefix"
      outlined
      dense
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

// Default options
const defaultOptions = {
  strokeWidth: 20,
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

// Local copy of options
const localOptions = ref({
  ...defaultOptions,
  ...props.widgetOptions
})

// Watch for external changes
watch(() => props.widgetOptions, (newOptions) => {
  localOptions.value = {
    ...defaultOptions,
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
