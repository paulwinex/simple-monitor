<template>
  <div class="paint-field">
    <!-- Mode: the Paint union is a gradient, a colour, or raw CSS. -->
    <q-btn-toggle
      :model-value="mode"
      :options="modeOptions"
      unelevated
      toggle-color="primary"
      color="grey-3"
      text-color="grey-8"
      no-caps
      dense
      class="paint-field__modes"
      @update:model-value="onModeChange"
    />

    <!-- Solid -->
    <div v-if="mode === 'solid'" class="row items-center q-gutter-sm">
      <q-input
        :model-value="solidColor"
        dense
        outlined
        class="paint-field__color"
        @update:model-value="onSolidChange"
      >
        <template #prepend>
          <q-icon name="colorize" class="cursor-pointer" style="font-size: 20px">
            <q-popup-proxy transition-show="scale" transition-hide="scale">
              <q-color :model-value="solidColor" no-header-tabs default-view="palette" @update:model-value="onSolidChange" />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <ColorSwatch :value="solidColor" />
    </div>

    <!-- Raw CSS escape hatch -->
    <div v-else-if="mode === 'raw'" class="column q-gutter-sm">
      <q-input
        :model-value="rawCss"
        dense
        outlined
        label="CSS colour value"
        hint="Hex, a named colour, or a colour function such as var() or color-mix(). A gradient belongs in Gradient mode; the server rejects anything else."
        @update:model-value="onRawChange"
      />
      <div class="paint-field__preview" :style="{ background: rawCss || 'transparent' }" />
    </div>

    <!-- Gradient -->
    <div v-else class="column q-gutter-sm">
      <div class="row items-center q-gutter-sm">
        <q-select
          :model-value="gradient.type"
          :options="gradientTypeOptions"
          emit-value
          map-options
          dense
          outlined
          class="col"
          label="Type"
          @update:model-value="onTypeChange"
        />
        <q-input
          v-if="gradient.type === 'linear'"
          :model-value="String(gradient.angle ?? 90)"
          type="number"
          dense
          outlined
          class="col"
          label="Angle"
          hint="deg, 0 = to top"
          @update:model-value="onAngleChange"
        />
      </div>

      <div class="paint-field__bar" :style="{ background: previewCss }" />

      <div v-for="(stop, index) in gradient.stops" :key="index" class="row items-center q-gutter-sm">
        <q-icon name="colorize" class="cursor-pointer">
          <q-popup-proxy transition-show="scale" transition-hide="scale">
            <q-color
              :model-value="stop.color"
              no-header-tabs
              default-view="palette"
              @update:model-value="(value) => onStopChange(index, 'color', value)"
            />
          </q-popup-proxy>
        </q-icon>
        <q-input
          :model-value="stop.color"
          dense
          outlined
          class="col"
          @update:model-value="(value) => onStopChange(index, 'color', value)"
        />
        <q-input
          :model-value="String(stop.offset)"
          type="number"
          dense
          outlined
          class="col-3"
          suffix="%"
          @update:model-value="(value) => onStopChange(index, 'offset', value)"
        />
        <ColorSwatch :value="stop.color" />
        <q-btn
          flat
          round
          dense
          icon="delete"
          color="grey-6"
          :disable="gradient.stops.length <= MIN_STOPS"
          @click="removeStop(index)"
        >
          <q-tooltip>Remove stop</q-tooltip>
        </q-btn>
      </div>

      <q-btn
        flat
        dense
        no-caps
        icon="add"
        color="primary"
        label="Add stop"
        :disable="gradient.stops.length >= MAX_STOPS"
        @click="addStop"
      />
      <div class="text-caption text-grey-6">
        {{ MIN_STOPS }}–{{ MAX_STOPS }} stops. Offsets are 0–100.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  GRADIENT_TYPES,
  MAX_GRADIENT_STOPS,
  MIN_GRADIENT_STOPS,
  isGradient,
  paintToCss
} from 'src/utils/themes'
import ColorSwatch from './ColorSwatch.vue'

const props = defineProps({
  /** Paint value: a CSS colour string, or a gradient object. */
  modelValue: { type: [String, Object], required: true }
})

const emit = defineEmits(['update:modelValue'])

const MIN_STOPS = MIN_GRADIENT_STOPS
const MAX_STOPS = MAX_GRADIENT_STOPS

