<template>
  <q-dialog v-model="dialogVisible" persistent>
    <q-card style="min-width: 450px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Add Widget</div>
        <q-space />
        <q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-stepper
          v-model="step"
          ref="stepperRef"
          color="primary"
          animated
          alternative-labels
        >
          <q-step
            :name="1"
            title="Widget Type"
            icon="widgets"
            :done="step > 1"
          >
            <widget-type-step
              v-model:selected-type="selectedType"
              :parent-type="parentType"
              @select="selectWidgetType"
            />
          </q-step>

          <q-step
            :name="2"
            title="Host"
            icon="dns"
            :done="step > 2"
            :ready="selectedHostId !== null && selectedDeviceId !== null"
          >
            <host-step
              v-model:selected-host="selectedHostId"
              v-model:selected-device="selectedDeviceId"
            />
          </q-step>

          <q-step
            :name="3"
            title="Sensors"
            icon="sensors"
            :done="step > 3"
            :ready="selectedSensors.length > 0"
          >
            <sensors-step
              v-model:selected-sensors="selectedSensors"
              :host-id="selectedHostId"
              :device-id="selectedDeviceId"
              :widget-type="selectedType"
            />
          </q-step>

          <q-step
            :name="4"
            title="Settings"
            icon="settings"
            :done="step > 4"
          >
            <settings-step
              v-model:title="widgetTitle"
              v-model:options="widgetOptions"
              :widget-type="selectedType"
            />
          </q-step>

          <template #navigation>
            <q-stepper-navigation>
              <q-btn
                v-if="step === 2 || step === 3"
                flat
                @click="nextStep"
                :label="step === 3 ? 'Continue' : 'Continue'"
                color="primary"
                :disable="!canProceed"
              />
              <q-btn
                v-if="step === 4"
                flat
                @click="createWidget"
                label="Create"
                color="primary"
              />
              <q-btn
                v-if="step > 1 && step < 4"
                flat
                @click="step = (step as number) - 1"
                label="Back"
                color="primary"
              />
            </q-stepper-navigation>
          </template>
        </q-stepper>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import WidgetTypeStep from './widget-dialog/WidgetTypeStep.vue'
import HostStep from './widget-dialog/HostStep.vue'
import SensorsStep from './widget-dialog/SensorsStep.vue'
import SettingsStep from './widget-dialog/SettingsStep.vue'
import { useDashboardStore } from 'stores/dashboard'
import type { WidgetConfig } from 'src/components/models'

const props = defineProps<{
  modelValue: boolean
  parentType?: string
  parentId?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const dashboardStore = useDashboardStore()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const step = ref(1)
const selectedType = ref('number')
const selectedHostId = ref<string | null>(null)
const selectedDeviceId = ref<string | null>(null)
const selectedSensors = ref<{ name: string; table: string }[]>([])
const widgetTitle = ref('')
const widgetOptions = ref<Record<string, any>>({})

const canProceed = computed(() => {
  if (step.value === 2) return selectedHostId.value !== null && selectedDeviceId.value !== null
  if (step.value === 3) return selectedSensors.value.length > 0
  if (step.value === 4) return true
  return false
})

function selectWidgetType(type: string) {
  selectedType.value = type
  // GridContainer skips to settings directly
  if (type === 'gridContainer') {
    step.value = 4
  } else {
    step.value = 2
  }
}

function nextStep() {
  step.value = (step.value as number) + 1
}

function createWidget() {
  console.log('[AddWidgetDialog] createWidget called')
  console.log('[AddWidgetDialog] selectedType:', selectedType.value)
  console.log('[AddWidgetDialog] parentId:', props.parentId)
  console.log('[AddWidgetDialog] widgetTitle:', widgetTitle.value)
  console.log('[AddWidgetDialog] widgetOptions:', widgetOptions.value)
  
  const newWidget: WidgetConfig = {
    id: `widget-${Date.now()}`,
    type: selectedType.value,
    title: widgetTitle.value || undefined,
    hostId: selectedHostId.value || undefined,
    deviceId: selectedDeviceId.value || undefined,
    sensors: selectedSensors.value,
    options: widgetOptions.value,
    refreshInterval: 5000
  }

  // Add default options based on widget type
  if (selectedType.value === 'number') {
    newWidget.options = {
      decimals: 1,
      suffix: '',
      color: '#4CAF50',
      ...widgetOptions.value
    }
    newWidget.data = { value: 0 }
  } else if (selectedType.value === 'chart') {
    newWidget.options = {
      timeRange: '1h',
      showLegend: false,
      smooth: true,
      colors: ['#2196F3'],
      fill: true,
      ...widgetOptions.value
    }
    newWidget.data = { data: [] }
  }

  console.log('[AddWidgetDialog] newWidget:', newWidget)
  console.log('[AddWidgetDialog] Calling dashboardStore.addWidget with parentId:', props.parentId)
  
  dashboardStore.addWidget(newWidget, props.parentId)
  
  console.log('[AddWidgetDialog] Widget added successfully')

  // Reset and close
  resetForm()
  dialogVisible.value = false
}

function resetForm() {
  step.value = 1
  selectedType.value = 'number'
  selectedHostId.value = null
  selectedDeviceId.value = null
  selectedSensors.value = []
  widgetTitle.value = ''
  widgetOptions.value = {}
}

// Reset form when dialog opens
watch(dialogVisible, (newVal) => {
  if (newVal) {
    resetForm()
    dashboardStore.loadHosts()
  }
})
</script>

<style scoped>
.q-stepper {
  background: transparent;
}
</style>
