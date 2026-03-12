import {
  queryLatestMetricsBatch,
  queryMetricsBatch
} from './api'

/**
 * Data Refresh Service
 *
 * Manages periodic data fetching for dashboard widgets.
 * - Deduplicates identical queries across widgets
 * - Supports both latest value and range queries
 * - Automatically refreshes data at configured intervals
 * - Updates Pinia store with fresh data
 */
class DataRefreshService {
  constructor() {
    this.activeQueries = new Map()
    this.dashboardStore = null
    this.isRunning = false
  }

  /**
   * Initialize the service with dashboard store reference
   */
  init(dashboardStore) {
    this.dashboardStore = dashboardStore
  }

  /**
   * Start data refresh based on current dashboard widgets
   * Stops all existing timers and creates new ones
   */
  start(widgets) {
    console.log('[DataRefreshService] Starting with widgets:', widgets.length)

    // Stop all existing queries
    this.stopAll()

    // Collect all unique queries from widgets
    const queryMap = new Map()

    for (const widget of widgets) {
      this.collectWidgetQueries(widget, queryMap)
    }

    // Also process nested widgets in containers
    for (const widget of widgets) {
      if (widget.type === 'gridContainer' && widget.children) {
        for (const childWidget of widget.children) {
          this.collectWidgetQueries(childWidget, queryMap, widget.hostId)
        }
      }
    }

    // Create active queries for each unique query
    for (const [keyString, queryInfo] of queryMap) {
      this.createQuery(queryInfo.key, queryInfo.interval)
    }

    this.isRunning = true
    console.log('[DataRefreshService] Started with', this.activeQueries.size, 'unique queries')
  }

  /**
   * Collect queries from a widget based on its slots
   */
  collectWidgetQueries(widget, queryMap, parentHostId) {
    if (!widget.hostId && !parentHostId) return
    if (!widget.slots || widget.slots.length === 0) return

    const hostId = widget.hostId || parentHostId
    const queryType = widget.type === 'number' ? 'latest' : 'range'
    const interval = widget.refreshInterval || 5000

    for (const slot of widget.slots) {
      if (!slot.sensor || !slot.deviceId) continue

      const key = {
        hostId,
        deviceId: slot.deviceId,
        metricName: slot.sensor.name,
        table: slot.sensor.table,
        queryType,
        rangeHours: queryType === 'range' ? this.getTimeRangeHours(widget.options) : undefined
      }

      const keyString = this.getQueryKeyString(key)

      const existing = queryMap.get(keyString)
      if (existing) {
        // Merge with existing query - use shortest interval
        existing.interval = Math.min(existing.interval, interval)
        existing.subscribers.add(slot)
      } else {
        queryMap.set(keyString, {
          key,
          interval,
          subscribers: new Set([slot])
        })
      }
    }
  }

  /**
   * Get time range in hours from widget options
   */
  getTimeRangeHours(options) {
    const timeRange = options?.timeRange || '1h'
    const match = timeRange.match(/^(\d+)([hd])$/)
    if (!match) return 1

    const value = parseInt(match[1], 10)
    const unit = match[2]

    return unit === 'h' ? value : value * 24
  }

  /**
   * Generate unique query key string for deduplication
   */
  getQueryKeyString(key) {
    return `${key.hostId}:${key.deviceId}:${key.metricName}:${key.table}:${key.queryType}:${key.rangeHours || 'latest'}`
  }

  /**
   * Create a new active query
   */
  createQuery(key, interval) {
    const keyString = this.getQueryKeyString(key)

    console.log('[DataRefreshService] Creating query:', keyString, 'interval:', interval)

    const activeQuery = {
      key,
      subscribers: new Set(),
      interval,
      timerId: null,
      lastData: null,
      pendingRequest: null
    }

    this.activeQueries.set(keyString, activeQuery)

    // Execute immediately
    this.executeQuery(activeQuery)

    // Set up periodic refresh
    activeQuery.timerId = setInterval(() => {
      this.executeQuery(activeQuery)
    }, interval)
  }

  /**
   * Execute a single query
   */
  async executeQuery(query) {
    if (!this.dashboardStore) {
      console.warn('[DataRefreshService] Dashboard store not initialized')
      return
    }

    const { key } = query

    try {
      if (key.queryType === 'latest') {
        await this.executeLatestQuery(query)
      } else {
        await this.executeRangeQuery(query)
      }
    } catch (error) {
      console.error('[DataRefreshService] Query error:', key, error)
    }
  }

