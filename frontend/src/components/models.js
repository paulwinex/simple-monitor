// Dashboard models

/**
 * Widget slot - a data source binding point within a widget
 * Each slot represents a UI element that can display data
 * @typedef {Object} WidgetSlot
 * @property {string} id - Unique slot ID within widget (e.g., 'number', 'chart', 'temp', 'load')
 * @property {string} [label] - Display label for the slot
 * @property {string} [hostId] - Source host ID
 * @property {string} [deviceId] - Source device ID
 * @property {WidgetSensorConfig} [sensor] - Sensor configuration
 * @property {Record<string, any>} [options] - Slot-specific options (color, suffix, etc.)
 * @property {any} [data] - Runtime data for this slot
 */

/**
 * Widget slot definition - defines available slots for a widget type
 * @typedef {Object} WidgetSlotDefinition
 * @property {string} id - Slot ID
 * @property {string} label - Display label
 * @property {boolean} required - Whether slot is required
 * @property {boolean} allowMultiple - Whether multiple sensors can be assigned
 * @property {Record<string, any>} [defaultOptions] - Default slot options
 */

/**
 * @typedef {Object} WidgetSensorConfig
 * @property {string} name
 * @property {'raw' | 'hourly' | 'history'} table
 */

/**
 * @typedef {Object} GridLayoutItem
 * @property {string} i
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 * @property {number} [maxW]
 * @property {number} [maxH]
 * @property {boolean} [static]
 * @property {string} [title]
 */

/**
 * @typedef {Object} WidgetConfig
 * @property {string} id
 * @property {string} type
 * @property {string} [title] - Widget title (common for all slots)
 * @property {WidgetSlot[]} [slots] - Slot data bindings
 * @property {Record<string, any>} [options] - Widget-level options
 * @property {number} refreshInterval
 * @property {any} [data]
 * @property {WidgetConfig[]} [children]
 * @property {GridLayoutItem[]} [childLayout]
 */

/**
 * @typedef {Object} DashboardConfig
 * @property {number|null} [id]
 * @property {string} name
 * @property {number} version
 * @property {Record<string, any>} layout
 * @property {Record<string, any>} widgets
 * @property {number} updated_at
 */

/**
 * @typedef {Omit<DashboardConfig, 'id' | 'version' | 'updated_at'> & { id?: number | null, version?: number, updated_at?: number }} DashboardConfigInput
 */

/**
 * @typedef {Omit<DashboardConfig, 'id' | 'version' | 'updated_at'> & { id: number | null, version: number, updated_at: number }} DashboardConfigOutput
 */

/**
 * @typedef {Object} DashboardGetResponse
 * @property {number} id
 * @property {number} version
 * @property {DashboardConfigOutput} dashboard
 */

/**
 * @typedef {Object} DashboardSaveRequest
 * @property {DashboardConfigInput} dashboard
 */

/**
 * @typedef {Object} DashboardSaveResponse
 * @property {number} id
 * @property {number} version
 * @property {boolean} saved
 */
