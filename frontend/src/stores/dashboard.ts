import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface WidgetConfig {
  id: string
  type: string
  title: string
  hostId: string
  deviceId: string
  sensors: { name: string; table: string }[]
  options: Record<string, any>
  refreshInterval: number
}

export interface GridLayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  static?: boolean
  title?: string
}

export interface DashboardState {
  layout: GridLayoutItem[]
  widgets: WidgetConfig[]
  gridOptions: GridOptions
}

export interface GridOptions {
  colNum: number
  rowHeight: number
  verticalCompact: boolean
}

const DEFAULT_GRID_OPTIONS: GridOptions = {
  colNum: 16,
  rowHeight: 30,
  verticalCompact: true
}

// API заглушка - в будущем будет реальный вызов к бэкенду
async function fetchDashboardFromApi(): Promise<DashboardState> {
  // TODO: заменить на реальный API вызов
  // const response = await api.get('/api/v1/dashboards/default')
  // return response.data.dashboard

  // Заглушка с текущими данными
  return {
    layout: [
      { x: 0, y: 0, w: 2, h: 2, i: '0', static: false, title: 'CPU Usage' },
      { x: 2, y: 0, w: 2, h: 4, i: '1', static: true, title: 'Memory' },
      { x: 4, y: 0, w: 2, h: 5, i: '2', static: false, title: 'Disk I/O' },
      { x: 6, y: 0, w: 2, h: 3, i: '3', static: false, title: 'Network' },
      { x: 8, y: 0, w: 2, h: 3, i: '4', static: false, title: 'Temperature' },
      { x: 10, y: 0, w: 2, h: 3, i: '5', static: false, title: 'Fans' },
      { x: 0, y: 5, w: 2, h: 5, i: '6', static: false, title: 'Uptime' },
      { x: 2, y: 5, w: 2, h: 5, i: '7', static: false, title: 'Load Average' },
      { x: 4, y: 5, w: 2, h: 5, i: '8', static: false, title: 'Processes' },
      { x: 6, y: 3, w: 2, h: 4, i: '9', static: true, title: 'Storage' },
      { x: 8, y: 4, w: 2, h: 4, i: '10', static: false, title: 'ZFS Pool' },
      { x: 10, y: 4, w: 2, h: 4, i: '11', static: false, title: 'Docker' },
      { x: 0, y: 10, w: 2, h: 5, i: '12', static: false, title: 'Battery' },
      { x: 2, y: 10, w: 2, h: 5, i: '13', static: false, title: 'Power' },
      { x: 4, y: 8, w: 2, h: 4, i: '14', static: false, title: 'GPU' },
      { x: 6, y: 8, w: 2, h: 4, i: '15', static: false, title: 'VMs' },
      { x: 8, y: 10, w: 2, h: 5, i: '16', static: false, title: 'Containers' },
      { x: 10, y: 4, w: 2, h: 2, i: '17', static: false, title: 'Services' },
      { x: 0, y: 9, w: 2, h: 3, i: '18', static: false, title: 'Alerts' },
      { x: 2, y: 6, w: 2, h: 2, i: '19', static: false, title: 'Logs' }
    ],
    widgets: [
      {
        id: '0',
        type: 'number',
        title: 'CPU Usage',
        hostId: 'host-1',
        deviceId: 'cpu',
        sensors: [{ name: 'usage_percent', table: 'raw' }],
        options: { decimals: 1, suffix: '%' },
        refreshInterval: 5000
      },
      {
        id: '1',
        type: 'bar',
        title: 'Memory',
        hostId: 'host-1',
        deviceId: 'ram',
        sensors: [{ name: 'used_percent', table: 'raw' }],
        options: { orientation: 'vertical' },
        refreshInterval: 5000
      },
      {
        id: '2',
        type: 'chart',
        title: 'Disk I/O',
        hostId: 'host-1',
        deviceId: 'disk',
        sensors: [
          { name: 'read_bytes', table: 'raw' },
          { name: 'write_bytes', table: 'raw' }
        ],
        options: { timeRange: '1h' },
        refreshInterval: 10000
      },
      {
        id: '3',
        type: 'number',
        title: 'Network',
        hostId: 'host-1',
        deviceId: 'network',
        sensors: [{ name: 'bytes_sent', table: 'raw' }],
        options: { suffix: ' B/s' },
        refreshInterval: 5000
      },
      {
        id: '4',
        type: 'number',
        title: 'Temperature',
        hostId: 'host-1',
        deviceId: 'cpu',
        sensors: [{ name: 'temperature', table: 'raw' }],
        options: { suffix: '°C' },
        refreshInterval: 10000
      },
      {
        id: '5',
        type: 'number',
        title: 'Fans',
        hostId: 'host-1',
        deviceId: 'fans',
        sensors: [{ name: 'rpm', table: 'raw' }],
        options: { suffix: ' RPM' },
        refreshInterval: 10000
      }
    ],
    gridOptions: DEFAULT_GRID_OPTIONS
  }
}

async function saveDashboardToApi(state: DashboardState): Promise<void> {
  // TODO: заменить на реальный API вызов
  // await api.put('/api/v1/dashboards/default', { dashboard: state })
  console.log('Saving dashboard:', state)
}

export const useDashboardStore = defineStore('dashboard', () => {
  const layout = ref<GridLayoutItem[]>([])
  const widgets = ref<WidgetConfig[]>([])
  const gridOptions = ref<GridOptions>({ ...DEFAULT_GRID_OPTIONS })
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isLoading = computed(() => loading.value)
  const hasError = computed(() => error.value !== null)

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

  function addWidget(widget: WidgetConfig) {
    widgets.value.push(widget)

    // Auto-place widget in next available slot
    const gridWidth = 12
    const itemW = 4
    const itemH = 4

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
      minW: 3,
      minH: 3,
      title: widget.title
    })
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

  return {
    layout,
    widgets,
    gridOptions,
    loading,
    error,
    isLoading,
    hasError,
    loadDashboard,
    saveDashboard,
    addWidget,
    removeWidget,
    updateLayout,
    updateWidget,
    updateGridOptions,
    getWidget
  }
})
