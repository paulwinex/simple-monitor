import { api } from 'boot/axios'
import type { DashboardConfig, DashboardGetResponse, DashboardSaveRequest, DashboardSaveResponse } from 'src/components/models'

export interface HostWithDevices {
  host_id: string
  registered_at: number
  last_seen: number
  devices: Device[]
}

export interface Device {
  name: string
  type: string
  label: string
  enabled: boolean
  details: Record<string, any>
}

export interface MetricQuery {
  device_id: string
  name: string
  start_ts?: number | null
  end_ts?: number | null
  table: 'raw' | 'hourly' | 'history'
  limit?: number
}

export interface MetricData {
  timestamp: number
  value: number
}

export interface MetricQueryResult {
  device_id: string
  name: string
  data: MetricData[]
}

export interface LatestMetricQuery {
  device_id: string
  name: string
}

export interface LatestMetricResult {
  device_id: string
  name: string
  data: MetricData | null
}

// Dashboard API
export async function getDashboards(): Promise<string[]> {
  const response = await api.get<string[]>('/api/v1/dashboards')
  return response.data
}

export async function getDashboard(dashboardId: string): Promise<DashboardGetResponse> {
  const response = await api.get<DashboardGetResponse>(`/api/v1/dashboards/${dashboardId}`)
  return response.data
}

export async function getDefaultDashboard(): Promise<DashboardGetResponse> {
  const response = await api.get<DashboardGetResponse>('/api/v1/dashboards/default')
  return response.data
}

export async function saveDashboard(dashboardId: string, config: DashboardConfig): Promise<DashboardSaveResponse> {
  const request: DashboardSaveRequest = { dashboard: config }
  const response = await api.put<DashboardSaveResponse>(`/api/v1/dashboards/${dashboardId}`, request)
  return response.data
}

export async function deleteDashboard(dashboardId: string): Promise<void> {
  await api.delete(`/api/v1/dashboards/${dashboardId}`)
}

// Hosts API
export async function getHosts(): Promise<HostWithDevices[]> {
  const response = await api.get<HostWithDevices[]>('/api/v1/hosts')
  return response.data
}

export async function registerHost(host_id: string, collectors: string[]): Promise<void> {
  await api.post('/api/v1/hosts/register', { host_id, collectors })
}

export async function getHostConfig(hostId: string): Promise<{ version: number; collectors: Record<string, any> }> {
  const response = await api.get(`/api/v1/hosts/${hostId}/config`)
  return response.data
}

export async function updateHostConfig(hostId: string, collectors: Record<string, any>): Promise<void> {
  await api.put(`/api/v1/hosts/${hostId}/config`, { collectors })
}

// Devices API
export async function getDevices(hostId: string): Promise<Device[]> {
  const response = await api.get<Device[]>(`/api/v1/devices/${hostId}`)
  return response.data
}

export async function getDevice(hostId: string, deviceId: string): Promise<Device> {
  const response = await api.get<Device>(`/api/v1/devices/${hostId}/${deviceId}`)
  return response.data
}

// Metrics API
export async function queryMetrics(hostId: string, query: MetricQuery): Promise<MetricQueryResult> {
  const response = await api.get<MetricQueryResult>('/api/v1/metrics/query', {
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

export async function queryMetricsBatch(hostId: string, queries: MetricQuery[]): Promise<MetricQueryResult[]> {
  const response = await api.post<{ results: MetricQueryResult[] }>('/api/v1/metrics/query/batch', {
    host_id: hostId,
    queries
  })
  return response.data.results
}

export async function queryLatestMetric(hostId: string, query: LatestMetricQuery): Promise<LatestMetricResult> {
  const response = await api.get<LatestMetricResult>('/api/v1/metrics/query/latest', {
    params: {
      host_id: hostId,
      device_id: query.device_id,
      name: query.name
    }
  })
  return response.data
}

export async function queryLatestMetricsBatch(hostId: string, queries: LatestMetricQuery[]): Promise<LatestMetricResult[]> {
  const response = await api.post<{ results: LatestMetricResult[] }>('/api/v1/metrics/query/latest/batch', {
    host_id: hostId,
    queries
  })
  return response.data.results
}

export async function getMetricDevices(hostId: string): Promise<string[]> {
  const response = await api.get<string[]>('/api/v1/metrics/devices', {
    params: { host_id: hostId }
  })
  return response.data
}
