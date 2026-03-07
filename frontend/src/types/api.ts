// API Types based on backend schema

// === Hosts ===
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

export interface DeviceWithMetrics {
  name: string
  type: string
  label: string
  metrics: string[]
}

export interface HostConfig {
  host_id: string
  version: number
  collectors: Record<string, any>
}

export interface HostConfigUpdate {
  collectors: Record<string, any>
}

// === Metrics ===
export interface MetricOut {
  timestamp: number
  value: number
}

export interface MetricQueryParams {
  host_id: string
  device_id: string
  name: string
  start_ts: number
  end_ts: number
  table?: 'raw' | 'hourly' | 'history' | 'daily'
  limit?: number
}

export interface MetricLatestParams {
  host_id: string
  device_id: string
  name: string
}

export interface BatchQueryRequest {
  host_id: string
  queries: {
    device_id: string
    name: string
    start_ts?: number
    end_ts?: number
    table?: 'raw' | 'hourly' | 'history' | 'daily'
    limit?: number
  }[]
}

export interface BatchLatestRequest {
  host_id: string
  queries: { device_id: string; name: string }[]
}

export interface BatchQueryResult {
  device_id: string
  name: string
  data: MetricOut[]
}

export interface BatchLatestResult {
  device_id: string
  name: string
  data: MetricOut | null
}

export interface BatchQueryResponse {
  results: BatchQueryResult[]
}

export interface BatchLatestResponse {
  results: BatchLatestResult[]
}

// === Dashboards ===
export type TableType = 'raw' | 'hourly' | 'history' | 'daily'

export interface WidgetSensorConfig {
  name: string
  table: TableType
}

export interface WidgetConfig {
  id: string
  type: string
  title: string
  host_id: string
  device_id: string
  sensors: WidgetSensorConfig[]
  options: Record<string, any>
  refresh_interval: number
}

export interface GridLayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  min_w?: number
  min_h?: number
  max_w?: number
  max_h?: number
  static?: boolean
}

export interface DashboardConfig {
  id?: number
  name: string
  version: number
  layout: GridLayoutItem[]
  widgets: WidgetConfig[]
  updated_at: number
}

export interface DashboardGetResponse {
  id: number
  version: number
  dashboard: DashboardConfig
}

export interface DashboardSaveRequest {
  dashboard: DashboardConfig
}

export interface DashboardSaveResponse {
  id: number
  version: number
  saved: boolean
}

export interface DashboardListResponse {
  id: number
  name: string
  version: number
  updated_at: number
}[]