const modeOptions = [
  { label: 'Solid', value: 'solid' },
  { label: 'Gradient', value: 'gradient' },
  { label: 'Raw CSS', value: 'raw' }
]

const gradientTypeOptions = GRADIENT_TYPES.map((value) => ({ label: value, value }))

/** An explicit mode pick. */
const modeChoice = ref(null)

/**
 * Solid | Gradient | Raw CSS.
 *
 * The value alone cannot say which mode it is in: every non-empty string looks
 * like a solid colour, so without the remembered pick the toggle would snap back
 * the moment the user picks another mode, and a cleared colour field would jump
 * to Raw CSS. The pick is dropped when it stops fitting the value, which is what
 * a theme swap from outside looks like.
 */
const mode = computed(() => {
  const kind = isGradient(props.modelValue) ? 'gradient' : 'string'
  if (modeChoice.value === 'gradient' && kind === 'gradient') return 'gradient'
  if (modeChoice.value && kind === 'string') return modeChoice.value
  return isPlainColor(props.modelValue) ? 'solid' : 'raw'
})

const solidColor = computed(() => (typeof props.modelValue === 'string' ? props.modelValue : ''))
const rawCss = computed(() => (typeof props.modelValue === 'string' ? props.modelValue : ''))

const gradient = computed(() =>
  isGradient(props.modelValue) && Array.isArray(props.modelValue.stops)
    ? props.modelValue
    : { type: 'linear', angle: 90, stops: [{ color: '#ffffff', offset: 0 }, { color: '#cccccc', offset: 100 }] }
)

const previewCss = computed(() => paintToCss(gradient.value))

function isPlainColor(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function onModeChange(next) {
  modeChoice.value = next
  if (next === 'gradient') {
    emit('update:modelValue', {
      type: 'linear',
      angle: 90,
      stops: [
        { color: solidColor.value || '#ffffff', offset: 0 },
        { color: '#cccccc', offset: 100 }
      ]
    })
  } else if (next === 'solid') {
    const fallback = isGradient(props.modelValue) ? gradient.value.stops[0]?.color : rawCss.value
    emit('update:modelValue', fallback || '#ffffff')
  } else if (next === 'raw') {
    // A gradient has no raw text yet, so the value it stands for is the honest
    // starting point for an arbitrary CSS background.
    emit('update:modelValue', rawCss.value || paintToCss(props.modelValue))
  }
}

function onSolidChange(value) {
  modeChoice.value = 'solid'
  emit('update:modelValue', value)
}

function onRawChange(value) {
  modeChoice.value = 'raw'
  emit('update:modelValue', value)
}

function onTypeChange(type) {
  // Radial gradients have no angle; the backend rejects one that is present.
  const next = { ...gradient.value, type }
  if (type === 'radial') delete next.angle
  else if (next.angle == null) next.angle = 90
  emit('update:modelValue', next)
}

function onAngleChange(value) {
  const angle = Math.max(0, Math.min(360, Number(value) || 0))
  emit('update:modelValue', { ...gradient.value, angle })
}

function onStopChange(index, key, value) {
  const stops = gradient.value.stops.map((stop, i) => {
    if (i !== index) return stop
    if (key === 'offset') {
      const offset = Math.max(0, Math.min(100, Number(value) || 0))
      return { ...stop, offset }
    }
    return { ...stop, color: value }
  })
  emit('update:modelValue', { ...gradient.value, stops })
}

function addStop() {
  const stops = [...gradient.value.stops]
  if (stops.length >= MAX_STOPS) return
  const last = stops[stops.length - 1]
  stops.push({ color: last?.color || '#ffffff', offset: 100 })
  emit('update:modelValue', { ...gradient.value, stops })
}

function removeStop(index) {
  const stops = gradient.value.stops.filter((_, i) => i !== index)
  if (stops.length < MIN_STOPS) return
  emit('update:modelValue', { ...gradient.value, stops })
}
</script>

<style scoped>
.paint-field__modes {
  margin-bottom: 8px;
}

.paint-field__color {
  width: 100%;
  min-width: 0;
}

.paint-field__preview,
.paint-field__bar {
  height: 28px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  /* Checkerboard, so alpha in a colour is visible instead of guessed. */
  background-image:
    linear-gradient(45deg, rgba(0, 0, 0, 0.08) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(0, 0, 0, 0.08) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, 0.08) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, 0.08) 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0;
}
</style>
