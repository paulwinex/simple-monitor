<template>
  <q-dialog v-model="dialogOpen" persistent maximized>
    <q-card class="column full-height">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Add Widget</div>
        <q-space />
        <q-btn round flat icon="close" @click="cancel" />
      </q-card-section>

      <q-card-section class="col q-pt-none">
        <q-stepper
          v-model="step"
          ref="stepper"
          color="primary"
          animated
          alternative-labels
        >
          <!-- Step 1: Select widget type -->
          <q-step
            :name="1"
            title="Widget Type"
            icon="widgets"
            :done="step > 1"
          >
            <div class="row q-col-gutter-md q-pa-md">
              <div
                v-for="widget in availableWidgets"
                :key="widget.type"
                class="col-12 col-sm-6 col-md-4 col-lg-3"
              >
                <q-card
                  class="cursor-pointer hover-card full-height"
                  :class="{ 'selected-card': formData.type === widget.type }"
                  @click="selectWidgetType(widget.type)"
                >
                  <q-card-section class="text-center q-pb-md">
                    <q-icon :name="widget.icon" size="48px" color="primary" />
                    <div class="text-h6 q-mt-sm">{{ widget.label }}</div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-step>

          <!-- Step 2: Select host -->
          <q-step
            :name="2"
            title="Select Host"
            icon="dns"
            :done="step > 2"
          >
            <div class="q-pa-md">
              <q-list bordered separator>
                <q-item
                  v-for="host in hostsStore.hosts"
                  :key="host.host_id"
                  clickable
                  v-ripple
                  :active="formData.host_id === host.host_id"
                  @click="selectHost(host.host_id)"
                >
                  <q-item-section avatar>
                    <q-icon name="computer" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ host.host_id }}</q-item-label>
                    <q-item-label caption>
                      {{ host.devices.length }} devices
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-radio
                      :model-value="formData.host_id"
                      :val="host.host_id"
                      @update:model-value="selectHost"
                    />
                  </q-item-section>
                </q-item>
              </q-list>

              <div v-if="hostsStore.hosts.length === 0" class="text-center q-pa-md">
                <q-icon name="warning" size="32px" color="warning" />
                <div class="text-subtitle1 q-mt-sm">No hosts available</div>
                <q-btn
                  flat
                  color="primary"
                  label="Refresh Hosts"
                  class="q-mt-md"
                  @click="refreshHosts"
                />
              </div>
            </div>
          </q-step>

          <!-- Step 3: Select device and sensors -->
          <q-step
            :name="3"
            title="Device & Sensors"
            icon="memory"
            :done="step > 3"
          >
            <div class="q-pa-md">
              <!-- Device selection -->
              <q-select
                v-model="formData.device_id"
                :options="deviceOptions"
                label="Device"
                outlined
                dense
                emit-value
                map-options
                class="q-mb-md"
                @update:model-value="onDeviceChanged"
              />

              <!-- Sensors selection -->
              <div v-if="availableMetrics.length > 0">
                <div class="text-subtitle2 q-mb-sm">Select Metrics:</div>
                <q-list bordered separator>
                  <q-item
                    v-for="metric in availableMetrics"
                    :key="metric"
                    clickable
                    v-ripple
                  >
                    <q-item-section side>
                      <q-checkbox
                        :model-value="isSensorSelected(metric)"
                        @update:model-value="toggleSensor(metric)"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ metric }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>

              <div v-else class="text-center q-pa-md">
                <q-icon name="info" size="32px" color="info" />
                <div class="text-subtitle1 q-mt-sm">
                  Select a device to see available metrics
                </div>
              </div>
            </div>
          </q-step>

          <!-- Step 4: Configure widget -->
          <q-step :name="4" title="Configure" icon="settings">
            <div class="q-pa-md">
              <q-input
                v-model="formData.title"
                label="Widget Title"
                outlined
                dense
                class="q-mb-md"
              />

              <!-- Widget-specific options -->
              <q-card flat bordered class="q-mb-md">
                <q-card-section>
                  <div class="text-subtitle2 q-mb-sm">Display Options</div>

                  <!-- Number widget options -->
                  <template v-if="formData.type === 'number'">
                    <q-input
                      v-model.number="widgetOptions.prefix"
                      label="Prefix"
                      outlined
                      dense
                      class="q-mb-sm"
                    />
                    <q-input
                      v-model.number="widgetOptions.suffix"
                      label="Suffix"
                      outlined
                      dense
                      class="q-mb-sm"
                    />
                    <q-input
                      v-model.number="widgetOptions.decimals"
                      label="Decimal Places"
                      type="number"
                      outlined
                      dense
                      min="0"
                      max="5"
                    />
                  </template>

                  <!-- Chart widget options -->
                  <template v-if="formData.type === 'chart'">
                    <q-select
                      v-model="widgetOptions.timeRange"
                      :options="['1h', '6h', '24h', '7d']"
                      label="Time Range"
                      outlined
                      dense
                      class="q-mb-sm"
                    />
                    <q-toggle
                      v-model="widgetOptions.smooth"
                      label="Smooth Lines"
                    />
                    <q-toggle
                      v-model="widgetOptions.showLegend"
                      label="Show Legend"
                    />
                  </template>

                  <!-- Bar widget options -->
                  <template v-if="formData.type === 'bar'">
                    <q-select
                      v-model="widgetOptions.orientation"
                      :options="['vertical', 'horizontal']"
                      label="Orientation"
                      outlined
                      dense
                      class="q-mb-sm"
                    />
                    <q-toggle
                      v-model="widgetOptions.showValues"
                      label="Show Values"
                    />
                  </template>

                  <!-- Pie widget options -->
                  <template v-if="formData.type === 'pie'">
                    <q-toggle
                      v-model="widgetOptions.showLegend"
                      label="Show Legend"
                    />
                  </template>
                </q-card-section>
              </q-card>

              <!-- Refresh interval -->
              <q-input
                v-model.number="formData.refresh_interval"
                label="Refresh Interval (ms)"
                type="number"
                outlined
                dense
                min="1000"
                step="1000"
              />
            </div>
          </q-step>
        </q-stepper>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          v-if="step > 1"
          flat
          label="Back"
          color="primary"
          @click="step--"
        />
        <q-btn
          v-if="step < 4"
          flat
          label="Next"
          color="primary"
          :disable="!canProceed"
          @click="step++"
        />
        <q-btn
          v-if="step === 4"
          flat
          label="Add Widget"
          color="primary"
          :disable="!canAdd"
          @click="addWidget"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useDashboardStore } from '../../stores/dashboard'
