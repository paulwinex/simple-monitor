<template>
  <div class="widget-container" :class="{ 'dark-theme': isDark }">
    <div v-if="showHeader" class="widget-header">
      <slot name="title">
        <span class="widget-title">{{ title }}</span>
      </slot>
    </div>
    <div class="widget-content">
      <slot name="content"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuasar } from 'quasar'

defineProps<{
  title?: string
  showHeader?: boolean
}>()

defineSlots<{
  title?(): any
  content(): any
}>()

const $q = useQuasar()
const isDark = computed(() => $q.dark.mode === true || $q.dark.mode === 'true')
</script>

<style scoped>
.widget-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  overflow: hidden;
}

/* Dark theme (default) */
.widget-container.dark-theme {
  background: #424242;
  border: 1px solid #616161;
}

.widget-container.dark-theme .widget-header {
  background: #545454;
  border-bottom: 1px solid #616161;
}

.widget-container.dark-theme .widget-title {
  color: #e0e0e0;
}

.widget-container.dark-theme .widget-content {
  color: #bdbdbd;
}

/* Light theme */
.widget-container:not(.dark-theme) {
  background: #ffffff;
  border: 1px solid #e0e0e0;
}

.widget-container:not(.dark-theme) .widget-header {
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.widget-container:not(.dark-theme) .widget-title {
  color: #424242;
}

.widget-container:not(.dark-theme) .widget-content {
  color: #616161;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
}

.widget-title {
  font-weight: 600;
  font-size: 14px;
}

.widget-content {
  flex: 1;
  padding: 12px;
  overflow: hidden;
}
</style>
