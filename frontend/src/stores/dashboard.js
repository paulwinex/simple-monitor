import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Notify } from 'quasar'
import { getDefaultDashboard, getDashboard, saveDashboard as saveDashboardApi, getHosts, getMetricDevices } from 'src/services/api'
import { useThemeStore } from 'stores/theme'
import { getSavedTheme } from 'src/utils/themes'
import { compact } from 'src/utils/layout'

const DEFAULT_GRID_OPTIONS = {
  colNum: 12,
  rowHeight: 30,
  containerRowHeight: 25,
  containerGapOnBorders: true,
  verticalCompact: true,
  margin: { x: 10, y: 10 },
  padding: { top: 16, right: 16, bottom: 16, left: 16 },
  widgetBackgroundOpacity: 100,
  widgetHeaderOpacity: 100,
  widgetBorderOpacity: 100
}

const CURRENT_DASHBOARD_ID_KEY = 'sm-current-dashboard-id'

export const useDashboardStore = defineStore('dashboard', () => {
  const layout = ref([])
  const widgets = ref([])
  const gridOptions = ref({ ...DEFAULT_GRID_OPTIONS })
  const loading = ref(false)
  const error = ref(null)
  const hosts = ref([])
  // Currently open dashboard (persisted across reloads in localStorage).
  const currentDashboardId = ref(
    localStorage.getItem(CURRENT_DASHBOARD_ID_KEY) ? Number(localStorage.getItem(CURRENT_DASHBOARD_ID_KEY)) : null
  )
  const currentDashboardName = ref('')
  const currentOptions = ref({})
  // Deep snapshot of the last DB-persisted dashboard state ({ layout, widgets }).
  // Used by "Reset widget" to restore a single widget to its last saved state.
  const savedSnapshot = ref(null)

  const isLoading = computed(() => loading.value)
  const hasError = computed(() => error.value !== null)

  function setCurrentDashboard(id, name, options) {
    currentDashboardId.value = Number(id) || 1
    currentDashboardName.value = name || `Dashboard ${currentDashboardId.value}`
    currentOptions.value = options || {}
    localStorage.setItem(CURRENT_DASHBOARD_ID_KEY, String(currentDashboardId.value))
  }

  const themeStore = useThemeStore()

  async function fetchDashboardFromApi(dashboardId = null) {
    const targetId = dashboardId ?? currentDashboardId.value ?? 1
    try {
      let response
      try {
        response = await getDashboard(targetId)
      } catch (err) {
        // Fall back to the default dashboard if the requested id no longer exists
        response = await getDefaultDashboard()
      }
      const dashboard = response.dashboard

      setCurrentDashboard(response.id, dashboard.name, dashboard.options || {})
      themeStore.setThemeId(currentOptions.value.theme || getSavedTheme().id)

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
        gridOptions: { ...DEFAULT_GRID_OPTIONS, ...(dashboard.grid_options || {}) }
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
      id: currentDashboardId.value ?? null,
      name: currentDashboardName.value || 'default',
      version: 1,
      layout: layoutDict,
      widgets: widgetsDict,
      grid_options: state.gridOptions,
      options: { ...(currentOptions.value || {}), theme: themeStore.currentThemeId },
      updated_at: Math.floor(Date.now() / 1000)
    }

    await saveDashboardApi(currentDashboardId.value ?? 'default', payload)
  }

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

  async function loadDashboard(id = null) {
    loading.value = true
    error.value = null

    try {
      const data = await fetchDashboardFromApi(id)
      layout.value = data.layout
      widgets.value = data.widgets
      gridOptions.value = { ...DEFAULT_GRID_OPTIONS, ...(data.gridOptions || {}) }
      captureSavedSnapshot()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load dashboard'
      console.error('Failed to load dashboard:', err)
    } finally {
      loading.value = false
    }
  }

  // Reload the currently open dashboard (used when canceling edit mode)
  async function reloadDashboard() {
    await loadDashboard(currentDashboardId.value)
  }

  async function saveDashboard() {
    try {
      await saveDashboardToApi({ layout: layout.value, widgets: widgets.value, gridOptions: gridOptions.value })
      captureSavedSnapshot()
      Notify.create({
        message: 'Dashboard saved',
        position: 'bottom',
        type: 'positive',
        timeout: 2000
      })
    } catch (err) {
      console.error('Failed to save dashboard:', err)
      Notify.create({
        message: 'Failed to save dashboard',
        position: 'bottom',
        type: 'negative',
        timeout: 3000
      })
      throw err
    }
  }

  function updateGridOptions(options) {
    gridOptions.value = { ...gridOptions.value, ...options }
  }

  function recompactGrid() {
    layout.value = compact(layout.value, gridOptions.value.verticalCompact)
  }

  function addWidget(widget, parentId) {
    console.log('[DashboardStore] addWidget called:', widget.type, 'parentId:', parentId)

    if (parentId) {
      // Add to container widget
      const parentIndex = widgets.value.findIndex(w => w.id === parentId)
      console.log('[DashboardStore] parentIndex:', parentIndex)

      if (parentIndex !== -1) {
        const parent = widgets.value[parentIndex]
        console.log('[DashboardStore] parent found:', parent.id, 'existing children:', parent.children?.length || 0)

        // Initialize children and childLayout if not present
        const children = parent.children ? [...parent.children] : []
        const childLayout = parent.childLayout ? [...parent.childLayout] : []

        // Generate unique widget ID using timestamp and random number
        widget.id = `${parentId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        console.log('[DashboardStore] new widget id:', widget.id)
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

        console.log('[DashboardStore] parent updated, new children count:', widgets.value[parentIndex].children.length)
      } else {
        console.log('[DashboardStore] parent NOT found!')
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
   * Find a widget by id across root widgets and nested container children.
   * Returns the live (reactive) widget object or null.
   */
  function findWidgetDeep(id) {
    function search(items) {
      for (const w of items) {
        if (w.id === id) return w
        if (w.children && w.children.length) {
          const found = search(w.children)
          if (found) return found
        }
      }
      return null
    }
    return search(widgets.value)
  }

  /**
   * Apply a config patch to a live widget (root or nested) in memory only.
   * Does NOT persist to the backend - persistence happens via saveDashboard().
   */
  function updateWidgetLive(id, config) {
    const widget = findWidgetDeep(id)
    if (!widget) return
    Object.assign(widget, config)
  }

  /**
   * Capture a deep snapshot of the current dashboard state.
   * Called after load and after a successful save.
   */
  function captureSavedSnapshot() {
    savedSnapshot.value = JSON.parse(JSON.stringify({
      layout: layout.value,
      widgets: widgets.value
    }))
  }

  /**
   * Store a widget (plain object) back into the dashboard tree (root or nested).
   */
  function replaceWidgetDeep(id, replacement) {
    function replace(items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
          items[i] = replacement
          return true
        }
        if (items[i].children && items[i].children.length) {
          if (replace(items[i].children)) return true
        }
      }
      return false
    }
    return replace(widgets.value)
  }

  /**
   * Reset a single widget (root or nested) to its last DB-saved state.
   * Returns true if the widget had a saved version and was reset.
   */
  function resetWidgetToSaved(id) {
    if (!savedSnapshot.value || !id) return false
    const snapshotWidgets = savedSnapshot.value.widgets
    const snapshotWidget = findWidgetInTreeById(snapshotWidgets, id)
    if (!snapshotWidget) return false

    const clone = JSON.parse(JSON.stringify(snapshotWidget))
    return replaceWidgetDeep(id, clone)
  }

  /**
   * Whether a widget with this id exists in the last DB-saved snapshot.
   */
  function hasSavedWidget(id) {
    if (!savedSnapshot.value || !id) return false
    return findWidgetInTreeById(savedSnapshot.value.widgets, id) !== null
  }

  function findWidgetInTreeById(items, id) {
    for (const w of items) {
      if (w.id === id) return w
      if (w.children && w.children.length) {
        const found = findWidgetInTreeById(w.children, id)
        if (found) return found
      }
    }
    return null
  }

  /**
   * Update slot data for a widget - ensures Vue reactivity
   * Handles both root widgets and nested container children
   */
  function updateSlotData(widgetId, slotId, data) {
    // First try to find in root widgets
    let widget = getWidget(widgetId)

    // If not found, search in container children
    if (!widget) {
      for (const w of widgets.value) {
        if (w.type === 'gridContainer' && w.children) {
          widget = w.children.find(c => c.id === widgetId)
          if (widget) {
            break
          }
        }
      }
    }

    if (widget && widget.slots) {
      const slotIndex = widget.slots.findIndex(s => s.id === slotId)
      if (slotIndex !== -1) {
        // Update slot data in place: replacing the slot object inside the
        // reactive array is enough to trigger reactivity, while keeping the
        // widget object identity stable. This prevents editingWidget from
        // getting a brand-new object on every data refresh, which caused the
        // edit dialog to lose focus and reset to defaults.
        widget.slots[slotIndex] = {
          ...widget.slots[slotIndex],
          data
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
    currentDashboardId,
    currentDashboardName,
    currentOptions,
    setCurrentDashboard,
    loadDashboard,
    reloadDashboard,
    saveDashboard,
    loadHosts,
    addWidget,
    removeWidget,
    updateLayout,
    updateWidget,
    updateGridOptions,
    recompactGrid,
    getWidget,
    findWidgetDeep,
    updateWidgetLive,
    resetWidgetToSaved,
    hasSavedWidget,
    getAvailableWidgetTypes,
    updateSlotData
  }
})
