import { api } from 'boot/axios'

/**
 * Automatically select the appropriate table based on time range
 * - <= 1 hour: raw (for high-frequency data)
 * - > 1 hour to <= 24 hours: minute (minute-aggregated data)
 * - > 24 hours: hourly (hourly-aggregated data)
 * @param {number} hours - Time range in hours
 * @returns {string} Table name: 'raw', 'minute', or 'hourly'
 */
export function getTableForTimeRange(hours) {
  if (hours <= 1) {
    return 'raw'
  } else if (hours <= 24) {
    return 'minute'
  } else {
    return 'hourly'
  }
}

// Hosts API
export async function getDashboards() {
  const response = await api.get('/api/v1/dashboards')
  return response.data
}

export async function getDashboardMeta() {
  const response = await api.get('/api/v1/dashboards/meta')
  return response.data
}

export async function getDashboard(dashboardId) {
  const response = await api.get(`/api/v1/dashboards/${dashboardId}`)
  return response.data
}

export async function getDefaultDashboard() {
  const response = await api.get('/api/v1/dashboards/default')
  return response.data
}

export async function createDashboard(name, options = {}) {
  const response = await api.post('/api/v1/dashboards', { name, options })
  return response.data
}

export async function saveDashboard(dashboardId, config) {
  const request = { dashboard: config }
  const response = await api.put(`/api/v1/dashboards/${dashboardId}`, request)
  return response.data
}

export async function deleteDashboard(dashboardId) {
  await api.delete(`/api/v1/dashboards/${dashboardId}`)
}

// Hosts API
export async function getHosts() {
  const response = await api.get('/api/v1/hosts')
  return response.data
}

export async function registerHost(host_id, collectors) {
  await api.post('/api/v1/hosts/register', { host_id, collectors })
}

export async function getHostConfig(hostId) {
  const response = await api.get(`/api/v1/hosts/${hostId}/config`)
  return response.data
}

export async function updateHostConfig(hostId, collectors) {
  await api.put(`/api/v1/hosts/${hostId}/config`, { collectors })
}

// Devices API
export async function getDevices(hostId) {
  const response = await api.get(`/api/v1/devices/${hostId}`)
  return response.data
}

export async function getDevice(hostId, deviceId) {
  const response = await api.get(`/api/v1/devices/${hostId}/${deviceId}`)
  return response.data
}

// Metrics API
export async function queryMetrics(hostId, query) {
  const response = await api.get('/api/v1/metrics/query', {
    params: {
      host_id: hostId,
      device_id: query.device_id,
      name: query.name,
      start_ts: query.start_ts,
      end_ts: query.end_ts,
      table: query.table,
      limit: query.limit
    }
  })
  return response.data
}

export async function queryMetricsBatch(hostId, queries) {
  const response = await api.post('/api/v1/metrics/query/batch', {
    host_id: hostId,
    queries
  })
  return response.data.results
}

export async function queryLatestMetric(hostId, query) {
  const response = await api.get('/api/v1/metrics/query/latest', {
    params: {
      host_id: hostId,
      device_id: query.device_id,
      name: query.name
    }
  })
  return response.data
}

export async function queryLatestMetricsBatch(hostId, queries) {
  const response = await api.post('/api/v1/metrics/query/latest/batch', {
    host_id: hostId,
    queries
  })
  return response.data.results
}

export async function getMetricDevices(hostId) {
  const response = await api.get('/api/v1/metrics/devices', {
    params: { host_id: hostId }
  })
  return response.data
}

// Themes API

/** Summaries for the picker: [{ id, name, is_builtin }]. */
export async function getThemes() {
  const response = await api.get('/api/v1/themes')
  return response.data
}

/** One full theme document. */
export async function getTheme(themeId) {
  const response = await api.get(`/api/v1/themes/${themeId}`)
  return response.data
}

/** JSON Schema of a theme document, for editor field discovery. */
export async function getThemeSchema() {
  const response = await api.get('/api/v1/themes/schema')
  return response.data
}

/**
 * Create a theme. The server derives the id from the name, so pass any name
 * (including Cyrillic) and read the assigned id off the response.
 */
export async function createTheme(name, payload) {
  const response = await api.post('/api/v1/themes', { name, payload })
  return response.data
}

/** Replace a theme in full. The id in the path stays authoritative. */
export async function updateTheme(themeId, name, payload) {
  const response = await api.put(`/api/v1/themes/${themeId}`, { name, payload })
  return response.data
}

export async function deleteTheme(themeId) {
  const response = await api.delete(`/api/v1/themes/${themeId}`)
  return response.data
}

/** Portable copy: { id, name, payload }. */
export async function exportTheme(themeId) {
  const response = await api.get(`/api/v1/themes/${themeId}/export`)
  return response.data
}