import { useHostsStore } from '../../stores/hosts'
import { getAvailableWidgets, getWidgetComponent } from '../widgets'
import type { WidgetConfig, WidgetSensorConfig } from '../../types'
import { generateId } from '../../utils'
import type { WidgetType } from '../../types/widgets'

const $q = useQuasar()
const dashboardStore = useDashboardStore()
const hostsStore = useHostsStore()

// State
const dialogOpen = ref(false)
const step = ref(1)
const formData = ref<Partial<WidgetConfig>>({
  type: 'number',
  host_id: '',
  device_id: '',
  sensors: [],
  title: '',
  refresh_interval: 5000,
})
const widgetOptions = ref<Record<string, any>>({})
const availableMetrics = ref<string[]>([])

// Computed
const availableWidgets = computed(() => getAvailableWidgets())

const deviceOptions = computed(() => {
  if (!formData.value.host_id) return []
  const devices = hostsStore.getDevicesForHost(formData.value.host_id)
  return devices.map((d) => ({
    label: `${d.label} (${d.type})`,
    value: d.name,
  }))
})

const canProceed = computed(() => {
  switch (step.value) {
    case 1:
      return !!formData.value.type
    case 2:
      return !!formData.value.host_id
    case 3:
      return !!formData.value.device_id && formData.value.sensors!.length > 0
    default:
      return true
  }
})

const canAdd = computed(() => {
  return !!formData.value.title && formData.value.sensors!.length > 0
})

// Watch for dialog open
watch(
  () => dashboardStore.addWidgetDialogOpen,
  (open) => {
    dialogOpen.value = open
    if (open) {
      resetForm()
      hostsStore.fetchHosts()
    }
  }
)

// Watch for dialog close
watch(dialogOpen, (open) => {
  if (!open) {
    dashboardStore.closeAddWidgetDialog()
  }
})

// Methods
function resetForm() {
  step.value = 1
  formData.value = {
    type: 'number',
    host_id: '',
    device_id: '',
    sensors: [],
    title: '',
    refresh_interval: 5000,
  }
  widgetOptions.value = {}
  availableMetrics.value = []
}

function selectWidgetType(type: WidgetType) {
  formData.value.type = type
  // Set default options for widget type
  const widget = availableWidgets.value.find((w) => w.type === type)
  if (widget) {
    widgetOptions.value = { ...widget.defaultOptions }
  }
}

function selectHost(hostId: string) {
  formData.value.host_id = hostId
  hostsStore.fetchDevices(hostId)
}

function refreshHosts() {
  hostsStore.fetchHosts()
}

async function onDeviceChanged(deviceId: string) {
  formData.value.device_id = deviceId
  availableMetrics.value = []
  formData.value.sensors = []

  if (formData.value.host_id && deviceId) {
    const metrics = hostsStore.getDeviceMetrics(formData.value.host_id, deviceId)
    availableMetrics.value = metrics
  }
}

function isSensorSelected(metric: string): boolean {
  return formData.value.sensors?.some((s) => s.name === metric) || false
}

function toggleSensor(metric: string) {
  const index = formData.value.sensors?.findIndex((s) => s.name === metric)
  if (index !== undefined && index >= 0) {
    formData.value.sensors?.splice(index, 1)
  } else {
    formData.value.sensors?.push({ name: metric, table: 'raw' })
  }
}

function addWidget() {
  const widget: WidgetConfig = {
    id: generateId(),
    type: formData.value.type!,
    title: formData.value.title!,
    host_id: formData.value.host_id!,
    device_id: formData.value.device_id!,
    sensors: formData.value.sensors as WidgetSensorConfig[],
    options: widgetOptions.value,
    refresh_interval: formData.value.refresh_interval || 5000,
  }

  // Get widget defaults for size
  const widgetDef = availableWidgets.value.find((w) => w.type === widget.type)
  const layoutItem = {
    min_w: widgetDef?.minW || 2,
    min_h: widgetDef?.minH || 2,
    w: widgetDef?.defaultW || 4,
    h: widgetDef?.defaultH || 4,
  }

  dashboardStore.addWidget(widget, layoutItem)
  dialogOpen.value = false

  $q.notify({
    type: 'positive',
    message: `Widget "${widget.title}" added`,
  })
}

function cancel() {
  dialogOpen.value = false
}
</script>

<style scoped lang="scss">
.hover-card {
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.selected-card {
  border: 2px solid $primary;
  background-color: rgba($primary, 0.05);
}
</style>
