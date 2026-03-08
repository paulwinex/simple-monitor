<template>
  <BaseWidget :title="title" :show-header="showHeader">
    <template #content>
      <div class="number-widget">
        <div v-if="loading" class="text-center">
          <q-spinner size="2em" color="primary" />
        </div>
        <div v-else-if="error" class="text-center text-negative">
          {{ error }}
        </div>
        <div v-else class="text-center">
          <div class="value" :style="{ color: options.color }">
            {{ formattedValue }}
          </div>
        </div>
      </div>
    </template>
  </BaseWidget>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseWidget from './BaseWidget.vue'

interface NumberWidgetOptions {
  prefix?: string
  suffix?: string
  decimals?: number
  color?: string
}

const props = defineProps<{
  title?: string
  showHeader?: boolean
  value?: number | null
  loading?: boolean
  error?: string | null
  options?: NumberWidgetOptions
}>()

const formattedValue = computed(() => {
  if (props.value === null || props.value === undefined) return '—'
  
  const decimals = props.options?.decimals ?? 1
  let formatted = Number(props.value).toFixed(decimals)
  
  if (props.options?.prefix) {
    formatted = props.options.prefix + formatted
  }
  if (props.options?.suffix) {
    formatted = formatted + props.options.suffix
  }
  
  return formatted
})
</script>

<style scoped>
.number-widget {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.value {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
}
</style>
