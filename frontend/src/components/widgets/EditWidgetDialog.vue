<template>
  <q-dialog v-model="dialogVisible">
    <q-card style="min-width: 700px; max-height: 90vh;">
      <q-card-section class="row items-center q-pb-none q-mb-md">
        <div class="text-h6">Edit Widget</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="closeDialog" />
      </q-card-section>
      <q-card-section class="q-pt-none">
        <!-- Widget Title (common for all widgets) -->
        <q-input
          v-model="widgetTitle"
          label="Widget Title"
          outlined
          dense
          class="q-mb-md"
        />

        <!-- GridContainer Options -->
        <div v-if="widget?.type === 'gridContainer'" class="widget-options q-mb-md">
          <div class="text-subtitle2 q-mb-sm">Grid Container Options</div>
          <q-input
            v-model.number="widgetOptions.colNum"
            label="Number of Columns"
            type="number"
            :min="6"
            :max="48"
            outlined
            dense
            hint="Default is 12. Use 24 for finer control."
          />
        </div>

        <!-- Slots Configuration -->
        <div v-if="widgetSlots.length > 0" class="q-mb-md">
          <div class="text-subtitle2 q-mb-sm">Data Sources</div>
          <div class="text-caption text-grey-7 q-mb-md">
            Click on a slot button to change Host → Device → Sensor.
            Slots without a sensor will be hidden in the widget.
          </div>

          <q-list bordered separator>
            <q-item
              v-for="slot in widgetSlots"
              :key="slot.id"
            >
              <q-item-section avatar>
                <q-icon
                  :name="getSlotIcon(slot.id)"
                  :color="getSlotColor(slot)"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ slot.label || slot.id }}</q-item-label>
                <q-item-label caption>
                  {{ getSlotSummary(slot) }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn flat dense :color="slot.sensor ? 'primary' : 'grey'" :label="slot.sensor ? slot.sensor.name : 'Configure'">
                  <q-menu v-model="menuVisible" anchor="top middle" self="top middle">
                    <!-- Level 1: Host Selection -->
                    <q-list v-if="!tempHostSelection" dense style="min-width: 150px">
                      <q-item
                        v-for="host in hostOptions"
                        :key="host.value"
                        clickable
                        @click="tempHostSelection = host.value; tempDeviceSelection = null"
                      >
                        <q-item-section avatar>
                          <q-icon name="dns" color="primary" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>{{ host.label }}</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-icon name="chevron_right" color="grey-7" />
                        </q-item-section>
                      </q-item>
                    </q-list>

                    <!-- Level 2: Device Selection -->
                    <q-list v-else-if="!tempDeviceSelection" dense style="min-width: 150px">
                      <q-item clickable @click="tempHostSelection = null; tempDeviceSelection = null">
                        <q-item-section side>
                          <q-icon name="arrow_back" size="xs" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label caption>Back</q-item-label>
                        </q-item-section>
                      </q-item>
                      <q-separator />
                      <q-item
                        v-for="device in getDeviceOptions(tempHostSelection)"
                        :key="device.value"
                        clickable
                        @click="tempDeviceSelection = device.value"
                      >
                        <q-item-section avatar>
                          <q-icon name="memory" color="primary" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>{{ device.label }}</q-item-label>
                          <q-item-label caption>{{ device.value }}</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-icon name="chevron_right" color="grey-7" />
                        </q-item-section>
                      </q-item>
                    </q-list>

                    <!-- Level 3: Sensor Selection -->
                    <q-list v-else dense style="min-width: 150px">
                      <q-item clickable @click="tempDeviceSelection = null">
                        <q-item-section side>
                          <q-icon name="arrow_back" size="xs" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label caption>Back to {{ tempHostSelection }}</q-item-label>
                        </q-item-section>
                      </q-item>
                      <q-separator />
                      <q-item
                        v-for="sensor in getSensorOptions(tempHostSelection, tempDeviceSelection)"
                        :key="sensor.value"
                        clickable
                        @click="selectSensor(slot, sensor.value)"
                      >
                        <q-item-section avatar>
                          <q-icon name="sensors" color="primary" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>{{ sensor.label }}</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-icon name="check" v-if="slot.sensor?.name === sensor.value" color="primary" />
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <!-- Chart Options -->
        <div v-if="widget?.type === 'chart'" class="widget-options-column">
          <div class="text-subtitle2 q-mb-sm">Chart Options</div>

          <!-- Time Range -->
          <q-select
            v-model="widgetOptions.timeRange"
            label="Time Range"
            :options="['1m', '5m', '15m', '30m', '1h', '6h', '12h', '24h', '7d']"
            outlined
            dense
            class="q-mb-sm"
          />

          <!-- Chart Color -->
          <q-input
            v-model="widgetOptions.chartColor"
            label="Chart Color"
            outlined
            dense
            class="q-mb-sm"
          >
            <template #append>
              <q-btn round dense flat icon="colorize">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-color v-model="widgetOptions.chartColor" />
                </q-popup-proxy>
              </q-btn>
            </template>
          </q-input>

          <!-- Legend -->
          <q-toggle
            v-model="widgetOptions.showLegend"
            label="Show Legend"
            class="q-mb-sm"
          />

          <!-- Smooth Lines -->
          <q-toggle
            v-model="widgetOptions.smooth"
            label="Smooth Lines"
            class="q-mb-sm"
          />

          <!-- Fill Area -->
          <q-toggle
            v-model="widgetOptions.fill"
            label="Fill Area"
            class="q-mb-sm"
          />

          <!-- Show Points -->
          <q-toggle
            v-model="widgetOptions.showPoints"
            label="Show Points"
            class="q-mb-sm"
          />

          <!-- Show X Axis -->
          <q-toggle
            v-model="widgetOptions.showXAxis"
            label="Show X Axis"
            class="q-mb-sm"
          />

          <!-- Show Y Axis -->
          <q-toggle
            v-model="widgetOptions.showYAxis"
            label="Show Y Axis"
            class="q-mb-sm"
          />

          <!-- Show Grid -->
          <q-toggle
            v-model="widgetOptions.showGrid"
            label="Show Grid"
            class="q-mb-sm"
          />

          <!-- Show Axis Values -->
          <q-toggle
            v-model="widgetOptions.showAxisValues"
            label="Show Axis Values"
          />
        </div>

        <!-- Number Options -->
        <div v-if="widget?.type === 'number'" class="widget-options-column">
          <div class="text-subtitle2 q-mb-sm">Number Options</div>

          <!-- Decimal Places -->
          <q-input
            v-model.number="widgetOptions.decimals"
            label="Decimal Places"
            type="number"
            :min="0"
            :max="5"
            outlined
            dense
            class="q-mb-sm"
          />

          <!-- Suffix -->
          <q-input
            v-model="widgetOptions.suffix"
            label="Suffix"
            outlined
            dense
            class="q-mb-sm"
          />

          <!-- Font Size Slider -->
          <div class="q-mb-sm">
            <div class="text-caption text-grey-7 q-mb-xs">Font Size: {{ widgetOptions.fontSize }}%</div>
            <q-slider
              v-model="widgetOptions.fontSize"
              :min="20"
              :max="100"
              :step="5"
              label
              label-always
              color="primary"
              markers
            />
          </div>

          <!-- Color -->
          <q-input
            v-model="widgetOptions.color"
            label="Color"
            outlined
            dense
          >
            <template #append>
              <q-btn round dense flat icon="colorize">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-color v-model="widgetOptions.color" />
                </q-popup-proxy>
              </q-btn>
            </template>
          </q-input>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" @click="cancelChanges" />
        <q-btn flat label="Save" color="primary" @click="saveWidget" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDashboardStore } from 'stores/dashboard'
