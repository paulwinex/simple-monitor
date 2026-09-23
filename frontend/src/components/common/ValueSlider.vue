<template>
  <div class="value-slider row no-wrap items-center q-gap-sm">
    <q-input
      :model-value="inputText"
      type="text"
      :suffix="suffix || null"
      dense

      class="value-slider__input q-mr-sm"
      @update:model-value="onInput"
      @blur="commit"
      @keyup.enter="commit"
    />
    <q-slider
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      snap
      class="value-slider__track"
      @update:model-value="onSlider"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  suffix: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const inputText = ref(String(props.modelValue))

watch(
  () => props.modelValue,
  (value) => {
    inputText.value = String(value)
  }
)

function onInput(value) {
  inputText.value = value
}

function commit() {
  const parsed = parseFloat(inputText.value)
  const clamped = Number.isFinite(parsed)
    ? Math.max(props.min, Math.min(props.max, parsed))
    : props.min
  emit('update:modelValue', clamped)
}

function onSlider(value) {
  emit('update:modelValue', value)
}
</script>

<style scoped>
.value-slider {
  width: 100%;
  min-width: 220px;
}

.value-slider__input {
  width: 72px;
  flex-shrink: 0;
}

.value-slider__track {
  flex: 1 1 auto;
}
</style>
