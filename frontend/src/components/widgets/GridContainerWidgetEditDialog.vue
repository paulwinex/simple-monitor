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

    <q-toggle
      :model-value="rowHeightEnabled"
      label="Custom row height"
      class="q-mt-sm"
      @update:model-value="setRowHeightEnabled"
    />

    <div class="row items-center no-wrap q-gutter-sm q-mt-xs">
      <div class="col">
        <ValueSlider
          :model-value="localOptions.rowHeight"
          :min="10"
          :max="100"
          :step="5"
          suffix="px"
          :disable="!rowHeightEnabled"
          @update:model-value="setRowHeight"
        />
      </div>
    </div>
    <div class="text-caption q-mt-xs">
      {{
        rowHeightEnabled
          ? 'Row height of the widgets inside this container'
          : `Using the dashboard setting (${dashboardRowHeight}px)`
      }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDashboardStore } from 'stores/dashboard'
import ValueSlider from 'components/common/ValueSlider.vue'

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

function withDefaults(options) {
  return {
    colNum: 12,
    rowHeight: DEFAULT_ROW_HEIGHT,
    rowHeightEnabled: false,
    ...options
  }
}

// Local copy of options with defaults
const localOptions = ref(withDefaults(props.widgetOptions))

// Watch for external changes
watch(() => props.widgetOptions, (newOptions) => {
  localOptions.value = withDefaults(newOptions)
}, { deep: true, immediate: true })

const rowHeightEnabled = computed(() => !!localOptions.value.rowHeightEnabled)

// Emit changes to parent
function emitUpdate() {
  emit('update:widget-options', { ...localOptions.value })
}

function setRowHeightEnabled(value) {
  localOptions.value.rowHeightEnabled = value
  // Start the override from the inherited value instead of an empty slider.
  if (value && !Number.isFinite(localOptions.value.rowHeight)) {
    localOptions.value.rowHeight = dashboardRowHeight.value
  }
  emitUpdate()
}

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
