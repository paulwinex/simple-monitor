import { widgetDefinition as numberDefinition } from './NumberWidget.vue'
import { widgetDefinition as chartDefinition } from './ChartWidget.vue'

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
  gridContainerDefinition
  // Add new widgets here when created
]

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
