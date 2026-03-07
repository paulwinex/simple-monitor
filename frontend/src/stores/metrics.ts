import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { metrics } from '../api'
import type { MetricOut, BatchLatestRequest, BatchQueryRequest } from '../types'

export interface ActiveQuery {
  id: string
  host_id: string
  device_id: string
  name: string
  table?: 'raw' | 'hourly' | 'history' | 'daily'
  interval: number
  lastFetch: number
}

export const useMetricsStore = defineStore('metrics', () => {
  // State
  const activeQueries = ref<Map<string, ActiveQuery>>(new Map())
  const refreshIntervals = ref<Map<string, ReturnType<typeof setInterval>>>(new Map())
  const metricCache = ref<Map<string, { data: MetricOut | null; timestamp: number }>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activeQueryCount = computed(() => activeQueries.value.size)

  // Actions
  function generateQueryKey(host_id: string, device_id: string, name: string): string {
    return `${host_id}:${device_id}:${name}`
  }

  function startPolling(query: ActiveQuery) {
    const key = generateQueryKey(query.host_id, query.device_id, query.name)

    // Don't start if already polling
    if (activeQueries.value.has(key)) {
      return
    }

    activeQueries.value.set(key, query)

    // Fetch immediately
    fetchLatestMetric(query)

    // Set up interval
    const intervalId = setInterval(() => {
      fetchLatestMetric(query)
    }, query.interval)

    refreshIntervals.value.set(key, intervalId)
  }

  function stopPolling(host_id: string, device_id: string, name: string) {
    const key = generateQueryKey(host_id, device_id, name)

    // Clear interval
    const intervalId = refreshIntervals.value.get(key)
    if (intervalId) {
      clearInterval(intervalId)
      refreshIntervals.value.delete(key)
    }

    // Remove from active queries
    activeQueries.value.delete(key)
  }

  function stopAllPolling() {
    refreshIntervals.value.forEach((intervalId) => clearInterval(intervalId))
    refreshIntervals.value.clear()
    activeQueries.value.clear()
  }

  async function fetchLatestMetric(query: ActiveQuery) {
    loading.value = true
    try {
      const key = generateQueryKey(query.host_id, query.device_id, query.name)
      const response = await metrics.queryLatest({
        host_id: query.host_id,
        device_id: query.device_id,
        name: query.name,
      })

      metricCache.value.set(key, {
        data: response,
        timestamp: Date.now(),
      })

      query.lastFetch = Date.now()
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch metric'
      console.error('Failed to fetch metric:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchLatestBatch(
    host_id: string,
    queries: { device_id: string; name: string }[]
  ): Promise<Map<string, MetricOut | null>> {
    loading.value = true
    try {
      const payload: BatchLatestRequest = {
        host_id,
        queries,
      }

      const response = await metrics.queryLatestBatch(payload)
      const result = new Map<string, MetricOut | null>()

      response.results.forEach((r) => {
        const key = generateQueryKey(host_id, r.device_id, r.name)
        result.set(key, r.data)
        metricCache.value.set(key, {
          data: r.data,
          timestamp: Date.now(),
        })
      })

      return result
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch metrics batch'
      console.error('Failed to fetch metrics batch:', err)
      return new Map()
    } finally {
      loading.value = false
    }
  }

  async function queryRange(
    host_id: string,
    device_id: string,
    name: string,
    start_ts: number,
    end_ts: number,
    table: 'raw' | 'hourly' | 'history' | 'daily' = 'raw',
    limit: number = 1000
  ): Promise<MetricOut[]> {
    loading.value = true
    try {
      return await metrics.query({
        host_id,
        device_id,
        name,
        start_ts,
        end_ts,
        table,
        limit,
      })
    } catch (err: any) {
      error.value = err.message || 'Failed to query metrics'
      console.error('Failed to query metrics:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  async function queryRangeBatch(
    host_id: string,
    queries: {
      device_id: string
      name: string
      start_ts: number
      end_ts: number
      table?: 'raw' | 'hourly' | 'history' | 'daily'
      limit?: number
    }[]
  ): Promise<Map<string, MetricOut[]>> {
    loading.value = true
    try {
      const payload: BatchQueryRequest = { host_id, queries }
      const response = await metrics.queryBatch(payload)
      const result = new Map<string, MetricOut[]>()

      response.results.forEach((r) => {
        const key = generateQueryKey(host_id, r.device_id, r.name)
        result.set(key, r.data)
      })

      return result
    } catch (err: any) {
      error.value = err.message || 'Failed to query metrics batch'
      console.error('Failed to query metrics batch:', err)
      return new Map()
    } finally {
      loading.value = false
    }
  }

  function getCachedValue(
    host_id: string,
    device_id: string,
    name: string
  ): MetricOut | null {
    const key = generateQueryKey(host_id, device_id, name)
    const cached = metricCache.value.get(key)
    return cached?.data || null
  }

  function clearCache() {
    metricCache.value.clear()
  }

  function reset() {
    stopAllPolling()
    clearCache()
    error.value = null
    loading.value = false
  }

  return {
    // State
    activeQueries,
    refreshIntervals,
    metricCache,
    loading,
    error,
    // Computed
    activeQueryCount,
    // Actions
    generateQueryKey,
    startPolling,
    stopPolling,
    stopAllPolling,
    fetchLatestMetric,
    fetchLatestBatch,
    queryRange,
    queryRangeBatch,
    getCachedValue,
    clearCache,
    reset,
  }
})
