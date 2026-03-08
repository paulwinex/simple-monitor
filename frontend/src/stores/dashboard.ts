import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDefaultDashboard, saveDashboard as saveDashboardApi, getHosts } from 'src/services/api'
import type { GridLayoutItem, WidgetConfig, DashboardConfig } from 'src/components/models'
import type { HostWithDevices } from 'src/services/api'

export interface GridOptions {
  colNum: number
  rowHeight: number
  verticalCompact: boolean
}

export interface DashboardState {
  layout: GridLayoutItem[]
  widgets: WidgetConfig[]
  gridOptions: GridOptions
}

const DEFAULT_GRID_OPTIONS: GridOptions = {
  colNum: 12,
  rowHeight: 30,
  verticalCompact: true
}

async function fetchDashboardFromApi(): Promise<DashboardState> {
  try {
    const response = await getDefaultDashboard()
    const dashboard = response.dashboard

    // Transform widgets from snake_case to camelCase
    const widgetsArray = Array.isArray(dashboard.widgets) ? dashboard.widgets : (dashboard.widgets ? Object.values(dashboard.widgets) : [])
    const transformedWidgets = widgetsArray.map((w: any) => ({
      id: w.id,
      type: w.type,
      title: w.title,
      hostId: w.host_id,
      deviceId: w.device_id,
      sensors: w.sensors,
      options: w.options,
      refreshInterval: w.refresh_interval,
      children: w.children ? w.children.map((c: any) => ({
        id: c.id,
        type: c.type,
        title: c.title,
        hostId: c.host_id,
        deviceId: c.device_id,
        sensors: c.sensors,
        options: c.options,
        refreshInterval: c.refresh_interval
      })) : undefined,
      childLayout: w.child_layout
    }))

    // Transform layout from object/array to array
    const layoutArray = Array.isArray(dashboard.layout) ? dashboard.layout : (dashboard.layout ? Object.values(dashboard.layout) : [])

    return {
      layout: layoutArray,
      widgets: transformedWidgets,
      gridOptions: DEFAULT_GRID_OPTIONS
    }
  } catch (error) {
    console.error('Failed to load dashboard from API, using empty layout:', error)
    // Return empty dashboard if API fails
    return {
      layout: [],
      widgets: [],
      gridOptions: DEFAULT_GRID_OPTIONS
    }
  }
}

async function saveDashboardToApi(state: DashboardState): Promise<void> {
  // Transform widgets to snake_case for backend and convert to dict
  const transformedWidgets = state.widgets.map(w => ({
    id: w.id,
    type: w.type,
    title: w.title,
    host_id: w.hostId,
    device_id: w.deviceId,
    sensors: w.sensors,
    options: w.options,
    refresh_interval: w.refreshInterval,
    children: w.children ? w.children.map(c => ({
      id: c.id,
      type: c.type,
      title: c.title,
      host_id: c.hostId,
      device_id: c.deviceId,
      sensors: c.sensors,
      options: c.options,
      refresh_interval: c.refreshInterval
    })) : undefined,
    child_layout: w.childLayout
  }))

  // Convert layout array to dict keyed by widget id
  const layoutDict: Record<string, any> = {}
  for (const item of state.layout) {
    layoutDict[item.i] = item
  }

  // Convert widgets array to dict keyed by widget id
  const widgetsDict: Record<string, any> = {}
  for (const widget of transformedWidgets) {
    widgetsDict[widget.id] = widget
  }

  const payload = {
    id: null,
    name: 'default',
    version: 1,
    layout: layoutDict,
    widgets: widgetsDict,
    updated_at: Math.floor(Date.now() / 1000)
  }

  console.log('[DashboardStore] Saving payload:')
  console.log(JSON.stringify(payload, null, 2))

  await saveDashboardApi('default', payload)
}

