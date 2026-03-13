<template>
  <q-dialog v-model="dialogVisible">
    <q-card style="min-width: 700px; max-height: 90vh;">
      <q-card-section class="row items-center q-pb-none q-mb-md">
        <div class="text-h6">{{ dialogTitle }}</div>
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

        <!-- Widget-specific options slot -->
        <slot name="widget-options"></slot>
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

const props = defineProps({
  modelValue: Boolean,
  widget: Object,
  dialogTitle: {
    type: String,
    default: 'Edit Widget'
  }
})

const emit = defineEmits([
  'update:modelValue',
  'update:widget',
  'save',
  'cancel'
])

const dashboardStore = useDashboardStore()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Widget configuration
const widgetTitle = ref('')
const widgetSlots = ref([])
const widgetType = ref('')

// Temporary selections for nested menu
const tempHostSelection = ref(null)
const tempDeviceSelection = ref(null)
const menuVisible = ref(false)

// Backup for cancel functionality
const backupSlots = ref([])
const backupTitle = ref('')
const backupOptions = ref({})

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

// Watch for widget changes - create backup for cancel
watch(() => props.widget, (newWidget) => {
  if (newWidget) {
    widgetTitle.value = newWidget.title || ''
    widgetType.value = newWidget.type
    widgetSlots.value = JSON.parse(JSON.stringify(newWidget.slots || []))
    backupSlots.value = JSON.parse(JSON.stringify(newWidget.slots || []))
    backupTitle.value = newWidget.title || ''
    backupOptions.value = { ...newWidget.options }
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
  emit('cancel', {
    slots: JSON.parse(JSON.stringify(backupSlots.value)),
    title: backupTitle.value,
    options: backupOptions.value
  })
  dialogVisible.value = false
}

// Save widget - emits save event with updated widget data
function saveWidget() {
  if (props.widget) {
    const updatedWidget = {
      ...props.widget,
      title: widgetTitle.value,
      slots: widgetSlots.value
    }
    emit('save', updatedWidget)
    closeDialog()
  }
}

function closeDialog() {
  dialogVisible.value = false
}

// Expose methods for child components
defineExpose({
  widgetTitle,
  widgetSlots,
  widgetType,
  backupOptions
})
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
