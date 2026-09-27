<template>
  <DraggableDialog
    v-model="visible"
    title="Theme Editor"
    state-key="theme-editor"
    :width="720"
    :height="640"
    :persistent="true"
    :before-close="onBeforeClose"
  >
    <template v-if="draft">
      <!-- Which theme is being edited, and what can be done to it -->
      <div class="editor-toolbar">
        <ThemeSelect
          :model-value="draft.id"
          :options="themeChoices"
          :apply-to-dashboard="false"
          :show-edit="false"
          :show-actions="false"
          class="editor-toolbar__select"
          @update:model-value="onRequestSwitch"
        />
        <q-btn
          flat
          dense
          no-caps
          color="grey-7"
          icon="more_vert"
          aria-label="Theme actions"
          :disable="busy"
        >
          <q-tooltip>Theme actions</q-tooltip>
          <q-menu auto-close anchor="bottom right" self="top right">
            <q-list dense style="min-width: 168px">
              <q-item clickable :disable="!canSave" @click="onSave">
                <q-item-section>SAVE</q-item-section>
                <q-item-section side><q-icon name="save" size="18px" /></q-item-section>
              </q-item>
              <q-item clickable :disable="busy" @click="onSaveAs">
                <q-item-section>SAVE AS</q-item-section>
                <q-item-section side><q-icon name="content_copy" size="18px" /></q-item-section>
              </q-item>
              <q-item clickable :disable="!canReset" @click="onReset">
                <q-item-section>RESET</q-item-section>
                <q-item-section side><q-icon name="restore" size="18px" /></q-item-section>
              </q-item>
              <q-item clickable :disable="!draft || busy" @click="onApply">
                <q-item-section>APPLY</q-item-section>
                <q-item-section side><q-icon name="check_circle" size="18px" /></q-item-section>
              </q-item>
              <q-item clickable :disable="busy" @click="pickImportFile">
                <q-item-section>IMPORT</q-item-section>
                <q-item-section side><q-icon name="file_upload" size="18px" /></q-item-section>
              </q-item>
              <q-item clickable @click="onExport">
                <q-item-section>EXPORT</q-item-section>
                <q-item-section side><q-icon name="download" size="18px" /></q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable :disable="!canDelete" class="text-negative" @click="onDelete">
                <q-item-section>DELETE</q-item-section>
                <q-item-section side><q-icon name="delete" size="18px" /></q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>

      <input
        ref="importInput"
        type="file"
        accept="application/json,.json"
        class="editor-import"
        @change="runAction(onImportPicked)"
      />

      <div class="column q-gutter-sm q-mb-md">
        <q-input
          v-model="name"
          dense
          outlined
          label="Theme name"
          :error="Boolean(nameError)"
          :error-message="nameError"
        />
        <div class="text-caption text-grey-6">
          Id <code>{{ draft.id || 'assigned on save' }}</code> — SAVE writes the theme to the database,
          APPLY points this dashboard at it. Neither happens by itself.
        </div>
      </div>

      <q-banner v-if="isDirty" dense class="bg-orange-1 text-orange-9 q-mb-md">
        {{ dirtyBanner }}
      </q-banner>

      <q-input
        v-model="search"
        dense
        outlined
        clearable
        label="Filter fields"
        class="q-mb-sm"
      >
        <template #prepend><q-icon name="search" /></template>
      </q-input>

      <q-expansion-item
        v-for="section in visibleSections"
        :key="section.id"
        :icon="section.icon"
        :label="section.title"
        :caption="section.hint"
        header-class="section-header"
        dense-toggle
        default-opened
      >
        <div class="column q-gutter-md q-pa-sm">
          <div v-if="section.id === 'layout'" class="row justify-end">
            <q-btn
              round
              flat
              dense
              size="sm"
              :icon="paddingLocked ? 'lock' : 'lock_open'"
              :title="paddingLocked ? 'Unlock sides (edit separately)' : 'Lock all sides to the same value'"
              @click="togglePaddingLock"
            />
          </div>
          <div v-for="field in section.fields" :key="field.path" class="field-row">
            <div class="field-row__label">
              {{ field.label }}
              <div class="field-row__path">{{ field.path }}</div>
            </div>
            <div class="field-row__control">
              <FieldControl
                :field="field"
                :value="getValue(field.path)"
                @update:model-value="(value) => setValue(field.path, value)"
              />
            </div>
          </div>
        </div>
      </q-expansion-item>
    </template>

    <template #actions>
      <div class="row justify-end">
        <q-btn flat dense no-caps label="Close" color="grey-7" @click="onRequestClose" />
      </div>
    </template>
  </DraggableDialog>

  <!-- Unsaved changes: closing, switching theme, applying -->
  <q-dialog v-model="showGuard">
    <q-card
      class="q-dialog-plugin"
      :class="{ 'q-dialog-plugin--dark q-dark': isDark }"
      style="width: 360px; max-width: 92vw"
    >
      <q-card-section class="q-dialog__title">Unsaved changes</q-card-section>
      <q-card-section class="q-dialog__message">{{ guard?.message }}</q-card-section>
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Cancel" color="primary" @click="showGuard = false" />
        <q-btn flat label="Discard" color="negative" :disable="busy" @click="guardDiscard" />
        <q-btn flat label="Save" color="positive" :disable="busy" @click="guardSave" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- The name a SAVE AS copy is created under -->
  <q-dialog v-model="showSaveAs">
    <q-card
      class="q-dialog-plugin"
      :class="{ 'q-dialog-plugin--dark q-dark': isDark }"
      style="width: 360px; max-width: 92vw"
    >
      <q-card-section class="q-dialog__title">Save as</q-card-section>
      <q-card-section class="q-dialog__message column q-gutter-sm">
        <q-input
          v-model="saveAsName"
          dense
          outlined
          autofocus
          label="New theme name"
          :error="Boolean(saveAsError)"
          :error-message="saveAsError"
          @keyup.enter="confirmSaveAs"
        />
        <div class="text-caption">
          A copy of the draft as it is on screen. The dashboard keeps its own theme until you APPLY it.
        </div>
      </q-card-section>
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Cancel" color="primary" @click="showSaveAs = false" />
        <q-btn flat label="Save as" color="positive" :disable="!saveAsName.trim()" @click="confirmSaveAs" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- RESET and DELETE both need a yes first -->
  <q-dialog v-model="showConfirmation">
    <q-card
      class="q-dialog-plugin"
      :class="{ 'q-dialog-plugin--dark q-dark': isDark }"
      style="width: 360px; max-width: 92vw"
    >
      <q-card-section class="q-dialog__title">{{ confirmation?.title }}</q-card-section>
      <q-card-section class="q-dialog__message">{{ confirmation?.message }}</q-card-section>
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Cancel" color="primary" :disable="busy" @click="showConfirmation = false" />
        <q-btn
          flat
          :label="confirmation?.confirmLabel"
          :color="confirmation?.danger ? 'negative' : 'primary'"
          :loading="busy"
          @click="runAction(onConfirmationAccepted)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Notify, useQuasar } from 'quasar'