import { getSlotDefinitions } from './widget-registry'

const props = defineProps({
  modelValue: Boolean,
  widget: Object
})

const emit = defineEmits([
  'update:modelValue',
  'update:widget'
])

const dashboardStore = useDashboardStore()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Widget configuration
const widgetTitle = ref('')
const widgetOptions = ref({})
const widgetSlots = ref([])
const widgetType = ref('')

// Temporary selections for nested menu
const tempHostSelection = ref(null)
const tempDeviceSelection = ref(null)
const menuVisible = ref(false)

// Backup for cancel functionality
const backupSlots = ref([])

// Host options from store
const hostOptions = computed(() => {
  return dashboardStore.hosts.map(h => ({
    label: h.host_id,
    value: h.host_id
  }))
})

// Get device options for a host
function getDeviceOptions(hostId) {
  if (!hostId) return []
  const host = dashboardStore.hosts.find(h => h.host_id === hostId)
  if (!host) return []
  return host.devices.map(d => ({
    label: d.label || d.name,
    value: d.name
  }))
}

// Get sensor options for a device
function getSensorOptions(hostId, deviceId) {
  if (!hostId || !deviceId) return []

  const host = dashboardStore.hosts.find(h => h.host_id === hostId)
  if (!host) return []
  const device = host.devices.find(d => d.name === deviceId)
  if (!device) return []

  // Use sensors array loaded from backend
  const sensors = device.sensors || []
  return sensors.map(s => ({
    label: s,
    value: s
  }))
}

