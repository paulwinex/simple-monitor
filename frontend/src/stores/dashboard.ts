import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface WidgetConfig {
  id: string
  type: string
  title?: string
  hostId?: string
  deviceId?: string
  sensors?: { name: string; table: string }[]
  options: Record<string, any>
  refreshInterval: number
  data?: any
  // For container widgets
  children?: WidgetConfig[]
  childLayout?: GridLayoutItem[]
}

// Minimum sizes for each widget type
export const WIDGET_MIN_SIZES: Record<string, { minW: number; minH: number }> = {
  number: { minW: 2, minH: 2 },
  chart: { minW: 4, minH: 4 },
  bar: { minW: 3, minH: 3 },
  pie: { minW: 3, minH: 3 },
  gridContainer: { minW: 6, minH: 6 }
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

  const now = Math.floor(Date.now() / 1000)
  const hourAgo = now - 3600

  // Генерация тестовых данных для графика
  const generateChartData = (baseValue: number, variance: number) => {
    const data = []
    for (let i = 0; i < 60; i++) {
      data.push({
        timestamp: hourAgo + i * 60,
        value: baseValue + Math.sin(i / 10) * variance + Math.random() * variance
      })
    }
    return data
  }

  // Заглушка с текущими данными
  return {
    layout: [
      { x: 0, y: 0, w: 2, h: 2, i: '0', static: false, title: 'CPU Usage', minW: 2, minH: 2 },
      { x: 2, y: 0, w: 2, h: 3, i: '1', static: false, title: undefined, minW: 2, minH: 2 },
      { x: 4, y: 0, w: 4, h: 4, i: '2', static: false, title: 'CPU History', minW: 4, minH: 4 },
      { x: 8, y: 0, w: 4, h: 4, i: '3', static: false, title: undefined, minW: 4, minH: 4 },
      { x: 0, y: 2, w: 2, h: 3, i: '4', static: false, title: undefined, minW: 2, minH: 2 },
      { x: 2, y: 3, w: 2, h: 2, i: '5', static: false, title: 'RAM', minW: 2, minH: 2 },
      { x: 0, y: 5, w: 6, h: 6, i: '6', static: false, title: 'Server Room', minW: 6, minH: 6 }
    ],
    widgets: [
      {
        id: '0',
        type: 'number',
        title: 'CPU Usage',
        hostId: 'host-1',
        deviceId: 'cpu',
        sensors: [{ name: 'usage_percent', table: 'raw' }],
        options: { decimals: 1, suffix: '%', color: '#4CAF50' },
        refreshInterval: 5000,
        data: { value: 42.5 }
      },
      {
        id: '1',
        type: 'number',
        hostId: 'host-1',
        deviceId: 'ram',
        sensors: [{ name: 'used_percent', table: 'raw' }],
        options: { decimals: 1, suffix: '%', color: '#2196F3' },
        refreshInterval: 5000,
        data: { value: 67.3 }
      },
      {
        id: '2',
        type: 'chart',
        title: 'CPU History',
        hostId: 'host-1',
        deviceId: 'cpu',
        sensors: [{ name: 'usage_percent', table: 'raw' }],
        options: { timeRange: '1h', showLegend: false, smooth: true, colors: ['#4CAF50'], fill: true },
        refreshInterval: 10000,
        data: { data: generateChartData(45, 15) }
      },
      {
        id: '3',
        type: 'chart',
        hostId: 'host-1',
        deviceId: 'network',
        sensors: [{ name: 'bytes_sent', table: 'raw' }],
        options: { timeRange: '1h', showLegend: false, smooth: true, colors: ['#9C27B0'], fill: true },
        refreshInterval: 10000,
        data: { data: generateChartData(1000000, 200000) }
      },
      {
        id: '4',
        type: 'number',
        hostId: 'host-1',
        deviceId: 'cpu',
        sensors: [{ name: 'temperature', table: 'raw' }],
        options: { decimals: 0, suffix: '°C', color: '#FF5722' },
        refreshInterval: 10000,
        data: { value: 52 }
      },
      {
        id: '5',
        type: 'number',
        title: 'RAM',
        hostId: 'host-1',
        deviceId: 'ram',
        sensors: [{ name: 'used_gb', table: 'raw' }],
        options: { decimals: 1, suffix: ' GB', color: '#00BCD4' },
        refreshInterval: 5000,
        data: { value: 10.8 }
      },
      {
        id: '6',
        type: 'gridContainer',
        title: 'Server Room',
        options: {},
        refreshInterval: 0,
        children: [
          {
            id: '6-0',
            type: 'number',
            title: 'Temp',
            options: { decimals: 0, suffix: '°C', color: '#FF5722' },
            refreshInterval: 10000,
            data: { value: 24 }
          },
          {
            id: '6-1',
            type: 'number',
            title: 'Humidity',
            options: { decimals: 0, suffix: '%', color: '#2196F3' },
            refreshInterval: 10000,
            data: { value: 45 }
          }
        ],
        childLayout: [
          { i: '6-0', x: 0, y: 0, w: 6, h: 6, minW: 3, minH: 3 },
          { i: '6-1', x: 6, y: 0, w: 6, h: 6, minW: 3, minH: 3 }
        ]
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
