import axios, { AxiosInstance, AxiosError } from 'axios'
import type {
  HostWithDevices,
  HostConfig,
  HostConfigUpdate,
  DeviceWithMetrics,
  MetricOut,
  MetricQueryParams,
  MetricLatestParams,
  BatchQueryRequest,
  BatchLatestRequest,
  BatchQueryResponse,
  BatchLatestResponse,
  DashboardGetResponse,
  DashboardSaveRequest,
  DashboardSaveResponse,
  DashboardListResponse,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

class ApiClient {
  private client: AxiosInstance

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('API Error:', error.message)
        return Promise.reject(error)
      }
    )
  }

  // === Hosts API ===

  async getHosts(): Promise<HostWithDevices[]> {
    const response = await this.client.get<HostWithDevices[]>('/hosts')
    return response.data
  }

  async getHostConfig(hostId: string): Promise<HostConfig> {
    const response = await this.client.get<HostConfig>(`/hosts/${hostId}/config`)
    return response.data
  }

  async updateHostConfig(hostId: string, config: HostConfigUpdate): Promise<HostConfig> {
    const response = await this.client.put<HostConfig>(`/hosts/${hostId}/config`, config)
    return response.data
  }

  // === Devices API ===

  async getDevicesWithMetrics(hostId: string): Promise<DeviceWithMetrics[]> {
    const response = await this.client.get<DeviceWithMetrics[]>('/metrics/devices', {
      params: { host_id: hostId },
    })
    return response.data
  }

  // === Metrics API ===

  async queryMetrics(params: MetricQueryParams): Promise<MetricOut[]> {
    const response = await this.client.get<MetricOut[]>('/metrics/query', { params })
    return response.data
  }

  async queryLatest(params: MetricLatestParams): Promise<MetricOut | null> {
    const response = await this.client.get<MetricOut | null>('/metrics/query/latest', {
      params,
    })
    return response.data
  }

  async queryBatch(payload: BatchQueryRequest): Promise<BatchQueryResponse> {
    const response = await this.client.post<BatchQueryResponse>('/metrics/query/batch', payload)
    return response.data
  }

  async queryLatestBatch(payload: BatchLatestRequest): Promise<BatchLatestResponse> {
    const response = await this.client.post<BatchLatestResponse>(
      '/metrics/query/latest/batch',
      payload
    )
    return response.data
  }

  // === Dashboards API ===

  async getDashboards(): Promise<DashboardListResponse> {
    const response = await this.client.get<DashboardListResponse>('/dashboards')
    return response.data
  }

  async getDashboard(id: number): Promise<DashboardGetResponse> {
    const response = await this.client.get<DashboardGetResponse>(`/dashboards/${id}`)
    return response.data
  }

  async getDefaultDashboard(): Promise<DashboardGetResponse> {
    const response = await this.client.get<DashboardGetResponse>('/dashboards/default')
    return response.data
  }

  async saveDashboard(payload: DashboardSaveRequest): Promise<DashboardSaveResponse> {
    const dashboardId = payload.dashboard.id || 1
    const response = await this.client.put<DashboardSaveResponse>(
      `/dashboards/${dashboardId}`,
      payload
    )
    return response.data
  }

  async deleteDashboard(id: number): Promise<{ deleted: boolean }> {
    const response = await this.client.delete<{ deleted: boolean }>(`/dashboards/${id}`)
    return response.data
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL)
export default api
