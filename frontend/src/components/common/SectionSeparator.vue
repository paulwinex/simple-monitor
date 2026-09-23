<template>
  <div class="section-separator row items-center no-wrap">
    <span class="section-separator__label">{{ label }}</span>
    <slot />
    <q-separator class="section-separator__line" />
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' }
})
</script>

<style scoped>
.section-separator {
  min-height: 24px;
  margin: 8px 0;
}

.section-separator__label {
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  color: inherit;
  margin-right: 12px;
}

.section-separator__line {
  flex: 1 1 auto;
}
</style>