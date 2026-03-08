<template>
  <div class="q-gutter-y-md">
    <q-input
      v-model.number="localOptions.decimals"
      type="number"
      label="Decimal Places"
      outlined
      dense
      min="0"
      max="5"
    />
    
    <q-input
      v-model="localOptions.suffix"
      label="Suffix"
      outlined
      dense
      hint="e.g., %, °C, GB"
    />
    
    <q-input
      v-model="localOptions.prefix"
      label="Prefix"
      outlined
      dense
      hint="e.g., $, €"
    />
    
    <q-input
      v-model="localOptions.color"
      label="Color"
      outlined
      dense
      hint="CSS color or hex code"
    >
      <template #append>
        <q-avatar square>
          <div :style="{ background: localOptions.color, width: '100%', height: '100%' }" />
        </q-avatar>
      </template>
    </q-input>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: Record<string, any>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()

const localOptions = ref<Record<string, any>>({
  decimals: props.modelValue?.decimals ?? 1,
  suffix: props.modelValue?.suffix ?? '',
  prefix: props.modelValue?.prefix ?? '',
  color: props.modelValue?.color ?? '#4CAF50'
})

watch(localOptions, (newVal) => {
  emit('update:modelValue', { ...newVal })
}, { deep: true })

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    localOptions.value = {
      decimals: newVal.decimals ?? 1,
      suffix: newVal.suffix ?? '',
      prefix: newVal.prefix ?? '',
      color: newVal.color ?? '#4CAF50'
    }
  }
}, { deep: true })
</script>
