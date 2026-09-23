<template>
  <DraggableDialog
    v-model="dialogVisible"
    title="Dashboard Settings"
    state-key="dashboard-settings"
    :width="560"
    :height="600"
  >
    <div class="column q-gap-md">
      <SettingsRow label="Interface theme">
        <q-select
          :model-value="themeId"
          :options="themeOptions"
          map-options
          emit-value
          dense
          outlined
          behavior="menu"
          class="settings-select"
          @update:model-value="onThemeChange"
        />
      </SettingsRow>

      <SettingsRow label="Auto-layout" hint="Widgets shift up to fill vertical gaps while editing">
        <div class="row items-center no-wrap q-gap-sm">
          <span class="text-caption">{{ gridOptions.verticalCompact ? 'On' : 'Off' }}</span>
          <q-toggle v-model="verticalCompact" @update:model-value="onAutoLayoutToggle" />
        </div>
      </SettingsRow>

      <SettingsRow label="Columns" hint="Number of columns in the grid. Higher values give finer control over widget width and snapping.">
        <q-input
          :model-value="gridOptions.colNum"
          type="number"
          dense
          outlined
          suffix="cols"
          :min="6"
          :max="48"
          class="settings-input"
          @update:model-value="setColNum"
        />
      </SettingsRow>

      <q-separator />

      <div class="text-subtitle2">Widget spacing</div>

      <SettingsRow label="Widget gap" hint="Space between widgets side by side and stacked vertically">
        <q-slider
          :model-value="gap"
          :min="0"
          :max="50"
          :step="1"
          label
          label-always
          :label-value="gap + ' px'"
          class="settings-slider"
          @update:model-value="setGap"
        />
      </SettingsRow>

      <q-separator />

      <div class="row items-center justify-between">
        <div class="text-subtitle2">Edge padding</div>
        <q-btn
          round
          flat
          dense
          :icon="paddingLocked ? 'lock' : 'lock_open'"
          :title="paddingLocked ? 'Unlock sides (edit separately)' : 'Lock sides to the same value'"
          @click="paddingLocked = !paddingLocked"
        />
      </div>

      <SettingsRow
        label="Top"
        :hint="paddingLocked ? 'Locked to the same value on all sides' : ''"
      >
        <q-slider
          :model-value="gridOptions.padding?.top"
          :min="0"
          :max="200"
          :step="1"
          label
          label-always
          :label-value="gridOptions.padding?.top + ' px'"
          class="settings-slider"
          @update:model-value="setPadding('top', $event)"
        />
      </SettingsRow>

      <SettingsRow label="Right">
        <q-slider
          :model-value="gridOptions.padding?.right"
          :min="0"
          :max="200"
          :step="1"
          label
          label-always
          :label-value="gridOptions.padding?.right + ' px'"
          class="settings-slider"
          @update:model-value="setPadding('right', $event)"
        />
      </SettingsRow>

      <SettingsRow label="Bottom">
        <q-slider
          :model-value="gridOptions.padding?.bottom"
          :min="0"
          :max="200"
          :step="1"
          label
          label-always
          :label-value="gridOptions.padding?.bottom + ' px'"
          class="settings-slider"
          @update:model-value="setPadding('bottom', $event)"
        />
      </SettingsRow>

      <SettingsRow label="Left">
        <q-slider
          :model-value="gridOptions.padding?.left"
          :min="0"
          :max="200"
          :step="1"
          label
          label-always
          :label-value="gridOptions.padding?.left + ' px'"
          class="settings-slider"
          @update:model-value="setPadding('left', $event)"
        />
      </SettingsRow>
    </div>
  </DraggableDialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useDashboardStore } from 'stores/dashboard'
import DraggableDialog from './DraggableDialog.vue'
import SettingsRow from './SettingsRow.vue'
import { getThemes, getSavedTheme, applyTheme } from 'src/utils/themes'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue'])

const $q = useQuasar()
const dashboardStore = useDashboardStore()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const gridOptions = computed(() => dashboardStore.gridOptions)
const gap = computed(() => gridOptions.value.margin?.x ?? 10)

const themeOptions = computed(() => getThemes().map((t) => ({ label: t.label, value: t.id })))
const themeId = ref(getSavedTheme().id)

function onThemeChange(value) {
  themeId.value = value
  const theme = getThemes().find((t) => t.id === value)
  if (theme) applyTheme(theme, $q)
}

const verticalCompact = computed({
  get: () => !!gridOptions.value.verticalCompact,
  set: (value) => dashboardStore.updateGridOptions({ verticalCompact: value })
})

const paddingLocked = ref(false)

function onAutoLayoutToggle(value) {
  dashboardStore.updateGridOptions({ verticalCompact: value })
  if (value) {
    dashboardStore.recompactGrid()
  }
}

function setGap(value) {
  const parsed = Math.max(0, Math.round(value) || 0)
  dashboardStore.updateGridOptions({ margin: { x: parsed, y: parsed } })
}

function setColNum(value) {
  const parsed = Math.max(6, Math.min(48, parseInt(value, 10) || 12))
  dashboardStore.updateGridOptions({ colNum: parsed })
}

function setPadding(side, value) {
  const parsed = Math.max(0, Math.round(value) || 0)
  const padding = { ...(gridOptions.value.padding || { top: 16, right: 16, bottom: 16, left: 16 }) }
  padding[side] = parsed
  if (paddingLocked.value) {
    padding.top = parsed
    padding.right = parsed
    padding.bottom = parsed
    padding.left = parsed
  }
  dashboardStore.updateGridOptions({ padding })
}
</script>

<style scoped>
.settings-select {
  width: 160px;
}

.settings-input {
  width: 110px;
}

.settings-slider {
  width: 240px;
}
</style>