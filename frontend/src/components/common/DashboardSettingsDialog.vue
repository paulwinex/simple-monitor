<template>
  <DraggableDialog
    v-model="dialogVisible"
    title="Dashboard Settings"
    state-key="dashboard-settings"
    :width="560"
    :height="420"
  >
    <div class="column q-gap-md">
      <SettingsRow
        label="Dashboard theme"
        hint="Colours and grid spacing of the dashboard itself. Saved with this dashboard."
      >
        <ThemeSelect
          :model-value="dashboardStore.currentOptions.theme || FALLBACK_THEME.id"
          @edit="onEditTheme"
        />
      </SettingsRow>

      <q-separator />

      <SettingsRow
        label="Columns"
        hint="Number of columns in the grid. Higher values give finer control over widget width and snapping."
      >
        <q-input
          :model-value="colNumText"
          type="number"
          dense
          outlined
          :min="2"
          :max="48"
          class="settings-input settings-select"
          @focus="onColNumFocus"
          @update:model-value="onColNumTextChange"
          @keyup.enter="commitColNum"
          @blur="commitColNum"
        >
          <template #append>
            <q-btn
              flat
              round
              dense
              icon="arrow_drop_down"
              aria-label="Presets"
              @click.stop="colNumMenu = !colNumMenu"
            />
          </template>
          <q-menu v-model="colNumMenu" auto-close :offset="[0, 4]">
            <div class="col-presets column" style="min-width: 140px">
              <div class="text-caption text-grey-7 q-px-sm q-py-xs">Presets</div>
              <div
                v-for="p in COL_NUM_PRESETS"
                :key="p"
                class="col-preset row items-center no-wrap q-px-sm q-py-xs cursor-pointer"
                :class="{ 'text-primary': p === gridOptions.colNum }"
                @click="applyColNumPreset(p)"
              >
                <span>{{ p }}</span>
                <q-icon v-if="p === gridOptions.colNum" name="check" size="16px" class="q-ml-auto" />
              </div>
            </div>
          </q-menu>
        </q-input>
      </SettingsRow>

      <SettingsRow
        label="Auto-layout"
        hint="Widgets shift up to fill vertical gaps while editing. Part of the dashboard, not the theme."
      >
        <div class="row items-center no-wrap q-gap-sm">
          <span class="text-caption">{{ gridOptions.verticalCompact ? 'On' : 'Off' }}</span>
          <q-toggle :model-value="gridOptions.verticalCompact" @update:model-value="onAutoLayoutToggle" />
        </div>
      </SettingsRow>

      <q-separator />

      <SettingsRow
        label="Interface theme"
        hint="Chrome only: dialogs, menus and panels. The dashboard content follows the dashboard theme."
      >
        <q-btn-toggle
          :model-value="uiThemeStore.preference"
          :options="uiThemeToggleOptions"
          unelevated
          toggle-color="primary"
          color="grey-3"
          text-color="grey-8"
          no-caps
          dense
          class="settings-select"
          @update:model-value="onUiThemeChange"
        />
      </SettingsRow>
    </div>
  </DraggableDialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDashboardStore } from 'stores/dashboard'
import { useUiThemeStore } from 'stores/uiTheme'
import { FALLBACK_THEME } from 'src/utils/themes'
import DraggableDialog from './DraggableDialog.vue'
import SettingsRow from './SettingsRow.vue'
import ThemeSelect from './ThemeSelect.vue'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'edit-theme'])

const dashboardStore = useDashboardStore()
const uiThemeStore = useUiThemeStore()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Grid spacing (row height, gaps, edge padding) is not here: it belongs to the
// theme, so it is edited and saved with the theme in the theme editor.
const gridOptions = computed(() => dashboardStore.gridOptions)

const COL_NUM_PRESETS = [2, 4, 8, 12, 16, 20, 32]
const colNumText = ref(String(gridOptions.value.colNum ?? 12))
const colNumMenu = ref(false)

function onColNumFocus(event) {
  event.target.select()
}

function onColNumTextChange(value) {
  colNumText.value = value
}

function commitColNum() {
  const parsed = Math.max(2, Math.min(48, parseInt(colNumText.value, 10) || 12))
  colNumText.value = String(parsed)
  dashboardStore.updateGridOptions({ colNum: parsed })
}

function applyColNumPreset(value) {
  colNumText.value = String(value)
  dashboardStore.updateGridOptions({ colNum: value })
}

watch(
  () => gridOptions.value.colNum,
  (value) => {
    colNumText.value = String(value ?? 12)
  }
)

const UI_THEME_LABELS = { light: 'Light', dark: 'Dark', system: 'Auto' }
const UI_THEME_ICONS = { light: 'light_mode', dark: 'dark_mode', system: 'brightness_auto' }

const uiThemeToggleOptions = computed(() =>
  uiThemeStore.options.map(({ value }) => ({
    label: UI_THEME_LABELS[value] || value,
    icon: UI_THEME_ICONS[value],
    value
  }))
)

function onUiThemeChange(value) {
  uiThemeStore.setPreference(value)
}

// ThemeSelect persists the choice itself through dashboardStore, and the
// dashboard store is the single source of truth for :model-value.
function onEditTheme(themeId) {
  emit('edit-theme', themeId)
}

function onAutoLayoutToggle(value) {
  dashboardStore.updateGridOptions({ verticalCompact: value })
  if (value) {
    dashboardStore.recompactGrid()
  }
}
</script>

<style scoped>
.settings-select {
  min-width: 160px;
}

.settings-input {
  width: 150px;
}
</style>
