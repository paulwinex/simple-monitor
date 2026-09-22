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
   * Create a snapshot of current dashboard state for comparison
   */
  function createDashboardSnapshot() {
    return {
      layout: JSON.parse(JSON.stringify(dashboardStore.layout)),
      widgets: JSON.parse(JSON.stringify(dashboardStore.widgets))
    }
  }

  /**
   * Compare current dashboard state with snapshot
   * Returns true if there are changes
   */
  function hasDashboardChanges() {
    if (!dashboardSnapshot.value) return false
    
    const currentLayout = JSON.stringify(dashboardStore.layout)
    const currentWidgets = JSON.stringify(dashboardStore.widgets)
    const snapshotLayout = JSON.stringify(dashboardSnapshot.value.layout)
    const snapshotWidgets = JSON.stringify(dashboardSnapshot.value.widgets)
    
    return currentLayout !== snapshotLayout || currentWidgets !== snapshotWidgets
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
