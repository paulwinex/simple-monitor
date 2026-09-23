<template>
  <DraggableDialog
    v-model="dialogVisible"
    title="Dashboard Settings"
    state-key="dashboard-settings"
    :width="560"
    :height="600"
  >
    <q-tabs
      v-model="activeTab"
      class="text-grey"
      active-color="primary"
      indicator-color="primary"
      align="left"
      narrow-indicator
      dense
      no-caps
      inline-label
    >
      <q-tab name="dashboard" label="Dashboard" icon="dashboard" />
      <q-tab name="widgets" label="Widgets" icon="widgets" />
    </q-tabs>
    <q-separator/>

    <q-tab-panels v-model="activeTab" animated class="q-pt-md">
      <q-tab-panel name="dashboard">
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
        <q-select
          :model-value="gridOptions.colNum"
          :options="colNumOptions"
          :display-value="String(gridOptions.colNum)"
          map-options
          emit-value
          use-input
          new-value-mode="add-unique"
          dense
          outlined
          behavior="menu"
          input-debounce="0"
          class="settings-select"
          @filter="filterColNum"
          @update:model-value="setColNum"
        />
      </SettingsRow>

      <SectionSeparator label="Widget spacing" />

      <SettingsRow label="Row height" hint="Height of one grid row in pixels. Controls how tall widgets get">
        <ValueSlider
          :model-value="gridOptions.rowHeight ?? 30"
          :min="10"
          :max="300"
          :step="10"
          suffix="px"
          @update:model-value="setRowHeight"
        />
      </SettingsRow>

      <SettingsRow label="Widget gap" hint="Space between widgets side by side and stacked vertically">
        <ValueSlider
          :model-value="gap"
          :min="0"
          :max="50"
          :step="1"
          suffix="px"
          @update:model-value="setGap"
        />
      </SettingsRow>

      <SectionSeparator label="Edge padding">
        <q-btn
          round
          flat
          dense
          :icon="paddingLocked ? 'lock' : 'lock_open'"
          :title="paddingLocked ? 'Unlock sides (edit separately)' : 'Lock sides to the same value'"
          @click="togglePaddingLock"
        />
      </SectionSeparator>
      <SettingsRow
        label="Top"
        :hint="paddingLocked ? 'Locked to the same value on all sides' : ''"
      >
        <ValueSlider
          :model-value="gridOptions.padding?.top"
          :min="0"
          :max="200"
          :step="1"
          suffix="px"
          @update:model-value="setPadding('top', $event)"
        />
      </SettingsRow>

      <SettingsRow label="Right">
        <ValueSlider
          :model-value="gridOptions.padding?.right"
          :min="0"
          :max="200"
          :step="1"
          suffix="px"
          @update:model-value="setPadding('right', $event)"
        />
      </SettingsRow>

      <SettingsRow label="Bottom">
        <ValueSlider
          :model-value="gridOptions.padding?.bottom"
          :min="0"
          :max="200"
          :step="1"
          suffix="px"
          @update:model-value="setPadding('bottom', $event)"
        />
      </SettingsRow>

      <SettingsRow label="Left">
        <ValueSlider
          :model-value="gridOptions.padding?.left"
          :min="0"
          :max="200"
          :step="1"
          suffix="px"
          @update:model-value="setPadding('left', $event)"
        />
      </SettingsRow>
        </div>
      </q-tab-panel>

      <q-tab-panel name="widgets">
        <div class="column q-gap-md">
          <SectionSeparator label="Widget surface" />

          <SettingsRow label="Background opacity" hint="Opacity of the widget background. 0 makes it fully transparent">
            <ValueSlider
              :model-value="gridOptions.widgetBackgroundOpacity ?? 100"
              :min="0"
              :max="100"
              :step="1"
              suffix="%"
              @update:model-value="setWidgetOpacity('widgetBackgroundOpacity', $event)"
            />
          </SettingsRow>

          <SettingsRow label="Header opacity" hint="Opacity of the widget header. 0 makes it fully transparent">
            <ValueSlider
              :model-value="gridOptions.widgetHeaderOpacity ?? 100"
              :min="0"
              :max="100"
              :step="1"
              suffix="%"
              @update:model-value="setWidgetOpacity('widgetHeaderOpacity', $event)"
            />
          </SettingsRow>

          <SettingsRow label="Border opacity" hint="Opacity of the widget border. 0 makes it fully transparent without changing geometry">
            <ValueSlider
              :model-value="gridOptions.widgetBorderOpacity ?? 100"
              :min="0"
              :max="100"
              :step="1"
              suffix="%"
              @update:model-value="setWidgetOpacity('widgetBorderOpacity', $event)"
            />
          </SettingsRow>
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </DraggableDialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useDashboardStore } from 'stores/dashboard'
import { useThemeStore } from 'stores/theme'
import { getThemes, getSavedTheme, applyTheme } from 'src/utils/themes'
import DraggableDialog from './DraggableDialog.vue'
import SectionSeparator from './SectionSeparator.vue'
import SettingsRow from './SettingsRow.vue'
import ValueSlider from "components/common/ValueSlider.vue";

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue'])

const $q = useQuasar()
const dashboardStore = useDashboardStore()
const themeStore = useThemeStore()

const PADDING_LOCK_STORAGE_KEY = 'sm-dashboard-padding-lock'

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const activeTab = ref('dashboard')

const gridOptions = computed(() => dashboardStore.gridOptions)
const gap = computed(() => gridOptions.value.margin?.x ?? 10)

const COL_NUM_PRESETS = [2, 4, 8, 12, 16, 20, 32]
const colNumOptions = ref(COL_NUM_PRESETS.map((v) => ({ label: String(v), value: v })))

function filterColNum(val, update) {
  update(() => {
    if (val === '') {
      colNumOptions.value = COL_NUM_PRESETS.map((v) => ({ label: String(v), value: v }))
    } else {
      const needle = val.toLowerCase()
      colNumOptions.value = COL_NUM_PRESETS
        .filter((v) => String(v).toLowerCase().includes(needle))
        .map((v) => ({ label: String(v), value: v }))
    }
  })
}

const themeOptions = computed(() => getThemes().map((t) => ({ label: t.label, value: t.id })))
const themeId = ref(getSavedTheme().id)

function onThemeChange(value) {
  themeId.value = value
  const theme = getThemes().find((t) => t.id === value)
  if (theme) {
    themeStore.setThemeId(value)
    applyTheme(theme, $q)
  }
}

const verticalCompact = computed({
  get: () => !!gridOptions.value.verticalCompact,
  set: (value) => dashboardStore.updateGridOptions({ verticalCompact: value })
})

const paddingLocked = ref(localStorage.getItem(PADDING_LOCK_STORAGE_KEY) === '1')

function togglePaddingLock() {
  paddingLocked.value = !paddingLocked.value
  localStorage.setItem(PADDING_LOCK_STORAGE_KEY, paddingLocked.value ? '1' : '0')
}

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
  const parsed = Math.max(2, Math.min(48, parseInt(value, 10) || 12))
  dashboardStore.updateGridOptions({ colNum: parsed })
}

function setRowHeight(value) {
  const parsed = Math.max(10, Math.min(300, Math.round(value) || 30))
  dashboardStore.updateGridOptions({ rowHeight: parsed })
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

function setWidgetOpacity(key, value) {
  const parsed = Math.max(0, Math.min(100, Math.round(value) || 0))
  dashboardStore.updateGridOptions({ [key]: parsed })
}
</script>

<style scoped>
.settings-select {
  width: 160px;
}

.settings-input {
  width: 110px;
}
</style>
