<template>
  <div class="settings-row">
    <div class="settings-row__label">
      <slot name="label">{{ label }}</slot>
      <q-tooltip v-if="hint">{{ hint }}</q-tooltip>
    </div>
    <div class="settings-row__control">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  hint: { type: String, default: '' }
})
</script>

<style scoped>
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 48px;
}

.settings-row__label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9rem;
}

.settings-row__control {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-width: 0;
  flex: 1;
  max-width: 60%;
}
</style>