import DraggableDialog from 'components/common/DraggableDialog.vue'
import FieldControl from './FieldControl.vue'
import { useThemeStore } from 'stores/theme'
import { useDashboardStore } from 'stores/dashboard'
import {
  changedThemePaths,
  cloneTheme,
  getThemePath,
  normalizeTheme,
  setThemePath,
  validateTheme
} from 'src/utils/themes'
import descriptors from './themeEditorFields.json'
import ThemeSelect from 'components/common/ThemeSelect.vue'

const PADDING_LOCK_STORAGE_KEY = 'sm-theme-padding-lock'
const PADDING_SIDES = ['top', 'right', 'bottom', 'left']
const NEW_THEME_ID = 'new'
const DESCRIPTOR_PATHS = descriptors.sections.flatMap((section) => section.fields.map((f) => f.path))

const GUARD_MESSAGES = {
  close:
    'The theme being edited has unsaved changes. Closing throws them away unless you save them first.',
  switch:
    'The theme being edited has unsaved changes. Save them to keep them, or switch themes and lose them.',
  apply:
    'The draft has unsaved changes. APPLY uses what is on screen, so save it first to keep both.'
}

const props = defineProps({
  modelValue: Boolean,
  themeId: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const $q = useQuasar()
const themeStore = useThemeStore()
const dashboardStore = useDashboardStore()

/** The editable copy. The store's document is never mutated in place. */
const draft = ref(null)
const name = ref('')
const search = ref('')
const busy = ref(false)
const nameError = ref('')
/** What the draft looked like when editing started: the dirty signal is a diff
 *  against this, not a hand-kept list of paths the user touched. */
const snapshot = ref(null)
const paddingLocked = ref(localStorage.getItem(PADDING_LOCK_STORAGE_KEY) === '1')

/** Built-in presets may be edited, never deleted. */
const isBuiltinTheme = (themeId) =>
  themeStore.themes.some((theme) => theme.id === themeId && theme.is_builtin)

const importInput = ref(null)
const saveAsName = ref('')
const saveAsError = ref('')
const showSaveAs = ref(false)
/** { message, action } while the unsaved-changes question is open. */
const guard = ref(null)
/** { title, message, confirmLabel, danger, onConfirm } for RESET and DELETE. */
const confirmation = ref(null)

const showGuard = computed({
  get: () => !!guard.value,
  set: (value) => {
    if (!value) guard.value = null
  }
})
const showConfirmation = computed({
  get: () => !!confirmation.value,
  set: (value) => {
    if (!value) confirmation.value = null
  }
})

const isDark = computed(() => $q.dark.mode === true || $q.dark.mode === 'true')

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

/** The descriptor paths that no longer hold the value they were opened with. */
const dirtyPaths = computed(() => {
  if (!draft.value || !snapshot.value) return []
  const changed = changedThemePaths(snapshot.value.document, draft.value, DESCRIPTOR_PATHS)
  if (draft.value.id !== snapshot.value.document.id) changed.unshift('id')
  if (name.value !== snapshot.value.name) changed.unshift('name')
  return changed
})

/** A theme the catalog has never heard of: a fresh copy, or one just created. */
const isUnsavedTheme = computed(() => !!draft.value && !themeStore.has(draft.value.id))

const isDirty = computed(() => dirtyPaths.value.length > 0 || isUnsavedTheme.value)

const dirtyBanner = computed(() => {
  if (isUnsavedTheme.value) {
    return 'Unsaved theme copy — the dashboard is already showing it, but nothing is in the database yet.'
  }
  const count = dirtyPaths.value.length
  return `${count} unsaved change${count === 1 ? '' : 's'} — the dashboard is already showing them.`
})

const visibleSections = computed(() => {
  const needle = search.value?.trim().toLowerCase()
  if (!needle) return descriptors.sections
  return descriptors.sections
    .map((section) => ({
      ...section,
      fields: section.fields.filter(
        (field) =>
          field.path.toLowerCase().includes(needle) || field.label.toLowerCase().includes(needle)
      )
    }))
    .filter((section) => section.fields.length)
})

const canSave = computed(() => !!draft.value && !!name.value.trim() && !busy.value)
const canReset = computed(() => !!draft.value && !isUnsavedTheme.value && !busy.value)
const canDelete = computed(
  () => !!draft.value && !isUnsavedTheme.value && !isBuiltinTheme(draft.value.id) && !busy.value
)

/** The catalog plus the draft, so an unsaved copy is visible in the dropdown. */
const themeChoices = computed(() => {
  const options = themeStore.themeOptions
  const id = draft.value?.id
  if (id && themeStore.has(id)) return options
  return [{ label: `${name.value.trim() || 'Draft'} (unsaved)`, value: id || '' }, ...options]
})

// Load a fresh copy every time the dialog opens: abandoning the dialog must
// never leave a half-edited document in the store.
watch(visible, (open) => {
  if (!open) return
  startEditing(props.themeId || dashboardThemeId.value)
})

/** Load a clean copy of a theme into the draft and preview it. */
function startEditing(themeId) {
  loadDraft(themeStore.documentFor(themeId) || themeStore.currentTheme)
  search.value = ''
}

/** Put a copy of a committed document in the draft and preview it. */
function loadDraft(document) {
  draft.value = cloneTheme(document)
  name.value = draft.value.name || ''
  snapshot.value = { document: cloneTheme(draft.value), name: name.value }
  nameError.value = ''
  // The draft is previewed on the current dashboard, whatever theme it is:
  // that is how you check a theme before applying it to anything.
  themeStore.preview(draft.value)
}

/**
 * Run an action behind the unsaved-changes question. Save commits the draft
 * first, Discard throws the changes away, Cancel changes nothing.
 */
function guarded(reason, action) {
  if (!isDirty.value) {
    action()
    return
  }
  guard.value = { message: GUARD_MESSAGES[reason], action }
}

async function continueGuarded(saveFirst) {
  const pending = guard.value
  guard.value = null
  if (!pending) return
  if (saveFirst && !(await runAction(saveDraft))) return
  if (!saveFirst) discardDraft()
  await pending.action()
}

function guardSave() {
  continueGuarded(true)
}

function guardDiscard() {
  continueGuarded(false)
}

/** One async action at a time, so a double click cannot save twice. */
async function runAction(action) {
  if (busy.value) return false
  busy.value = true
  try {
    return await action()
  } finally {
    busy.value = false
  }
}

/** Throw the unsaved changes away: back to what the catalog holds. */
function discardDraft() {
  const id = draft.value?.id
  const committed = themeStore.documentFor(id)
  // A copy has nothing to go back to; it simply stays as it is until it is saved.
  if (!committed) return
  loadDraft(committed)
}

/** Switch to another theme: the dashboard follows, as it does in settings. */
function onRequestSwitch(themeId) {
  if (!themeId || themeId === draft.value?.id) return
  guarded('switch', () => runAction(() => switchTheme(themeId)))
}

async function switchTheme(themeId) {
  try {
    await dashboardStore.setDashboardTheme(themeId)
  } catch {
    // The dashboard store has already said what went wrong: stay on this theme.
    return
  }
  startEditing(themeId)
}

function getValue(path) {
  return getThemePath(draft.value, path)
}

function setValue(path, value) {
  // Locked padding mirrors one value onto all four sides.
  if (paddingLocked.value && path.startsWith('layout.padding.')) {
    const side = path.split('.')[2]
    for (const other of PADDING_SIDES) {
      if (other !== side) draft.value = setThemePath(draft.value, `layout.padding.${other}`, value)
    }
  }
  // setThemePath is immutable: the returned document is the new draft, and the
  // discarded old one is what left every control looking dead.
  draft.value = setThemePath(draft.value, path, value)
  // Lenient, so a half-typed value stays in the draft and the control keeps
  // showing what was typed into it. The preview and the save path normalize
  // strictly again before anything reaches CSS or the API.
  draft.value = normalizeTheme(draft.value, 'lenient')
  themeStore.preview(draft.value)
}

function togglePaddingLock() {
  paddingLocked.value = !paddingLocked.value
  localStorage.setItem(PADDING_LOCK_STORAGE_KEY, paddingLocked.value ? '1' : '0')
}

/** The dashboard goes back to its own theme, whether or not this was it. */
const dashboardThemeId = computed(
  () => dashboardStore.currentOptions?.theme || themeStore.currentThemeId
)

function returnToDashboardTheme() {
  // If the edited theme *is* the dashboard's theme, revert() picks up the
  // version just saved; otherwise the dashboard simply gets its own theme back.
  // revert(), not setThemeId(): only the first one drops the preview.
  const id = dashboardThemeId.value
  themeStore.revert(id)
  draft.value = null
}

function closeEditor() {
  returnToDashboardTheme()
  visible.value = false
}

/** X, ESC and the backdrop all land here; the editor is persistent, so this
 *  is the only way out and the guard cannot be walked around. */
function onBeforeClose() {
  // A dialog on top owns the keyboard until it has been answered.
  if (guard.value || confirmation.value || showSaveAs.value) return false
  guarded('close', closeEditor)
  return false
}

function onRequestClose() {
  if (guard.value || confirmation.value || showSaveAs.value) return
  guarded('close', closeEditor)
}

/** For a caller that has already asked and been answered "discard". */
function discardAndClose() {
  discardDraft()
  closeEditor()
}

/**
 * Persist the draft. The dashboard is deliberately left alone: `apply: false`
 * keeps create() from moving the current theme id and keeps update() from
 * re-applying the committed document over the running preview.
 */
async function saveDraft() {
  if (!draft.value) return false
  if (!name.value.trim()) {
    nameError.value = 'Name is required'
    return false
  }
  const trimmed = name.value.trim()
  // Whether this is an update is decided by the draft, not by the payload id:
  // a copy carries the placeholder below, and the catalog really can hold a
  // theme called "new". The backend derives the copy's id from its name.
  const isExisting = !!draft.value.id && themeStore.has(draft.value.id)
  // Strict: what leaves here has to be a complete, valid document, so an
  // in-progress value from the preview is coerced back to a usable one.
  const payload = normalizeTheme(
    { ...draft.value, name: trimmed, id: isExisting ? draft.value.id : NEW_THEME_ID },
    'strict'
  )
  // validateTheme reports a list of problems, empty when the document is fine.
  const problems = validateTheme(payload)
  if (problems.length) {
    nameError.value = ''
    Notify.create({
      type: 'negative',
      message: `Invalid theme: ${problems[0].path} ${problems[0].message}`,
      timeout: 5000
    })
    return false
  }

  try {
    const saved = isExisting
      ? await themeStore.update(payload.id, trimmed, payload, { apply: false })
      : await themeStore.create(trimmed, payload, { apply: false })
    draft.value = { ...cloneTheme(payload), id: saved.id, name: saved.name }
    name.value = saved.name
    snapshot.value = { document: cloneTheme(draft.value), name: name.value }
    Notify.create({ type: 'positive', message: `Saved theme "${saved.name}"`, timeout: 2500 })
    return true
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: `Save failed: ${error?.response?.data?.detail?.[0]?.msg || error?.message || 'unknown error'}`,
      timeout: 6000
    })
    return false
  }
}

