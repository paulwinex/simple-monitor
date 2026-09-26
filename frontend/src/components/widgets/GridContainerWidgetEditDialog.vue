<template>
  <div class="widget-options">
    <div class="text-subtitle2 q-mb-sm">Grid Container Options</div>
    <q-input
      v-model.number="localOptions.colNum"
      label="Number of Columns"
      type="number"
      :min="6"
      :max="48"
      outlined
      dense
      hint="Default is 12. Use 24 for finer control."
      @update:model-value="emitUpdate"
    />

    <SettingsRow
      label="Custom row height"
      hint="Use a row height for this container instead of the dashboard setting"
      class="q-mt-sm"
    >
      <q-toggle v-model="rowHeightEnabled" />
    </SettingsRow>

    <SettingsRow
      label="Row height"
      :hint="rowHeightEnabled
        ? 'Height of one row of the widgets inside this container'
        : `Using the dashboard setting (${dashboardRowHeight}px)`"
    >
      <ValueSlider
        :model-value="rowHeight"
        :min="10"
        :max="100"
        :step="1"
        suffix="px"
        :disable="!rowHeightEnabled"
        @update:model-value="setRowHeight"
      />
    </SettingsRow>

    <SettingsRow
      label="Custom border gap"
      hint="Control the container border gap for this container instead of the dashboard setting"
    >
      <q-toggle v-model="gapOnBordersEnabled" />
    </SettingsRow>

    <SettingsRow
      label="Border gap"
      :hint="gapOnBordersEnabled
        ? 'Keeps the widget gap between the nested widgets and the container borders'
        : `Using the dashboard setting (${dashboardGapOnBorders ? 'on' : 'off'})`"
    >
      <q-toggle v-model="gapOnBorders" :disable="!gapOnBordersEnabled" />
    </SettingsRow>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDashboardStore } from 'stores/dashboard'
import ValueSlider from 'components/common/ValueSlider.vue'
import SettingsRow from 'components/common/SettingsRow.vue'

const props = defineProps({
  widget: Object,
  widgetOptions: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:widget-options'])

const dashboardStore = useDashboardStore()

const DEFAULT_ROW_HEIGHT = 25

const dashboardRowHeight = computed(() => dashboardStore.gridOptions?.containerRowHeight ?? DEFAULT_ROW_HEIGHT)
const dashboardGapOnBorders = computed(() => dashboardStore.gridOptions?.containerGapOnBorders !== false)

function withDefaults(options) {
  return {
    colNum: 12,
    rowHeightEnabled: false,
    gapOnBordersEnabled: false,
    ...options
  }
}

// Local copy of options with defaults
const localOptions = ref(withDefaults(props.widgetOptions))

// Watch for external changes
watch(() => props.widgetOptions, (newOptions) => {
  localOptions.value = withDefaults(newOptions)
}, { deep: true, immediate: true })

// Emit changes to parent
function emitUpdate() {
  emit('update:widget-options', { ...localOptions.value })
}

// Two-way bindings so a click always registers locally, even before the store
// round-trips the new options back into this dialog.
const rowHeightEnabled = computed({
  get: () => !!localOptions.value.rowHeightEnabled,
  set: (value) => {
    localOptions.value.rowHeightEnabled = value
    emitUpdate()
  }
})

const gapOnBordersEnabled = computed({
  get: () => !!localOptions.value.gapOnBordersEnabled,
  set: (value) => {
    localOptions.value.gapOnBordersEnabled = value
    emitUpdate()
  }
})

// Until the override is touched, the dashboard value is shown and stays in charge.
const rowHeight = computed(() => localOptions.value.rowHeight ?? dashboardRowHeight.value)

const gapOnBorders = computed({
  get: () => localOptions.value.gapOnBorders ?? dashboardGapOnBorders.value,
  set: (value) => {
    localOptions.value.gapOnBorders = value
    emitUpdate()
  }
})

function setRowHeight(value) {
  const parsed = Math.max(10, Math.min(300, Math.round(value) || DEFAULT_ROW_HEIGHT))
  localOptions.value.rowHeight = parsed
  emitUpdate()
}
</script>

<style scoped>
.widget-options {
  border-top: 1px solid #e0e0e0;
  padding-top: 16px;
}
</style>
