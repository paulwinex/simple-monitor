import { widgetDefinition as numberDefinition } from './NumberWidget.vue'
import { widgetDefinition as chartDefinition } from './ChartWidget.vue'
import { widgetDefinition as gaugeDefinition } from './GaugeWidget.vue'
import { widgetDefinition as numberChartDefinition } from './NumberChartWidget.vue'
import { widgetDefinition as multiChartDefinition } from './MultiChartWidget.vue'

// GridContainer definition inline to avoid circular dependency
const gridContainerDefinition = {
  type: 'gridContainer',
  label: 'Grid Container',
  defaultSize: { w: 6, h: 6 },
  slotDefinitions: []
}

// Registry of all available widgets
export const widgetRegistry = [
  numberDefinition,
  chartDefinition,
  gaugeDefinition,
  numberChartDefinition,
  multiChartDefinition,
  gridContainerDefinition
  // Add new widgets here when created
]

// Map widget types to their edit dialog component names (for reference only)
// Actual imports are done directly in EditWidgetDialog.vue and AddWidgetDialog.vue
const widgetEditDialogs = {
  number: 'NumberWidgetEditDialog',
  chart: 'ChartWidgetEditDialog',
  gauge: 'GaugeWidgetEditDialog',
  numberChart: 'NumberChartWidgetEditDialog',
  multiChart: 'MultiChartWidgetEditDialog',
  gridContainer: 'GridContainerWidgetEditDialog'
}

/**
 * Get widget definition by type
 */
export function getWidgetDefinition(type) {
  return widgetRegistry.find(w => w.type === type)
}

/**
 * Get slot definitions for a widget type
 */
export function getSlotDefinitions(type) {
  const widget = getWidgetDefinition(type)
  return widget?.slotDefinitions || []
}

/**
 * Get all widget types for selection
 */
export function getWidgetTypes() {
  return widgetRegistry.map(w => ({
    label: w.label,
    value: w.type
  }))
}