function onSave() {
  runAction(saveDraft)
}

/** A copy of the draft, unnamed in the catalog until it is saved. */
function onSaveAs() {
  saveAsName.value = `${name.value.trim() || draft.value?.name || 'Theme'} copy`
  saveAsError.value = ''
  showSaveAs.value = true
}

function confirmSaveAs() {
  if (!draft.value) return
  const copyName = saveAsName.value.trim()
  if (!copyName) {
    saveAsError.value = 'Name is required'
    return
  }
  // A blank id is the "assigned on save" marker the name row shows. The draft
  // must not be pointed back at the theme it was copied from, so the id goes
  // and the backend hands out a fresh one derived from the new name.
  draft.value = { ...cloneTheme(draft.value), id: '', name: copyName }
  name.value = copyName
  nameError.value = ''
  snapshot.value = { document: cloneTheme(draft.value), name: name.value }
  themeStore.preview(draft.value)
  showSaveAs.value = false
  Notify.create({ type: 'info', message: `Copy "${copyName}" ready — press SAVE to create it`, timeout: 3000 })
}

/** Re-read the theme from the API: the store's copy may predate other edits. */
function onReset() {
  if (!canReset.value) return
  confirmation.value = {
    title: 'Discard changes?',
    message: `"${name.value}" is read from the database again. Everything changed here since is lost.`,
    confirmLabel: 'Reset',
    onConfirm: resetDraft
  }
}

