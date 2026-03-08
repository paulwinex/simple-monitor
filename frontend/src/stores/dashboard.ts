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

// Minimum sizes for each widget type
export const WIDGET_MIN_SIZES: Record<string, { minW: number; minH: number }> = {
  number: { minW: 2, minH: 2 },
  chart: { minW: 4, minH: 4 },
  bar: { minW: 3, minH: 3 },
  pie: { minW: 3, minH: 3 },
  gridContainer: { minW: 6, minH: 6 }
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
    
    return {
      layout: dashboard.layout,
      widgets: dashboard.widgets,
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
  await saveDashboardApi('default', {
    id: null,
    name: 'default',
    version: 1,
    layout: state.layout,
    widgets: state.widgets,
    updated_at: Math.floor(Date.now() / 1000)
  })
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
      const parent = widgets.value.find(w => w.id === parentId)
      console.log('[DashboardStore] Parent found:', parent ? 'yes' : 'no')
      
      if (parent && parent.children && parent.childLayout) {
        console.log('[DashboardStore] Parent has children and childLayout')
        widget.id = `${parentId}-${parent.children.length}`
        console.log('[DashboardStore] New widget id:', widget.id)
        parent.children.push(widget)
        console.log('[DashboardStore] Widget pushed to parent.children, new count:', parent.children.length)

        // Auto-place in container grid
        const containerWidth = 12
        const itemW = 6
        const itemH = 6

        let x = 0
        let y = 0
        let placed = false

        for (let row = 0; row < 10 && !placed; row++) {
          for (let col = 0; col < containerWidth && !placed; col += itemW) {
            x = col
            y = row * itemH

            const overlaps = parent.childLayout.some(item =>
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

        console.log('[DashboardStore] Placing widget at x:', x, 'y:', y)
        parent.childLayout.push({
          i: widget.id,
          x,
          y,
          w: itemW,
          h: itemH,
          minW: WIDGET_MIN_SIZES[widget.type]?.minW || 2,
          minH: WIDGET_MIN_SIZES[widget.type]?.minH || 2
        })
        console.log('[DashboardStore] Layout item added, new count:', parent.childLayout.length)
      } else {
        console.log('[DashboardStore] Parent missing children or childLayout')
        console.log('[DashboardStore] parent.children:', parent?.children)
        console.log('[DashboardStore] parent.childLayout:', parent?.childLayout)
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
        minW: WIDGET_MIN_SIZES[widget.type]?.minW || 2,
        minH: WIDGET_MIN_SIZES[widget.type]?.minH || 2,
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
      widgets.value[index] = { ...widgets.value[index], ...config }
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
