export interface Todo {
  id: number;
  content: string;
}

export interface Meta {
  totalCount: number;
}

// Dashboard models
export interface GridLayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  maxW?: number
  maxH?: number
  static?: boolean
  title?: string
}

export interface WidgetSensorConfig {
  name: string
  table: 'raw' | 'hourly' | 'history'
}

export interface WidgetConfig {
  id: string
  type: string
  title?: string
  hostId?: string
  deviceId?: string
  sensors?: WidgetSensorConfig[]
  options: Record<string, any>
  refreshInterval: number
  data?: any
  children?: WidgetConfig[]
  childLayout?: GridLayoutItem[]
}

export interface DashboardConfig {
  id?: number | null
  name: string
  version: number
  layout: GridLayoutItem[]
  widgets: WidgetConfig[]
  updated_at: number
}

export interface DashboardConfigInput extends Omit<DashboardConfig, 'id' | 'version' | 'updated_at'> {
  id?: number | null
  version?: number
  updated_at?: number
}

export interface DashboardConfigOutput extends Omit<DashboardConfig, 'id' | 'version' | 'updated_at'> {
  id: number | null
  version: number
  updated_at: number
}

export interface DashboardGetResponse {
  id: number
  version: number
  dashboard: DashboardConfigOutput
}

export interface DashboardSaveRequest {
  dashboard: DashboardConfigInput
}

export interface DashboardSaveResponse {
  id: number
  version: number
  saved: boolean
}