async function resetDraft() {
  const id = draft.value?.id
  if (!id) return
  try {
    await themeStore.loadThemes()
    if (themeStore.loadError.value) return
    const committed = themeStore.documentFor(id)
    if (!committed) {
      Notify.create({ type: 'negative', message: `"${id}" is no longer in the catalog`, timeout: 4000 })
      return
    }
    loadDraft(committed)
    Notify.create({ type: 'positive', message: `Reverted to the saved "${committed.name}"`, timeout: 2500 })
  } finally {
    showConfirmation.value = false
  }
}

/** Point this dashboard at the draft. Leaves the editor open: the draft is
 *  still the thing being edited, only now it is also the live theme. */
function onApply() {
  guarded('apply', () => runAction(applyDraft))
}

async function applyDraft() {
  if (!draft.value) return
  // A copy has no id to point at, so it has to be written first.
  if (isUnsavedTheme.value && !(await saveDraft())) return
  try {
    await dashboardStore.setDashboardTheme(draft.value.id)
    Notify.create({ type: 'positive', message: `Dashboard is on "${name.value}"`, timeout: 2500 })
  } catch {
    // The dashboard store has already said what went wrong.
  }
}

function pickImportFile() {
  importInput.value?.click()
}

async function onImportPicked(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const target = event.target
  try {
    const raw = JSON.parse(await readFile(file))
    // Accept both a full export ({ id, name, payload }) and a bare payload.
    const importedName =
      typeof raw?.name === 'string' && raw.name.trim() ? raw.name : file.name.replace(/\.json$/i, '')
    const document = normalizeTheme(raw?.payload ?? raw)
    // apply: false, like SAVE: an import is not a request to change the dashboard.
    const created = await themeStore.create(importedName, document, { apply: false })
    startEditing(created.id)
    Notify.create({ type: 'positive', message: `Imported theme "${created.name}"`, timeout: 3000 })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: `Import failed: ${error?.message || 'invalid theme file'}`,
      timeout: 5000
    })
  } finally {
    // Clearing lets the same file be picked again after a fix.
    if (target) target.value = ''
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

/** What is on screen, unsaved changes included, in the shape an import reads. */
function onExport() {
  const theme = normalizeTheme({ ...draft.value, name: name.value.trim() })
  const exported = { id: theme.id, name: theme.name, payload: theme }
  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = `${exported.id || fileSlug(exported.name)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function fileSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'theme'
}

/** The backend refuses to delete a built-in preset; the button is greyed out
 *  for the same reason before the request is made. */
function onDelete() {
  if (!canDelete.value) return
  confirmation.value = {
    title: 'Delete theme?',
    message: `"${name.value}" is deleted for good. Dashboards using it fall back to the first theme.`,
    confirmLabel: 'Delete',
    danger: true,
    onConfirm: deleteTheme
  }
}

async function deleteTheme() {
  const id = draft.value?.id
  if (!id) return
  const theme = themeStore.themes.find((entry) => entry.id === id)
  if (!theme || theme.is_builtin) return
  const wasDashboardTheme = dashboardThemeId.value === id
  try {
    await themeStore.remove(id)
    const nextId = themeStore.themes[0]?.id
    if (!nextId) {
      closeEditor()
      return
    }
    if (wasDashboardTheme) await dashboardStore.setDashboardTheme(nextId)
    startEditing(nextId)
    Notify.create({ type: 'positive', message: `Deleted theme "${theme.name}"`, timeout: 3000 })
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: `Delete failed: ${error?.message || 'the theme is built in'}`,
      timeout: 5000
    })
  } finally {
    showConfirmation.value = false
  }
}

function onConfirmationAccepted() {
  confirmation.value?.onConfirm()
}

// The exit-edit-mode guard in EditModeButton needs to know whether there is
// anything to lose, and needs to be able to save it or throw it away itself.
defineExpose({
  hasUnsavedChanges: isDirty,
  requestClose: onRequestClose,
  saveDraft: () => runAction(saveDraft),
  discardAndClose
})
</script>

<style scoped>
/* The header is a QItem rendered by QExpansionItem, so the scope id only
   reaches it through its ancestor: `header-class` + `:deep` is what matches. A
   translucent tint of the theme's own text colour lifts the row off the dialog
   card whether the theme being edited is light or dark, and stays put when the
   section is collapsed. */
:deep(.section-header) {
  background-color: color-mix(in srgb, var(--sm-app-text, currentColor) 12%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--sm-app-text, currentColor) 20%, transparent);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.editor-toolbar__select {
  flex: 1;
  min-width: 0;
}

.editor-import {
  display: none;
}

.field-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.field-row__label {
  width: 40%;
  min-width: 0;
  font-size: 0.85rem;
  padding-top: 6px;
}

.field-row__path {
  font-size: 0.7rem;
  color: color-mix(in srgb, currentColor 65%, transparent);
  font-family: monospace;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.field-row__control {
  flex: 1;
  min-width: 0;
}
</style>
