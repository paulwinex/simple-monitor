import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDashboardStore } from './dashboard'
import { useWidgetWindowsStore } from './widgetWindows'

export const useUIStore = defineStore('ui', () => {
  const isEditMode = ref(false)
  const dashboardStore = useDashboardStore()
  const widgetWindows = useWidgetWindowsStore()
  
  // Snapshot of dashboard state when entering edit mode
  const dashboardSnapshot = ref(null)

  /**
   * Serialize only the persistent dashboard structure.
   *
   * Live slot data (slots[].data) is refreshed continuously by the data
   * refresh service and must NOT participate in change detection - otherwise
   * "has changes" would always be true even when the user changed nothing.
   */
  function serializePersistentState() {
    function projectWidget(w) {
      return {
        id: w.id,
        type: w.type,
        title: w.title,
        slots: (w.slots || []).map(({ data, ...persistentSlot }) => persistentSlot),
        options: w.options,
        refreshInterval: w.refreshInterval,
        children: (w.children || []).map(projectWidget),
        childLayout: w.childLayout,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h
      }
    }

    return JSON.stringify({
      layout: dashboardStore.layout,
      widgets: dashboardStore.widgets.map(projectWidget)
    })
  }

  /**
   * Create a snapshot of dashboard state when entering edit mode
   */
  function createDashboardSnapshot() {
    return serializePersistentState()
  }

  /**
   * Compare current dashboard state with snapshot
   * Returns true if there are changes
   */
  function hasDashboardChanges() {
    if (!dashboardSnapshot.value) return false

    return serializePersistentState() !== dashboardSnapshot.value
  }

  /**
   * Save snapshot and enter edit mode
   */
  function enterEditMode() {
    dashboardSnapshot.value = createDashboardSnapshot()
    isEditMode.value = true
  }

  /**
   * Clear snapshot and exit edit mode
   */
  function exitEditMode() {
    closeWidgetDialogs()
    dashboardSnapshot.value = null
    isEditMode.value = false
  }

  function toggleEditMode() {
    if (isEditMode.value) {
      // Exiting edit mode - save and clear snapshot
      dashboardStore.saveDashboard()
      exitEditMode()
    } else {
      // Entering edit mode - create snapshot
      enterEditMode()
    }
  }

  function setEditMode(value) {
    const wasEditing = isEditMode.value
    
    if (value && !wasEditing) {
      enterEditMode()
    } else if (!value && wasEditing) {
      dashboardStore.saveDashboard()
      exitEditMode()
    } else {
      isEditMode.value = value
    }
  }

  /**
   * Save dashboard without exiting edit mode
   */
  async function saveDashboard() {
    await dashboardStore.saveDashboard()
    // Update snapshot to current state after successful save
    dashboardSnapshot.value = createDashboardSnapshot()
  }

  // Cancel edit mode without saving - reloads dashboard from server
  async function cancelEditMode() {
    if (isEditMode.value) {
      closeWidgetDialogs()
      isEditMode.value = false
      dashboardSnapshot.value = null
      await dashboardStore.reloadDashboard()
    }
  }

  function closeWidgetDialogs() {
    widgetWindows.closeEdit()
    widgetWindows.closeCreate()
  }

  return {
    isEditMode,
    dashboardSnapshot,
    hasDashboardChanges,
    enterEditMode,
    exitEditMode,
    toggleEditMode,
    setEditMode,
    saveDashboard,
    cancelEditMode
  }
})
