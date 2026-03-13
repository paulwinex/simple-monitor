import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDefaultDashboard, saveDashboard as saveDashboardApi, getHosts, getMetricDevices } from 'src/services/api'

const DEFAULT_GRID_OPTIONS = {
  colNum: 12,
  rowHeight: 30,
  verticalCompact: true
}

async function fetchDashboardFromApi() {
  try {
    const response = await getDefaultDashboard()
    const dashboard = response.dashboard

    // Transform widgets from snake_case to camelCase
    const widgetsArray = Array.isArray(dashboard.widgets) ? dashboard.widgets : (dashboard.widgets ? Object.values(dashboard.widgets) : [])
    let transformedWidgets = widgetsArray.map((w) => ({
      id: w.id,
      type: w.type,
      title: w.title,
      // Support both old (hostId/deviceId/sensors) and new (slots) format
      slots: w.slots || (w.hostId && w.deviceId && w.sensors ? [{
        id: 'default',
        label: 'Default',
        hostId: w.hostId,
        deviceId: w.deviceId,
        sensor: w.sensors[0],
        options: {}
      }] : undefined),
      hostId: w.host_id,  // Keep for backward compatibility
      deviceId: w.deviceId,  // Keep for backward compatibility
      sensors: w.sensors,  // Keep for backward compatibility
      options: w.options,
      refreshInterval: w.refresh_interval,
      children: w.children ? w.children.map((c) => ({
        id: c.id,
        type: c.type,
        title: c.title,
        slots: c.slots || (c.hostId && c.deviceId && c.sensors ? [{
          id: 'default',
          label: 'Default',
          hostId: c.hostId,
          deviceId: c.deviceId,
          sensor: c.sensors[0],
          options: {}
        }] : undefined),
        hostId: c.host_id,
        deviceId: c.deviceId,
        sensors: c.sensors,
        options: c.options,
        refreshInterval: c.refresh_interval
      })) : undefined,
      childLayout: w.child_layout
    }))

    // Transform layout from object/array to array
    let layoutArray = Array.isArray(dashboard.layout) ? dashboard.layout : (dashboard.layout ? Object.values(dashboard.layout) : [])
    
    // Check for duplicate IDs in layout and fix them
    const seenIds = new Set()
    const uniqueLayout = []
    for (const item of layoutArray) {
      if (seenIds.has(item.i)) {
        console.warn(`[DashboardStore] Duplicate layout item ID found: ${item.i}. Generating new ID.`)
        // Find the widget with this ID and get its real ID
        const widget = transformedWidgets.find(w => w.id === item.i)
        if (widget) {
          item.i = `${widget.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        } else {
          item.i = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        }
      }
      seenIds.add(item.i)
      uniqueLayout.push(item)
    }
    layoutArray = uniqueLayout

    // Also check for duplicate widget IDs
    const seenWidgetIds = new Set()
    const uniqueWidgets = []
    for (const widget of transformedWidgets) {
      if (seenWidgetIds.has(widget.id)) {
        console.warn(`[DashboardStore] Duplicate widget ID found: ${widget.id}. Generating new ID.`)
        widget.id = `${widget.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }
      seenWidgetIds.add(widget.id)
      
      // Also check for duplicate IDs in childLayout (for GridContainer widgets)
      if (widget.childLayout && widget.childLayout.length > 0) {
        const seenChildIds = new Set()
        for (const childItem of widget.childLayout) {
          if (seenChildIds.has(childItem.i)) {
            console.warn(`[DashboardStore] Duplicate childLayout ID found in widget ${widget.id}: ${childItem.i}. Generating new ID.`)
            childItem.i = `${widget.id}-${childItem.i}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
          }
          seenChildIds.add(childItem.i)
        }
      }
      
      uniqueWidgets.push(widget)
    }
    transformedWidgets = uniqueWidgets

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

async function saveDashboardToApi(state) {
  // Transform widgets to snake_case for backend and convert to dict
  const transformedWidgets = state.widgets.map(w => ({
    id: w.id,
    type: w.type,
    title: w.title,
    slots: w.slots,
    options: w.options,
    refresh_interval: w.refreshInterval,
    children: w.children ? w.children.map(c => ({
      id: c.id,
      type: c.type,
      title: c.title,
      slots: c.slots,
      options: c.options,
      refresh_interval: c.refreshInterval
    })) : undefined,
    child_layout: w.childLayout
  }))

  // Convert layout array to dict keyed by widget id
  const layoutDict = {}
  for (const item of state.layout) {
    layoutDict[item.i] = item
  }

  // Convert widgets array to dict keyed by widget id
  const widgetsDict = {}
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
  const layout = ref([])
  const widgets = ref([])
  const gridOptions = ref({ ...DEFAULT_GRID_OPTIONS })
  const loading = ref(false)
  const error = ref(null)
  const hosts = ref([])

  const isLoading = computed(() => loading.value)
  const hasError = computed(() => error.value !== null)

  async function loadHosts() {
    try {
      const hostsData = await getHosts()
      
      // Load sensors for each host and device
      const hostsArray = Array.isArray(hostsData) ? hostsData : (hostsData ? Object.values(hostsData) : [])
      
      for (const host of hostsArray) {
        if (host.devices && host.devices.length > 0) {
          // Load sensors from metrics/devices endpoint
          const devicesWithMetrics = await getMetricDevices(host.host_id)
          
          // Map sensors to devices
          const metricsMap = {}
          for (const device of devicesWithMetrics) {
            metricsMap[device.name] = device.metrics || []
          }
          
          // Add sensors to each device
          for (const device of host.devices) {
            device.sensors = metricsMap[device.name] || []
          }
        }
      }
      
      hosts.value = hostsArray
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

  function updateGridOptions(options) {
    gridOptions.value = { ...gridOptions.value, ...options }
  }

  function addWidget(widget, parentId) {
    if (parentId) {
      // Add to container widget
      const parentIndex = widgets.value.findIndex(w => w.id === parentId)

      if (parentIndex !== -1) {
        const parent = widgets.value[parentIndex]

        // Initialize children and childLayout if not present
        const children = parent.children ? [...parent.children] : []
        const childLayout = parent.childLayout ? [...parent.childLayout] : []

        // Generate unique widget ID using timestamp and random number
        widget.id = `${parentId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        children.push(widget)

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

        childLayout.push({
          i: widget.id,
          x,
          y,
          w: itemW,
          h: itemH
        })

        // Update parent widget with new children and childLayout
        widgets.value[parentIndex] = {
          ...parent,
          children,
          childLayout
        }
      } else {
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

  function removeWidget(id) {
    widgets.value = widgets.value.filter(w => w.id !== id)
    layout.value = layout.value.filter(l => l.i !== id)
  }

  function updateLayout(newLayout) {
    layout.value = newLayout
  }

  function updateWidget(id, config) {
    const index = widgets.value.findIndex(w => w.id === id)
    if (index !== -1) {
      const oldWidget = widgets.value[index]
      widgets.value[index] = { ...oldWidget, ...config }
    }
  }

  function getWidget(id) {
    return widgets.value.find(w => w.id === id)
  }

  /**
   * Update slot data for a widget - ensures Vue reactivity
   * Handles both root widgets and nested container children
   */
  function updateSlotData(widgetId, slotId, data) {
    // First try to find in root widgets
    let widget = getWidget(widgetId)
    let parentWidget = null

    // If not found, search in container children
    if (!widget) {
      for (const w of widgets.value) {
        if (w.type === 'gridContainer' && w.children) {
          widget = w.children.find(c => c.id === widgetId)
          if (widget) {
            parentWidget = w
            break
          }
        }
      }
    }

    if (widget && widget.slots) {
      const slotIndex = widget.slots.findIndex(s => s.id === slotId)
      if (slotIndex !== -1) {
        // Create new slots array to trigger reactivity
        const newSlots = [...widget.slots]
        newSlots[slotIndex] = {
          ...newSlots[slotIndex],
          data
        }

        if (parentWidget) {
          // Update nested widget - need to update parent's children array
          const parentIndex = widgets.value.findIndex(w => w.id === parentWidget.id)
          if (parentIndex !== -1) {
            const newChildren = parentWidget.children.map(c =>
              c.id === widgetId ? { ...c, slots: newSlots } : c
            )
            widgets.value[parentIndex] = {
              ...parentWidget,
              children: newChildren
            }
          }
        } else {
          // Update root widget
          const rootIndex = widgets.value.findIndex(w => w.id === widgetId)
          if (rootIndex !== -1) {
            widgets.value[rootIndex] = {
              ...widget,
              slots: newSlots
            }
          }
        }
      }
    }
  }

  function getAvailableWidgetTypes(parentType) {
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
    getAvailableWidgetTypes,
    updateSlotData
  }
})