export const useDashboardStore = defineStore('dashboard', () => {
  const layout = ref<GridLayoutItem[]>([])
  const widgets = ref<WidgetConfig[]>([])
  const gridOptions = ref<GridOptions>({ ...DEFAULT_GRID_OPTIONS })
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hosts = ref<HostWithDevices[]>([])

  const isLoading = computed(() => loading.value)
  const hasError = computed(() => error.value !== null)

  async function loadHosts() {
    try {
      hosts.value = await getHosts()
    } catch (err) {
      console.error('Failed to load hosts:', err)
      hosts.value = []
    }
  }

  async function loadDashboard() {
    loading.value = true
    error.value = null
    
    try {
      const data = await fetchDashboardFromApi()
      layout.value = data.layout
      widgets.value = data.widgets
      gridOptions.value = data.gridOptions || DEFAULT_GRID_OPTIONS
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load dashboard'
      console.error('Failed to load dashboard:', err)
    } finally {
      loading.value = false
    }
  }

  async function saveDashboard() {
    try {
      await saveDashboardToApi({ layout: layout.value, widgets: widgets.value, gridOptions: gridOptions.value })
    } catch (err) {
      console.error('Failed to save dashboard:', err)
      throw err
    }
  }

  function updateGridOptions(options: Partial<GridOptions>) {
    gridOptions.value = { ...gridOptions.value, ...options }
  }

  function addWidget(widget: WidgetConfig, parentId?: string) {
    console.log('[DashboardStore] addWidget called')
    console.log('[DashboardStore] widget:', widget)
    console.log('[DashboardStore] parentId:', parentId)
    console.log('[DashboardStore] Current widgets count:', widgets.value.length)

    if (parentId) {
      // Add to container widget
      console.log('[DashboardStore] Looking for parent with id:', parentId)
      const parentIndex = widgets.value.findIndex(w => w.id === parentId)
      console.log('[DashboardStore] Parent index:', parentIndex)

      if (parentIndex !== -1) {
        const parent = widgets.value[parentIndex]
        
        // Initialize children and childLayout if not present
        const children = parent.children ? [...parent.children] : []
        const childLayout = parent.childLayout ? [...parent.childLayout] : []

        widget.id = `${parentId}-${children.length}`
        console.log('[DashboardStore] New widget id:', widget.id)
        children.push(widget)
        console.log('[DashboardStore] Widget pushed to children, new count:', children.length)

        // Auto-place in container grid - always place, even if it goes beyond visible area
        const containerWidth = 12
        const itemW = 6
        const itemH = 6

        let x = 0
        let y = 0
        let placed = false

        // Try to find a non-overlapping position
        for (let row = 0; row < 100 && !placed; row++) {
          for (let col = 0; col < containerWidth && !placed; col += itemW) {
            x = col
            y = row * itemH

            const overlaps = childLayout.some(item =>
              x < item.x + item.w &&
              x + itemW > item.x &&
              y < item.y + item.h &&
              y + itemH > item.y
            )

            if (!overlaps) {
              placed = true
            }
          }
        }

        // If no position found (shouldn't happen), place at the end
        if (!placed) {
          const maxRow = Math.max(...childLayout.map(item => Math.floor(item.y / itemH)), -1)
          y = (maxRow + 1) * itemH
          x = 0
        }

        console.log('[DashboardStore] Placing widget at x:', x, 'y:', y)
        childLayout.push({
          i: widget.id,
          x,
          y,
          w: itemW,
          h: itemH
        })
        console.log('[DashboardStore] Layout item added, new count:', childLayout.length)

        // Update parent widget with new children and childLayout
        widgets.value[parentIndex] = {
          ...parent,
          children,
          childLayout
        }
        console.log('[DashboardStore] Parent widget updated')
      } else {
        console.log('[DashboardStore] Parent not found')
      }
    } else {
      // Add to main dashboard
      widgets.value.push(widget)

      // Auto-place widget in next available slot
      const gridWidth = 12
      const itemW = widget.type === 'gridContainer' ? 6 : 4
      const itemH = widget.type === 'gridContainer' ? 6 : 4

      let x = 0
      let y = 0
      let placed = false

      for (let row = 0; row < 100 && !placed; row++) {
        for (let col = 0; col < gridWidth && !placed; col += itemW) {
          x = col
          y = row * itemH

          const overlaps = layout.value.some(item =>
            x < item.x + item.w &&
            x + itemW > item.x &&
            y < item.y + item.h &&
            y + itemH > item.y
          )

          if (!overlaps) {
            placed = true
          }
        }
      }

      layout.value.push({
        i: widget.id,
        x,
        y,
        w: itemW,
        h: itemH,
        title: widget.title
      })
    }
  }

  function removeWidget(id: string) {
    widgets.value = widgets.value.filter(w => w.id !== id)
    layout.value = layout.value.filter(l => l.i !== id)
  }

  function updateLayout(newLayout: GridLayoutItem[]) {
    layout.value = newLayout
  }

  function updateWidget(id: string, config: Partial<WidgetConfig>) {
    const index = widgets.value.findIndex(w => w.id === id)
    if (index !== -1) {
      const oldWidget = widgets.value[index]
      widgets.value[index] = { ...oldWidget, ...config }
      console.log('[DashboardStore] updateWidget:', id, 'config:', config)
      console.log('[DashboardStore] Updated widget:', widgets.value[index])
    } else {
      console.warn('[DashboardStore] Widget not found:', id)
    }
  }

  function getWidget(id: string): WidgetConfig | undefined {
    return widgets.value.find(w => w.id === id)
  }

  function getAvailableWidgetTypes(parentType?: string): { value: string; label: string }[] {
    const allTypes = [
      { value: 'number', label: 'Number' },
      { value: 'chart', label: 'Chart' },
      { value: 'bar', label: 'Bar Chart' },
      { value: 'pie', label: 'Pie Chart' }
    ]
    
    // GridContainer cannot be nested inside another GridContainer
    if (parentType !== 'gridContainer') {
      allTypes.push({ value: 'gridContainer', label: 'Grid Container' })
    }
    
    return allTypes
  }

  return {
    layout,
    widgets,
    gridOptions,
    loading,
    error,
    hosts,
    isLoading,
    hasError,
    loadDashboard,
    saveDashboard,
    loadHosts,
    addWidget,
    removeWidget,
    updateLayout,
    updateWidget,
    updateGridOptions,
    getWidget,
    getAvailableWidgetTypes
  }
})
