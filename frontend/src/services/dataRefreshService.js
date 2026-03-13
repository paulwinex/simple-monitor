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
 * - Updates widget slot data directly in the dashboard store
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

    // Compare with existing queries - only create/remove what changed
    const newQueryKeys = new Set(queryMap.keys())
    const existingKeys = new Set(this.activeQueries.keys())

    // Remove queries that no longer exist
    for (const keyString of existingKeys) {
      if (!newQueryKeys.has(keyString)) {
        this.removeQuery(keyString)
      }
    }

    // Create new queries or update existing ones
    for (const [keyString, queryInfo] of queryMap) {
      const existingQuery = this.activeQueries.get(keyString)
      if (existingQuery) {
        // Update subscribers and interval if changed
        existingQuery.subscribers = queryInfo.subscribers
        if (existingQuery.interval !== queryInfo.interval) {
          existingQuery.interval = queryInfo.interval
          // Restart timer with new interval
          if (existingQuery.timerId) {
            clearInterval(existingQuery.timerId)
          }
          existingQuery.timerId = setInterval(() => {
            this.executeQuery(existingQuery)
          }, queryInfo.interval)
        }
      } else {
        // Create new query
        this.createQuery(queryInfo.key, queryInfo.interval, queryInfo.subscribers)
      }
    }

    this.isRunning = true
  }

  /**
   * Collect queries from a widget based on its slots
   */
  collectWidgetQueries(widget, queryMap, parentHostId) {
    // For container widgets, use parent's hostId
    const widgetHostId = widget.hostId || parentHostId
    if (!widget.slots || widget.slots.length === 0) return

    const queryType = widget.type === 'number' ? 'latest' : 'range'
    const interval = widget.refreshInterval || 5000

    for (const slot of widget.slots) {
      if (!slot.sensor || !slot.deviceId) {
        continue
      }

      // Each slot can have its own hostId, or inherit from widget/parent
      const hostId = slot.hostId || widgetHostId
      if (!hostId) {
        continue
      }

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
        // Add subscriber reference
        existing.subscribers.push({ widgetId: widget.id, slotId: slot.id })
      } else {
        queryMap.set(keyString, {
          key,
          interval,
          subscribers: [{ widgetId: widget.id, slotId: slot.id }]
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
  createQuery(key, interval, subscribers) {
    const keyString = this.getQueryKeyString(key)

    const activeQuery = {
      key,
      subscribers: subscribers || [],
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

    const now = Math.floor(Date.now() / 1000)  // Convert to seconds
    const hours = key.rangeHours || 1
    const startTs = now - (hours * 60 * 60)  // Seconds calculation

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
   * Notify all subscribers of new data by updating slot.data in the store
   */
  notifySubscribers(query, data) {
    if (!this.dashboardStore) return

    for (const subscriber of query.subscribers) {
      try {
        const { widgetId, slotId } = subscriber
        // Use the store's updateSlotData method for proper reactivity
        this.dashboardStore.updateSlotData(widgetId, slotId, data)
      } catch (error) {
        console.error('[DataRefreshService] Subscriber error:', error)
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
    }
  }

  /**
   * Stop all queries
   */
  stopAll() {
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
      subscribers: q.subscribers.length,
      hasData: !!q.lastData
    }))
  }
}

// Singleton instance
export const dataRefreshService = new DataRefreshService()
