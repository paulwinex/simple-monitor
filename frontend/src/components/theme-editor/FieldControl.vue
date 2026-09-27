<template>
  <!-- Paint: a colour, a gradient, or raw CSS -->
  <PaintField
    v-if="field.type === 'paint'"
    :model-value="value"
    @update:model-value="emitChange"
  />

  <!-- Shadow: a group of sub-fields, so it gets its own control -->
  <ShadowField
    v-else-if="field.type === 'shadow'"
    :model-value="value"
    @update:model-value="emitChange"
  />

  <!-- Colour, with a swatch and the raw value (named colors, var(), ...) -->
  <div v-else-if="field.type === 'color'" class="row items-center q-gutter-sm no-wrap">
    <q-input
      :model-value="value"
      dense
      outlined
      class="field-control"
      @update:model-value="emitChange"
    >
      <template #prepend>
        <q-icon name="colorize" class="cursor-pointer" style="font-size: 20px">
          <q-popup-proxy transition-show="scale" transition-hide="scale">
            <q-color
              :model-value="value"
              no-header-tabs
              default-view="palette"
              format-model="hex"
              @update:model-value="emitChange"
            />
          </q-popup-proxy>
        </q-icon>
      </template>
    </q-input>
    <ColorSwatch :value="value" />
  </div>

  <!-- Enumerations, driven by the shared constants in utils/themes.js -->
  <q-select
    v-else-if="field.type === 'align' || field.type === 'borderStyle'"
    :model-value="value"
    :options="selectOptions"
    emit-value
    map-options
    dense
    outlined
    behavior="menu"
    class="field-control"
    @update:model-value="emitChange"
  />

  <q-select
    v-else-if="field.type === 'weight'"
    :model-value="Number(value)"
    :options="weightOptions"
    emit-value
    map-options
    dense
    outlined
    behavior="menu"
    class="field-control"
    @update:model-value="emitChange"
  />

  <!-- Height accepts 'auto' alongside a px length -->
  <div v-else-if="field.type === 'height'" class="row items-center q-gutter-sm no-wrap">
    <q-toggle :model-value="isAuto" dense label="auto" @update:model-value="onAutoToggle" />
    <q-input
      :model-value="isAuto ? '' : value"
      dense
      outlined
      class="field-control"
      :disable="isAuto"
      placeholder="e.g. 40px"
      @update:model-value="emitChange"
    />
  </div>

  <!-- Grid geometry: a bounded whole number, so a slider with a number beside it -->
  <div v-else-if="field.type === 'px'" class="row items-center q-gutter-sm no-wrap">
    <q-slider
      :model-value="sliderValue"
      :min="field.min"
      :max="field.max"
      :step="field.step || 1"
      dense
      color="primary"
      class="col"
      @update:model-value="emitChange"
    />
    <q-input
      :model-value="value"
      type="number"
      dense
      outlined
      class="field-control field-control--number"
      :min="field.min"
      :max="field.max"
      :step="field.step || 1"
      @update:model-value="onNumberChange"
    />
  </div>

  <div v-else-if="field.type === 'toggle'" class="row items-center no-wrap">
    <q-toggle
      :model-value="value === true"
      dense
      @update:model-value="(checked) => emitChange(checked === true)"
    />
  </div>

  <!-- Plain text: font stacks and px lengths -->
  <q-input
    v-else
    :model-value="value"
    dense
    outlined
    :placeholder="placeholder"
    class="field-control"
    @update:model-value="emitChange"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { BORDER_STYLES, FONT_WEIGHTS, HEADER_ALIGNMENTS, isCssLength } from 'src/utils/themes'
import PaintField from './PaintField.vue'
import ShadowField from './ShadowField.vue'
import ColorSwatch from './ColorSwatch.vue'

const props = defineProps({
  field: { type: Object, required: true },
  value: { type: [String, Number, Object], default: '' }
})

const emit = defineEmits(['update:modelValue'])

const selectOptions = computed(() => {
  if (props.field.type === 'borderStyle') return BORDER_STYLES.map((value) => ({ label: value, value }))
  return HEADER_ALIGNMENTS.map((value) => ({ label: value, value }))
})

const weightOptions = FONT_WEIGHTS.map((value) => ({ label: String(value), value }))

const isAuto = computed(() => String(props.value).trim().toLowerCase() === 'auto')

/** The last px height, so switching `auto` off restores it instead of a guess. */
const lastLength = ref('')
watch(
  () => props.value,
  (value) => {
    if (isCssLength(value)) lastLength.value = value
  },
  { immediate: true }
)

/**
 * A number for the slider. The document can hold null while a number field is
 * empty and a typed value can sit outside the declared range; the slider needs
 * a finite number inside its own bounds, and clamping here touches no document.
 */
const sliderValue = computed(() => {
  const parsed = Number(props.value)
  const value = Number.isFinite(parsed) ? parsed : Number(props.field.min ?? 0)
  return Math.min(props.field.max ?? value, Math.max(props.field.min ?? value, value))
})

const placeholder = computed(() => {
  if (props.field.type === 'fontFamily') return "Roboto, 'Segoe UI', sans-serif"
  if (props.field.type === 'lengthOrKeyword') return 'e.g. 0.5px or normal'
  return 'e.g. 8px'
})

function emitChange(value) {
  emit('update:modelValue', value)
}

/**
 * The number input hands over strings ('' while typing). Coerce here so the
 * document never sees '24' where the schema wants 24, and keep an emptied
 * field empty (null) instead of storing a zero the user never typed.
 */
function onNumberChange(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    emit('update:modelValue', null)
    return
  }
  const parsed = Math.round(Number(raw))
  emit('update:modelValue', Number.isNaN(parsed) ? null : parsed)
}

function onAutoToggle(enabled) {
  emit('update:modelValue', enabled ? 'auto' : lastLength.value || '40px')
}
</script>

<style scoped>
.field-control {
  width: 100%;
  min-width: 0;
}

.field-control--number {
  width: 84px;
  flex: 0 0 auto;
}
</style>
