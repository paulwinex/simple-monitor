<template>
  <div class="color-swatch" :style="{ background }" />
</template>

<script setup>
import { computed } from 'vue'
import { isCssColor } from 'src/utils/themes'

const props = defineProps({
  value: { type: [String, Number], default: '' }
})

const background = computed(() => (isCssColor(props.value) ? props.value.trim() : 'transparent'))
</script>

<style scoped>
.color-swatch {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 4px;
  border: 1px solid rgba(127, 127, 127, 0.5);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
}
</style>
