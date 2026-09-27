<template>
  <div class="shadow-field">
    <div class="row items-center q-gutter-sm">
      <div class="shadow-field__preview" :style="{ textShadow: preview }">Ag</div>
      <q-input
        :model-value="modelValue.color"
        dense
        outlined
        class="col"
        label="Colour"
        @update:model-value="(value) => emit('update:modelValue', { ...modelValue, color: value })"
      >
        <template #prepend>
          <q-icon name="colorize" class="cursor-pointer" style="font-size: 20px">
            <q-popup-proxy transition-show="scale" transition-hide="scale">
              <q-color
                :model-value="modelValue.color"
                no-header-tabs
                default-view="palette"
                @update:model-value="(value) => emit('update:modelValue', { ...modelValue, color: value })"
              />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
      <ColorSwatch :value="modelValue.color" />
    </div>

    <div class="row q-col-gutter-sm">
      <div v-for="part in PARTS" :key="part" class="col-3">
        <q-input
          :model-value="modelValue[part]"
          dense
          outlined
          :label="part.toUpperCase()"
          @update:model-value="(value) => onPart(part, value)"
        />
      </div>
    </div>

    <div class="row items-center q-gutter-sm">
      <q-slider
        :model-value="opacityPercent"
        :min="0"
        :max="100"
        :step="5"
        label
        class="col"
        @update:model-value="onOpacity"
      />
      <div class="shadow-field__opacity text-caption text-grey-7">{{ opacityPercent }}%</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { shadowToCss } from 'src/utils/themes'
import ColorSwatch from './ColorSwatch.vue'

const props = defineProps({
  modelValue: { type: Object, required: true }
})

const emit = defineEmits(['update:modelValue'])

const PARTS = ['x', 'y', 'blur', 'spread']

const opacityPercent = computed(() => Math.round((props.modelValue.opacity ?? 0) * 100))

const preview = computed(() => shadowToCss(props.modelValue))

function onPart(part, value) {
  emit('update:modelValue', { ...props.modelValue, [part]: value })
}

function onOpacity(value) {
  // The document stores 0..1; the slider speaks percent.
  emit('update:modelValue', { ...props.modelValue, opacity: (value ?? 0) / 100 })
}
</script>

<style scoped>
.shadow-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shadow-field__preview {
  width: 44px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--sm-app-text, #333);
  flex-shrink: 0;
}

.shadow-field__opacity {
  width: 44px;
  text-align: right;
}
</style>
