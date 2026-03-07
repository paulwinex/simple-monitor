/**
 * Widget types and components registration
 */
import { registerWidget } from './widgetsRegistry'
import type { WidgetRegistryEntry } from '../../types/widgets'

// Import widget components
import NumberWidget from './NumberWidget.vue'
import BarWidget from './BarWidget.vue'
import PieWidget from './PieWidget.vue'
import ChartWidget from './ChartWidget.vue'

// Widget definitions
const widgets: WidgetRegistryEntry[] = [
  {
    type: 'number',
    component: NumberWidget,
    label: 'Number Display',
    icon: 'tag',
    defaultOptions: {
      prefix: '',
      suffix: '',
      decimals: 1,
    },
    minW: 2,
    minH: 2,
    defaultW: 3,
    defaultH: 3,
  },
  {
    type: 'bar',
    component: BarWidget,
    label: 'Bar Chart',
    icon: 'bar_chart',
    defaultOptions: {
      orientation: 'vertical',
      showValues: true,
    },
    minW: 3,
    minH: 3,
    defaultW: 4,
    defaultH: 4,
  },
  {
    type: 'pie',
    component: PieWidget,
    label: 'Pie Chart',
    icon: 'pie_chart',
    defaultOptions: {
      showLegend: true,
    },
    minW: 3,
    minH: 3,
    defaultW: 4,
    defaultH: 4,
  },
  {
    type: 'chart',
    component: ChartWidget,
    label: 'Time Series Chart',
    icon: 'show_chart',
    defaultOptions: {
      timeRange: '1h',
      showLegend: true,
      smooth: true,
    },
    minW: 4,
    minH: 4,
    defaultW: 6,
    defaultH: 5,
  },
]

/**
 * Register all widgets
 */
export function registerAllWidgets(): void {
  widgets.forEach((widget) => {
    registerWidget(widget)
  })
}

/**
 * Get widget component by type
 */
export function getWidgetComponent(type: string) {
  const widget = widgets.find((w) => w.type === type)
  return widget?.component || null
}

/**
 * Get all available widgets for selection dialog
 */
export function getAvailableWidgets(): WidgetRegistryEntry[] {
  return widgets
}

export default widgets
