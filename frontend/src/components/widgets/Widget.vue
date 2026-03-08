<template>
  <div class="widget-container">
    <div class="widget-header">
      <span class="widget-title">{{ title }}</span>
    </div>
    <div class="widget-content">
      <slot name="content">
        <div class="text-caption text-grey-7">
          Widget content
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<style scoped>
.widget-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  overflow: hidden;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
}

.widget-title {
  font-weight: 600;
  font-size: 14px;
}

.widget-content {
  flex: 1;
  padding: 12px;
  overflow: auto;
}
</style>
