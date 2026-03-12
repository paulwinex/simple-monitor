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

/**
 * Widget slot - a data source binding point within a widget
 * Each slot represents a UI element that can display data
 */
export interface WidgetSlot {
  id: string              // Unique slot ID within widget (e.g., 'number', 'chart', 'temp', 'load')
  label?: string          // Display label for the slot
  hostId?: string         // Source host ID
  deviceId?: string       // Source device ID
  sensor?: WidgetSensorConfig  // Sensor configuration
  options?: Record<string, any> // Slot-specific options (color, suffix, etc.)
  data?: any              // Runtime data for this slot
}

/**
 * Widget slot definition - defines available slots for a widget type
 */
export interface WidgetSlotDefinition {
  id: string              // Slot ID
  label: string           // Display label
  required: boolean       // Whether slot is required
  allowMultiple: boolean  // Whether multiple sensors can be assigned
  defaultOptions?: Record<string, any> // Default slot options
}

export interface WidgetConfig {
  id: string
  type: string
  title?: string          // Widget title (common for all slots)
  slots?: WidgetSlot[]    // Slot data bindings
  options?: Record<string, any> // Widget-level options
  refreshInterval: number
  data?: any
  children?: WidgetConfig[]
  childLayout?: GridLayoutItem[]
}

export interface DashboardConfig {
  id?: number | null
  name: string
  version: number
  layout: Record<string, any>
  widgets: Record<string, any>
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