// Get slot definitions for widget type
function getSlotDefs(type) {
  return getSlotDefinitions(type)
}

// Watch for widget changes - create backup for cancel
watch(() => props.widget, (newWidget) => {
  if (newWidget) {
    widgetTitle.value = newWidget.title || ''
    widgetOptions.value = { ...newWidget.options }
    widgetType.value = newWidget.type
    widgetSlots.value = JSON.parse(JSON.stringify(newWidget.slots || []))
    backupSlots.value = JSON.parse(JSON.stringify(newWidget.slots || []))
  }
}, { immediate: true })

// Get slot icon based on slot ID
function getSlotIcon(slotId) {
  const iconMap = {
    number: 'format_list_numbered',
    chart: 'insert_chart',
    load: 'speed',
    temperature: 'thermometer',
    primary: 'looks_one',
    secondary: 'looks_two'
  }
  return iconMap[slotId] || 'data_usage'
}

// Get slot color based on configuration
function getSlotColor(slot) {
  if (slot.sensor) return 'primary'
  return 'grey-7'
}

// Get slot summary text
function getSlotSummary(slot) {
  if (!slot.sensor) return ''
  const parts = []
  if (slot.hostId) parts.push(slot.hostId)
  if (slot.deviceId) parts.push(slot.deviceId)
  if (slot.sensor?.name) parts.push(slot.sensor.name)
  return parts.join(' / ')
}

// Select sensor from nested menu - updates slot immediately
function selectSensor(slot, sensor) {
  const index = widgetSlots.value.findIndex(s => s.id === slot.id)
  if (index >= 0) {
    widgetSlots.value[index] = {
      ...widgetSlots.value[index],
      hostId: tempHostSelection.value || undefined,
      deviceId: tempDeviceSelection.value || undefined,
      sensor: {
        name: sensor,
        table: 'raw'
      }
    }
  }
  // Close menu and reset temp selections
  menuVisible.value = false
  tempHostSelection.value = null
  tempDeviceSelection.value = null
}

// Cancel changes and restore backup
function cancelChanges() {
  widgetSlots.value = JSON.parse(JSON.stringify(backupSlots.value))
  dialogVisible.value = false
}

// Save widget
function saveWidget() {
  if (props.widget) {
    // Apply widget-level options to each slot
    const updatedSlots = widgetSlots.value.map(slot => ({
      ...slot,
      options: {
        ...slot.options,
        decimals: widgetOptions.value.decimals,
        color: widgetOptions.value.color,
        suffix: widgetOptions.value.suffix,
        fontSize: widgetOptions.value.fontSize
      }
    }))
    
    const updatedWidget = {
      ...props.widget,
      title: widgetTitle.value,
      slots: updatedSlots,
      options: { ...widgetOptions.value }
    }
    emit('update:widget', updatedWidget)
    closeDialog()
  }
}

function closeDialog() {
  dialogVisible.value = false
}
</script>

<style scoped>
.q-card {
  max-height: 90vh;
}

.menu-column {
  max-height: 400px;
  overflow-y: auto;
}

.menu-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.widget-options {
  border-top: 1px solid #e0e0e0;
  padding-top: 16px;
}

.widget-options-column {
  border-top: 1px solid #e0e0e0;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
}
</style>
