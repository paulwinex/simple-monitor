// API service layer - re-exports client and provides convenience methods
export { api } from './client'

import { api } from './client'
import type {
  HostWithDevices,
  DeviceWithMetrics,
  MetricOut,
  BatchQueryRequest,
  BatchLatestRequest,
  BatchQueryResponse,
  BatchLatestResponse,
  DashboardGetResponse,
  DashboardSaveRequest,
  DashboardSaveResponse,
} from '../types'

// === Hosts Service ===
export const hosts = {
  list: (): Promise<HostWithDevices[]> => api.getHosts(),
  getConfig: (hostId: string) => api.getHostConfig(hostId),
  updateConfig: (hostId: string, config: any) => api.updateHostConfig(hostId, config),
}

// === Devices Service ===
export const devices = {
  listWithMetrics: (hostId: string): Promise<DeviceWithMetrics[]> =>
    api.getDevicesWithMetrics(hostId),
}

// === Metrics Service ===
export const metrics = {
  query: (params: any) => api.queryMetrics(params),
  queryLatest: (params: any) => api.queryLatest(params),
  queryBatch: (payload: BatchQueryRequest): Promise<BatchQueryResponse> =>
    api.queryBatch(payload),
  queryLatestBatch: (payload: BatchLatestRequest): Promise<BatchLatestResponse> =>
    api.queryLatestBatch(payload),
}

// === Dashboards Service ===
export const dashboards = {
  list: () => api.getDashboards(),
  get: (id: number): Promise<DashboardGetResponse> => api.getDashboard(id),
  getDefault: (): Promise<DashboardGetResponse> => api.getDefaultDashboard(),
  save: (payload: DashboardSaveRequest): Promise<DashboardSaveResponse> =>
    api.saveDashboard(payload),
  delete: (id: number) => api.deleteDashboard(id),
}
