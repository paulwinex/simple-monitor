import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dashboards } from '../api'
import type { DashboardConfig, WidgetConfig, GridLayoutItem } from '../types'
import { generateId } from '../utils'

interface WidgetWithLayout {
  widget: WidgetConfig
  layout: GridLayoutItem
}

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const widgets = ref<WidgetConfig[]>([])
  const layout = ref<GridLayoutItem[]>([])
  const isEditing = ref(false)
  const dashboardName = ref('My Dashboard')
  const dashboardId = ref<number>(1)
  const version = ref(1)
  const isLoading = ref(false)
  const addWidgetDialogOpen = ref(false)

  // Computed
  const widgetCount = computed(() => widgets.value.length)

  const getWidgetById = computed(() => {
    return (id: string) => widgets.value.find((w) => w.id === id)
  })

  // Actions
  function toggleEditMode() {
    isEditing.value = !isEditing.value
  }

  function setEditing(value: boolean) {
    isEditing.value = value
  }

  function addWidget(widget: WidgetConfig, layoutItem?: Partial<GridLayoutItem>) {
    widgets.value.push(widget)

    // Auto-place widget if no position specified
    const nextPosition = findNextGridPosition()
    const newLayout: GridLayoutItem = {
      i: widget.id,
      x: layoutItem?.x ?? nextPosition.x,
      y: layoutItem?.y ?? nextPosition.y,
      w: layoutItem?.w ?? 4,
      h: layoutItem?.h ?? 4,
      min_w: layoutItem?.min_w ?? 2,
      min_h: layoutItem?.min_h ?? 2,
      max_w: layoutItem?.max_w ?? 12,
      max_h: layoutItem?.max_h ?? 24,
      static: false,
    }

    layout.value.push(newLayout)
  }

  function removeWidget(id: string) {
    const index = widgets.value.findIndex((w) => w.id === id)
    if (index !== -1) {
      widgets.value.splice(index, 1)
    }

    const layoutIndex = layout.value.findIndex((l) => l.i === id)
    if (layoutIndex !== -1) {
      layout.value.splice(layoutIndex, 1)
    }
  }

  function updateWidget(id: string, config: Partial<WidgetConfig>) {
    const widget = widgets.value.find((w) => w.id === id)
    if (widget) {
      Object.assign(widget, config)
    }
  }

  function updateLayout(newLayout: GridLayoutItem[]) {
    layout.value = newLayout
  }

  function findNextGridPosition(): { x: number; y: number } {
    if (layout.value.length === 0) {
      return { x: 0, y: 0 }
    }

    // Simple auto-placement: find the lowest point and place next to it
    const maxY = Math.max(...layout.value.map((l) => l.y + l.h))
    const itemsAtMaxY = layout.value.filter((l) => l.y + l.h === maxY)
    const maxX = Math.max(...itemsAtMaxY.map((l) => l.x + l.w))

    return { x: maxX + 1, y: maxY }
  }

  async function saveToBackend() {
    isLoading.value = true
    try {
      const dashboardConfig: DashboardConfig = {
        id: dashboardId.value,
        name: dashboardName.value,
        version: version.value,
        layout: layout.value,
        widgets: widgets.value,
        updated_at: Math.floor(Date.now() / 1000),
      }

      const response = await dashboards.save({ dashboard: dashboardConfig })
      version.value = response.version
      dashboardId.value = response.id
    } finally {
      isLoading.value = false
    }
  }

  async function loadFromBackend() {
    isLoading.value = true
    try {
      const response = await dashboards.getDefault()
      dashboardId.value = response.id
      version.value = response.version
      dashboardName.value = response.dashboard.name || 'My Dashboard'
      widgets.value = response.dashboard.widgets || []
      layout.value = response.dashboard.layout || []
    } finally {
      isLoading.value = false
    }
  }

  function openAddWidgetDialog() {
    addWidgetDialogOpen.value = true
  }

  function closeAddWidgetDialog() {
    addWidgetDialogOpen.value = false
  }

  function openSettingsDialog() {
    // Will be implemented with dialog component
    console.log('Open settings dialog')
  }

  // Initialize with empty state
  function reset() {
    widgets.value = []
    layout.value = []
    isEditing.value = false
    dashboardName.value = 'My Dashboard'
    dashboardId.value = 1
    version.value = 1
  }

  return {
    // State
    widgets,
    layout,
    isEditing,
    dashboardName,
    dashboardId,
    version,
    isLoading,
    addWidgetDialogOpen,
    // Computed
    widgetCount,
    getWidgetById,
    // Actions
    toggleEditMode,
    setEditing,
    addWidget,
    removeWidget,
    updateWidget,
    updateLayout,
    saveToBackend,
    loadFromBackend,
    openAddWidgetDialog,
    closeAddWidgetDialog,
    openSettingsDialog,
    reset,
  }
})
