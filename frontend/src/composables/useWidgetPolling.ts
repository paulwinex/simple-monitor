import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useMetricsStore } from '../stores/metrics'
import type { WidgetConfig, MetricOut } from '../types'
import { getTimeRangeSeconds } from '../utils'

interface UseWidgetPollingOptions {
  widget: WidgetConfig
  enabled?: boolean
  onRefresh?: (data: MetricOut[] | MetricOut | null) => void
}

/**
 * Composable for handling widget metric polling
 */
export function useWidgetPolling(options: UseWidgetPollingOptions) {
  const { widget, enabled = true, onRefresh } = options

  const metricsStore = useMetricsStore()
  const data = ref<MetricOut[] | MetricOut | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isTimeSeriesWidget = computed(() => {
    // Chart widgets need time range data
    return widget.type === 'chart'
  })

  // Fetch latest data for widget
  async function fetchData() {
    if (!enabled) return

    loading.value = true
    error.value = null

    try {
      if (isTimeSeriesWidget.value) {
        // Fetch time range data for chart widgets
        const timeRange = (widget.options as any).timeRange || '1h'
        const { start, end } = getTimeRangeSeconds(timeRange)

        const queries = widget.sensors.map((sensor) => ({
          device_id: widget.device_id,
          name: sensor.name,
          start_ts: start,
          end_ts: end,
          table: sensor.table,
          limit: 1000,
        }))

        const results = await metricsStore.queryRangeBatch(widget.host_id, queries)

        // Combine results from all sensors
        const allData: MetricOut[] = []
        results.forEach((metricData) => {
          allData.push(...metricData)
        })

        // Sort by timestamp
        allData.sort((a, b) => a.timestamp - b.timestamp)
        data.value = allData
      } else {
        // Fetch latest value for first sensor (for simple widgets)
        if (widget.sensors.length > 0) {
          const sensor = widget.sensors[0]
          const result = await metricsStore.queryLatest({
            host_id: widget.host_id,
            device_id: widget.device_id,
            name: sensor.name,
          })
          data.value = result
        }
      }

      onRefresh?.(data.value)
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch data'
      console.error('Widget polling error:', err)
    } finally {
      loading.value = false
    }
  }

  // Start polling
  function startPolling() {
    const queryKey = `${widget.host_id}:${widget.device_id}:${widget.sensors[0]?.name || ''}`

    metricsStore.startPolling({
      id: queryKey,
      host_id: widget.host_id,
      device_id: widget.device_id,
      name: widget.sensors[0]?.name || '',
      table: widget.sensors[0]?.table,
      interval: widget.refresh_interval || 5000,
      lastFetch: 0,
    })
  }

  // Stop polling
  function stopPolling() {
    if (widget.sensors.length > 0) {
      metricsStore.stopPolling(
        widget.host_id,
        widget.device_id,
        widget.sensors[0].name
      )
    }
  }

  // Manual refresh
  function refresh() {
    fetchData()
  }

  // Watch for widget changes
  watch(
    () => widget.refresh_interval,
    (newInterval) => {
      if (newInterval) {
        stopPolling()
        startPolling()
      }
    }
  )

  // Lifecycle
  onMounted(() => {
    if (enabled) {
      fetchData()
      // For simple widgets, set up polling
      if (!isTimeSeriesWidget.value) {
        startPolling()
      }
    }
  })

  onUnmounted(() => {
    stopPolling()
  })

  return {
    data,
    loading,
    error,
    refresh,
    fetchData,
  }
}
