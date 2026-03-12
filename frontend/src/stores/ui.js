import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDashboardStore } from './dashboard'

export const useUIStore = defineStore('ui', () => {
  const isEditMode = ref(false)
  const dashboardStore = useDashboardStore()

  function toggleEditMode() {
    isEditMode.value = !isEditMode.value

    // Save dashboard when exiting edit mode
    if (!isEditMode.value) {
      dashboardStore.saveDashboard()
    }
  }

  function setEditMode(value) {
    const wasEditing = isEditMode.value
    isEditMode.value = value

    // Save dashboard when exiting edit mode
    if (wasEditing && !value) {
      dashboardStore.saveDashboard()
    }
  }

  return {
    isEditMode,
    toggleEditMode,
    setEditMode
  }
})
