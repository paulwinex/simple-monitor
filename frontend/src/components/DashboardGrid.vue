<template>
  <div class="dashboard-grid-container q-pa-md">
    <!-- Empty state -->
    <div v-if="widgets.length === 0" class="empty-state flex flex-center column q-pa-xl">
      <q-icon name="dashboard" size="64px" color="grey-6" />
      <div class="text-h6 text-grey-7 q-mt-md">No widgets yet</div>
      <div class="text-subtitle1 text-grey-6 q-mt-sm">
        Click the + button to add your first widget
      </div>
    </div>

    <!-- Grid Layout -->
    <grid-layout
      v-else
      v-model:layout="layout"
      :col-num="12"
      :row-height="60"
      :is-draggable="isEditing"
      :is-resizable="isEditing"
      :vertical-compact="true"
      :use-css-transforms="true"
      :margin="[10, 10]"
      class="dashboard-grid"
    >
      <grid-item
        v-for="widget in widgets"
        :key="widget.id"
        :x="getLayoutItem(widget.id).x"
        :y="getLayoutItem(widget.id).y"
        :w="getLayoutItem(widget.id).w"
        :h="getLayoutItem(widget.id).h"
        :i="widget.id"
        :min-w="getLayoutItem(widget.id).min_w || 2"
        :min-h="getLayoutItem(widget.id).min_h || 2"
        :max-w="getLayoutItem(widget.id).max_w || 12"
        :max-h="getLayoutItem(widget.id).max_h || 24"
        :static="getLayoutItem(widget.id).static || false"
        drag-allow-from=".widget-header"
        drag-ignore-from=".widget-content"
      >
        <!-- Render widget based on type -->
        <component
          :is="getWidgetComponent(widget.type)"
          :widget="widget"
          :is-editing="isEditing"
          @edit="$emit('edit-widget', $event)"
          @delete="$emit('delete-widget', $event)"
        />
      </grid-item>
    </grid-layout>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { GridLayout, GridItem } from 'vue-grid-layout'
import { useDashboardStore } from '../stores/dashboard'
import { getWidgetComponent, getAvailableWidgets } from './widgets'
import type { WidgetConfig, GridLayoutItem } from '../types'

const dashboardStore = useDashboardStore()

// Computed
const widgets = computed(() => dashboardStore.widgets)
const layout = computed({
  get: () => dashboardStore.layout,
  set: (value) => dashboardStore.updateLayout(value),
})
const isEditing = computed(() => dashboardStore.isEditing)

// Get layout item for widget
function getLayoutItem(widgetId: string): GridLayoutItem {
  return (
    layout.value.find((l) => l.i === widgetId) || {
      i: widgetId,
      x: 0,
      y: 0,
      w: 4,
      h: 4,
    }
  )
}

// Emits
const emit = defineEmits<{
  'edit-widget': [widget: WidgetConfig]
  'delete-widget': [widgetId: string]
}>()
</script>

<style scoped lang="scss">
.dashboard-grid-container {
  min-height: calc(100vh - 120px);
}

.empty-state {
  min-height: 400px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  margin: 16px;
}

.dashboard-grid {
  .vue-grid-item {
    transition: all 0.2s ease;

    &.vue-grid-item-placeholder {
      opacity: 0.5;
      border: 2px dashed $primary;
      border-radius: 8px;
      background: rgba($primary, 0.1);
    }

    .editing-mode & {
      cursor: move;
    }
  }
}
</style>
