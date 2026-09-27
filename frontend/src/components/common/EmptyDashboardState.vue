<template>
  <div class="empty-dashboard">
    <q-icon
      name="widgets"
      size="72px"
      class="empty-dashboard__icon"
    />
    <div class="text-h6">Dashboard is empty</div>
    <div class="text-caption empty-dashboard__hint">
      Add a first widget.
    </div>
    <q-btn
      color="primary"
      icon="add"
      label="Add Widget"
      unelevated
      class="q-mt-sm"
      @click="startAddingWidget"
    />
  </div>
</template>

<script setup>
import { useUIStore } from 'stores/ui'
import { useWidgetWindowsStore } from 'stores/widgetWindows'

const uiStore = useUIStore()
const widgetWindows = useWidgetWindowsStore()

// A dashboard only accepts changes inside an edit session, so the button
// enters edit mode before opening the shared add-widget window: the first
// widget is then saved like any other edit (on leaving edit mode).
function startAddingWidget() {
  uiStore.enterEditMode()
  widgetWindows.openCreate('root')
}
</script>

<style scoped>
/* No background of its own: the placeholder sits on the themed page and
   inherits its colours, so it follows the dashboard theme. No top margin
   either: it would push the page into a scrollbar. */
.empty-dashboard {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  width: 100%;
}

.empty-dashboard__icon {
  opacity: 0.35;
}

.empty-dashboard__hint {
  opacity: 0.7;
}
</style>