  /**
   * Execute latest value query
   */
  async executeLatestQuery(query) {
    const { key } = query

    const queries = [{
      device_id: key.deviceId,
      name: key.metricName
    }]

    const results = await queryLatestMetricsBatch(key.hostId, queries)

    if (results && results.length > 0) {
      const result = results[0]
      const data = {
        hostId: key.hostId,
        deviceId: key.deviceId,
        metricName: key.metricName,
        table: key.table,
        queryType: 'latest',
        data: result.data ? [result.data] : [],
        lastUpdated: Date.now()
      }

      query.lastData = data
      this.notifySubscribers(query, data)
    }
  }

  /**
   * Execute range query
   */
  async executeRangeQuery(query) {
    const { key } = query

    const now = Date.now()
    const hours = key.rangeHours || 1
    const startTs = now - (hours * 60 * 60 * 1000)

    const queries = [{
      device_id: key.deviceId,
      name: key.metricName,
      table: key.table,
      start_ts: startTs,
      end_ts: now,
      limit: 1000
    }]

    const results = await queryMetricsBatch(key.hostId, queries)

    if (results && results.length > 0) {
      const result = results[0]
      const data = {
        hostId: key.hostId,
        deviceId: key.deviceId,
        metricName: key.metricName,
        table: key.table,
        queryType: 'range',
        data: result.data || [],
        lastUpdated: Date.now()
      }

      query.lastData = data
      this.notifySubscribers(query, data)
    }
  }

  /**
   * Notify all subscribers of new data
   */
  notifySubscribers(query, data) {
    for (const subscriber of query.subscribers) {
      try {
        subscriber(data)
      } catch (error) {
        console.error('[DataRefreshService] Subscriber error:', error)
      }
    }
  }

  /**
   * Subscribe to query updates
   * Returns unsubscribe function
   */
  subscribe(
    hostId,
    deviceId,
    metricName,
    table,
    queryType,
    callback,
    rangeHours
  ) {
    const key = {
      hostId,
      deviceId,
      metricName,
      table,
      queryType,
      rangeHours
    }

    const keyString = this.getQueryKeyString(key)
    let activeQuery = this.activeQueries.get(keyString)

    if (!activeQuery) {
      // Create query if it doesn't exist (shouldn't happen in normal flow)
      console.warn('[DataRefreshService] Query not found, creating:', keyString)
      this.createQuery(key, 5000)
      activeQuery = this.activeQueries.get(keyString)
    }

    activeQuery.subscribers.add(callback)

    // Immediately notify with last data if available
    if (activeQuery.lastData) {
      callback(activeQuery.lastData)
    }

    // Return unsubscribe function
    return () => {
      activeQuery?.subscribers.delete(callback)

      // Clean up query if no subscribers
      if (activeQuery && activeQuery.subscribers.size === 0) {
        this.removeQuery(keyString)
      }
    }
  }

  /**
   * Remove a query
   */
  removeQuery(keyString) {
    const query = this.activeQueries.get(keyString)
    if (query) {
      if (query.timerId) {
        clearInterval(query.timerId)
      }
      this.activeQueries.delete(keyString)
      console.log('[DataRefreshService] Removed query:', keyString)
    }
  }

  /**
   * Stop all queries
   */
  stopAll() {
    console.log('[DataRefreshService] Stopping all queries')

    for (const [keyString, query] of this.activeQueries) {
      if (query.timerId) {
        clearInterval(query.timerId)
      }
    }

    this.activeQueries.clear()
    this.isRunning = false
  }

  /**
   * Restart with new widgets configuration
   */
  restart(widgets) {
    console.log('[DataRefreshService] Restarting...')
    this.start(widgets)
  }

  /**
   * Get current running status
   */
  getIsRunning() {
    return this.isRunning
  }

  /**
   * Get active query count
   */
  getActiveQueryCount() {
    return this.activeQueries.size
  }

  /**
   * Get debug info about active queries
   */
  getDebugInfo() {
    return Array.from(this.activeQueries.values()).map(q => ({
      key: this.getQueryKeyString(q.key),
      interval: q.interval,
      subscribers: q.subscribers.size,
      hasData: !!q.lastData
    }))
  }
}

// Singleton instance
export const dataRefreshService = new DataRefreshService()
