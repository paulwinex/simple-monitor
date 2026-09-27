<template>
  <div class="theme-select">
    <q-select
      :model-value="modelValue"
      :options="visibleOptions"
      :loading="themeStore.isLoading"
      use-input
      input-debounce="200"
      emit-value
      map-options
      dense
      outlined
      behavior="menu"
      class="theme-select__field"
      @input-value="onFilterInput"
      @update:model-value="onSelect"
    />

    <q-btn
      v-if="showEdit"
      flat
      round
      dense
      icon="edit"
      color="grey-7"
      :disable="!modelValue"
      @click="$emit('edit', modelValue)"
    >
      <q-tooltip>Open theme editor</q-tooltip>
    </q-btn>

    <template v-if="showActions">
      <input
        ref="importInput"
        type="file"
        accept="application/json,.json"
        class="theme-select__file"
        @change="onImportPicked"
      />

      <q-btn flat round dense icon="file_upload" color="grey-7" @click="pickImportFile">
        <q-tooltip>Import theme from a JSON file</q-tooltip>
      </q-btn>

      <q-btn flat round dense icon="download" color="grey-7" :disable="!modelValue" @click="onExport">
        <q-tooltip>Export theme as JSON</q-tooltip>
      </q-btn>

      <q-btn
        flat
        round
        dense
        icon="delete"
        color="grey-7"
        :disable="!modelValue || isBuiltin(modelValue)"
        @click="onDelete"
      >
        <q-tooltip>Delete theme</q-tooltip>
      </q-btn>
    </template>

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Notify } from 'quasar'
import { useThemeStore } from 'stores/theme'
import { useDashboardStore } from 'stores/dashboard'
import { normalizeTheme } from 'src/utils/themes'

const props = defineProps({
  modelValue: { type: String, required: true },
  /**
   * Whether choosing a theme also points the dashboard at it. The dashboard
   * settings dialog says yes; the theme editor switches the dashboard itself,
   * after the unsaved-changes guard has had its say.
   */
  applyToDashboard: { type: Boolean, default: true },
  /** The editor already *is* the editor, so it hides the shortcut to it. */
  showEdit: { type: Boolean, default: true },
  /** Dashboard settings keeps the button row; the editor's toolbar has a menu. */
  showActions: { type: Boolean, default: true },
  /** The whole catalog by default, an unsaved draft included for the editor. */
  options: { type: Array, default: null }
})

const emit = defineEmits(['update:modelValue', 'edit'])

const themeStore = useThemeStore()
const dashboardStore = useDashboardStore()

// A native input, hidden with CSS: the Quasar composable for this is not part of
// the auto-import set, and QFile exposes no public click() to reach for.
const importInput = ref(null)
const filterText = ref('')

const availableOptions = computed(() => props.options || themeStore.themeOptions)

/**
 * QSelect draws exactly the options it is given, so the search is applied here.
 * The needle matches the id as well as the name: both are what a user with a
 * half-remembered theme in mind has.
 */
const visibleOptions = computed(() => {
  const needle = filterText.value.trim().toLowerCase()
  if (!needle) return availableOptions.value
  return availableOptions.value.filter((option) =>
    `${option.label} ${option.value}`.toLowerCase().includes(needle)
  )
})

const selectedLabel = computed(
  () => availableOptions.value.find((option) => option.value === props.modelValue)?.label || ''
)

/**
 * The field echoes the selected name back into itself when it is opened and
 * when the model is replaced, which is not a search and must not narrow the
 * list the next time it is opened.
 */
function onFilterInput(value) {
  filterText.value = value === selectedLabel.value ? '' : value
}

function pickImportFile() {
  importInput.value?.click()
}

function isBuiltin(themeId) {
  return themeStore.themes.some((theme) => theme.id === themeId && theme.is_builtin)
}

function onSelect(themeId) {
  emit('update:modelValue', themeId)
  if (props.applyToDashboard) {
    dashboardStore.setDashboardTheme(themeId)
  }
}

async function onImportPicked(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    const raw = JSON.parse(await readFile(file))
    // Accept both a full export ({ id, name, payload }) and a bare payload.
    const name = typeof raw?.name === 'string' && raw.name.trim() ? raw.name : file.name.replace(/\.json$/i, '')
    const payload = raw?.payload ?? raw
    const document = normalizeTheme(payload)

    const created = await themeStore.create(name, document)
    if (props.applyToDashboard) {
      await dashboardStore.setDashboardTheme(created.id)
    } else {
      emit('update:modelValue', created.id)
    }
    Notify.create({ type: 'positive', message: `Imported theme "${created.name}"`, timeout: 3000 })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: `Import failed: ${error?.message || 'invalid theme file'}`,
      timeout: 5000
    })
  } finally {
    // Clearing lets the same file be picked again after a fix.
    if (importInput.value) importInput.value.value = ''
  }
}

function readFile(file) {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('could not read file'))
    reader.readAsText(file)
  })
}

async function onExport() {
  try {
    const exported = await themeStore.exportOne(props.modelValue)
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${exported.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    Notify.create({ type: 'negative', message: `Export failed: ${error?.message || 'unknown error'}`, timeout: 5000 })
  }
}

async function onDelete() {
  const theme = themeStore.themes.find((entry) => entry.id === props.modelValue)
  if (!theme || theme.is_builtin) return
  try {
    await themeStore.remove(theme.id)
    const nextId = themeStore.themes[0]?.id
    if (!nextId) return
    if (props.applyToDashboard) {
      // The dashboard must not keep pointing at a theme that no longer exists.
      await dashboardStore.setDashboardTheme(nextId)
    } else {
      emit('update:modelValue', nextId)
    }
    Notify.create({ type: 'positive', message: `Deleted theme "${theme.name}"`, timeout: 3000 })
  } catch (error) {
    Notify.create({ type: 'negative', message: `Delete failed: ${error?.message || 'unknown error'}`, timeout: 5000 })
  }
}
</script>

<style scoped>
.theme-select {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  width: 100%;
}

.theme-select__file {
  display: none;
}

.theme-select__field {
  flex: 1;
  min-width: 0;
}
</style>
