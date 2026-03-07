import type { WidgetRegistryEntry, WidgetType } from '../../types/widgets'

// Registry to store available widget types
const widgetRegistry = new Map<string, WidgetRegistryEntry>()

/**
 * Register a widget type
 */
export function registerWidget(entry: WidgetRegistryEntry): void {
  if (widgetRegistry.has(entry.type)) {
    console.warn(`Widget type "${entry.type}" is already registered. Overwriting.`)
  }
  widgetRegistry.set(entry.type, entry)
}

/**
 * Get a widget type by its identifier
 */
export function getWidget(type: string): WidgetRegistryEntry | undefined {
  return widgetRegistry.get(type)
}

/**
 * Get all registered widget types
 */
export function getAllWidgets(): WidgetRegistryEntry[] {
  return Array.from(widgetRegistry.values())
}

/**
 * Check if a widget type is registered
 */
export function hasWidget(type: string): boolean {
  return widgetRegistry.has(type)
}

/**
 * Get widget type by label (case-insensitive)
 */
export function getWidgetByLabel(label: string): WidgetRegistryEntry | undefined {
  const lowerLabel = label.toLowerCase()
  return Array.from(widgetRegistry.values()).find(
    (w) => w.label.toLowerCase() === lowerLabel
  )
}

/**
 * Clear all registered widgets (useful for testing)
 */
export function clearRegistry(): void {
  widgetRegistry.clear()
}
