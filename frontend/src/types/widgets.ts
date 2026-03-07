// Widget types and configuration

export type WidgetType = 'number' | 'bar' | 'pie' | 'chart' | 'gridPanel'

export interface BaseWidgetOptions {
  color?: string
  showLegend?: boolean
}

export interface NumberWidgetOptions extends BaseWidgetOptions {
  prefix?: string
  suffix?: string
  decimals?: number
}

export interface BarWidgetOptions extends BaseWidgetOptions {
  min?: number
  max?: number
  orientation?: 'horizontal' | 'vertical'
  showValues?: boolean
}

export interface PieWidgetOptions extends BaseWidgetOptions {
  colors?: string[]
}

export interface ChartWidgetOptions extends BaseWidgetOptions {
  timeRange?: '1h' | '6h' | '24h' | '7d'
  smooth?: boolean
}

export interface GridPanelWidgetOptions extends BaseWidgetOptions {
  headerSensor?: {
    name: string
    table: 'raw' | 'hourly' | 'history' | 'daily'
  }
}

export type WidgetOptions =
  | NumberWidgetOptions
  | BarWidgetOptions
  | PieWidgetOptions
  | ChartWidgetOptions
  | GridPanelWidgetOptions

export interface WidgetRegistryEntry {
  type: WidgetType
  component: any
  label: string
  icon: string
  defaultOptions: WidgetOptions
  configComponent?: any
  minW: number
  minH: number
  defaultW: number
  defaultH: number
}
