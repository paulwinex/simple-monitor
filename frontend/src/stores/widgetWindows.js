import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDashboardStore } from './dashboard'

/**
 * Single source of truth for the shared widget dialogs.
 *
 * There is exactly ONE floating "edit widget" window and ONE floating
 * "add widget" window across the whole app (mounted in MainLayout).
 * Every create/edit button calls openCreate()/openEdit() here instead of
 * managing its own dialog instance.
 */
export const useWidgetWindowsStore = defineStore('widgetWindows', () => {
  const dashboardStore = useDashboardStore()

  // Edit window state
  const editOpen = ref(false)
  const editWidgetId = ref(null)
  const editParentId = ref(null)

  // Create window state
  const createOpen = ref(false)
  const createParentType = ref('root')
  const createParentId = ref(null)

  // Live widget currently being edited (root or nested).
  const editingWidget = computed(() =>
    editWidgetId.value ? dashboardStore.findWidgetDeep(editWidgetId.value) : null
  )

  // Whether a saved (DB) version exists for the currently edited widget.
  const canResetCurrent = computed(() => dashboardStore.hasSavedWidget(editWidgetId.value))

  function openEdit(widgetId, parentId = null) {
    editOpen.value = true
    editWidgetId.value = widgetId
    editParentId.value = parentId
  }

  // Switching to another widget just retargets the already-open window.
  function retargetEdit(widgetId, parentId = null) {
    editWidgetId.value = widgetId
    editParentId.value = parentId
  }

  function closeEdit() {
    editOpen.value = false
    editWidgetId.value = null
    editParentId.value = null
  }

  function openCreate(parentType = 'root', parentId = null) {
    createOpen.value = true
    createParentType.value = parentType
    createParentId.value = parentId
  }

  function closeCreate() {
    createOpen.value = false
  }

  function resetCurrentWidget() {
    dashboardStore.resetWidgetToSaved(editWidgetId.value)
  }

  return {
    editOpen,
    editWidgetId,
    editParentId,
    editingWidget,
    canResetCurrent,
    openEdit,
    retargetEdit,
    closeEdit,
    createOpen,
    createParentType,
    createParentId,
    openCreate,
    closeCreate,
    resetCurrentWidget
  }
})