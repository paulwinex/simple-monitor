<template>
  <div
    ref="containerEl"
    :class="['floating-menu-container', { 'floating-menu-container--light': !isDark }]"
  >
    <q-btn
      ref="buttonRef"
      dense
      flat
      round
      size="sm"
      icon="edit"
      color="grey-7"
      @click="handlePencilClick"
      class="floating-menu-btn"
      :class="{ 'floating-menu-btn--hidden': !isFloatingMenuVisible }"
      title="Edit Mode"
    />

    <!-- Draggable Edit Mode Toolbar -->
    <DraggableToolbar
      v-model="showPanel"
      state-key="edit-mode-panel"
      position="top-right"
      spawn="right"
      :width="56"
      @move="onPanelMove"
    >
      <div class="column items-center q-gutter-y-xs q-my-xs">
        <q-btn
          round
          dense
          flat
          icon="close"
          @click="confirmCancelEditMode"
        >
          <q-tooltip :anchor="tooltipAnchor" :self="tooltipSelf">
            Discard and Exit
          </q-tooltip>
        </q-btn>
        <q-btn
          round
          dense
          flat
          icon="save"
          @click="handleSaveDashboard"
        >
          <q-tooltip :anchor="tooltipAnchor" :self="tooltipSelf">
            Quick Save
          </q-tooltip>
        </q-btn>
        <q-btn
          round
          dense
          flat
          icon="folder_open"
          @click="handleOpenManager"
        >
          <q-tooltip :anchor="tooltipAnchor" :self="tooltipSelf">
            Open Dashboard
          </q-tooltip>
        </q-btn>
        <q-btn
          round
          dense
          flat
          icon="dashboard"
          @click="handleDashboardSettings"
        >
          <q-tooltip :anchor="tooltipAnchor" :self="tooltipSelf">
            Dashboard Settings
          </q-tooltip>
        </q-btn>
        <q-btn
          round
          dense
          flat
          icon="palette"
          @click="openThemeEditor"
        >
          <q-tooltip :anchor="tooltipAnchor" :self="tooltipSelf">
            Theme Editor
          </q-tooltip>
        </q-btn>
        <q-btn
          round
          dense
          flat
          icon="add"
          @click="handleAddWidget"
        >
          <q-tooltip :anchor="tooltipAnchor" :self="tooltipSelf">
            Add Widget
          </q-tooltip>
        </q-btn>

      </div>
    </DraggableToolbar>

    <!-- Dashboard Settings Dialog -->
    <DashboardSettingsDialog v-model="showDashboardSettings" @edit-theme="openThemeEditor" />

    <!-- Theme Editor -->
    <ThemeEditorDialog ref="themeEditorRef" v-model="showThemeEditor" :theme-id="themeEditorId" />

    <!-- Dashboard Manager Dialog -->
    <DashboardManagerDialog
      ref="dashboardManagerRef"
      v-model="showOpenManager"
      @select="handleManagerSwitch"
      @create="handleManagerCreate"
      @delete="handleManagerDelete"
    />

    <!-- Discard / Save & Exit Confirmation -->
    <q-dialog v-model="showExitConfirm" persistent>
      <q-card
        class="q-dialog-plugin"
        :class="{ 'q-dialog-plugin--dark q-dark': isDark }"
      >
        <q-card-section class="q-dialog__title">{{ exitTitle }}</q-card-section>
        <q-card-section class="q-dialog__message">
          {{ exitMessage }}
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Keep Editing" color="primary" @click="showExitConfirm = false" />
          <q-btn flat :label="saveActionLabel" color="positive" @click="handleSaveAction" />
          <q-btn flat :label="discardActionLabel" color="negative" @click="handleDiscardAction" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQuasar, Notify } from 'quasar'
import { useUIStore } from 'stores/ui'
import { useDashboardStore } from 'stores/dashboard'
import { useThemeStore } from 'stores/theme'
import { useWidgetWindowsStore } from 'stores/widgetWindows'
import {
  createDashboard as createDashboardApi,
  deleteDashboard as deleteDashboardApi,
  getDashboardMeta as getDashboardMetaApi
} from 'src/services/api'
import DashboardSettingsDialog from './DashboardSettingsDialog.vue'
import ThemeEditorDialog from 'components/theme-editor/ThemeEditorDialog.vue'
import DashboardManagerDialog from './DashboardManagerDialog.vue'
import DraggableToolbar from './DraggableToolbar.vue'

const FLOATING_MENU_PROXIMITY = 200

const $q = useQuasar()
const uiStore = useUIStore()
const dashboardStore = useDashboardStore()
const themeStore = useThemeStore()
const widgetWindows = useWidgetWindowsStore()

const containerEl = ref(null)
const buttonRef = ref(null)
const isFloatingMenuVisible = ref(false)
const showPanel = ref(false)
const showDashboardSettings = ref(false)
const showThemeEditor = ref(false)
// Empty id means "whatever the dashboard is using right now".
const themeEditorId = ref('')

function openThemeEditor(themeId) {
  // Вызывается и из @click (там приходит PointerEvent), и из @edit-theme
  // ThemeSelect (там строка id), поэтому тип проверяется явно.
  const requestedId = typeof themeId === 'string' ? themeId : ''
  themeEditorId.value = requestedId || dashboardStore.currentOptions?.theme || themeStore.currentThemeId
  showThemeEditor.value = true
}
const showOpenManager = ref(false)
const dashboardManagerRef = ref(null)
const themeEditorRef = ref(null)
const showExitConfirm = ref(false)
// Which action the exit-confirm dialog drives:
// 'exit' | 'switch' | 'delete-current' | 'theme'
const exitConfirmMode = ref('exit')
const pendingSwitch = ref(null)
const pendingDelete = ref(null)

// Tooltips open to the side opposite the screen edge the panel sits at:
// panel on the right half -> tooltips open to the left, and vice versa.
const tooltipSide = ref('left')
const tooltipAnchor = computed(() => `center ${tooltipSide.value}`)
const tooltipSelf = computed(() => `center ${tooltipSide.value === 'left' ? 'right' : 'left'}`)

let rafId = null
let lastCursorX = 0
let lastCursorY = 0

const isEditMode = computed(() => uiStore.isEditMode)
const isDark = computed(() => $q.dark.mode === true || $q.dark.mode === 'true')

const exitTitle = computed(() => {
  if (exitConfirmMode.value === 'delete-current') return 'Delete Dashboard?'
  if (exitConfirmMode.value === 'theme') return 'Unsaved Theme Changes?'
  return 'Discard Changes?'
})
const exitMessage = computed(() => {
  if (exitConfirmMode.value === 'delete-current') {
    return 'You have unsaved changes on this dashboard. How do you want to proceed?'
  }
  if (exitConfirmMode.value === 'theme') {
    return 'The theme being edited has unsaved changes. How do you want to proceed?'
  }
  return 'You have unsaved changes. How do you want to proceed?'
})
const saveActionLabel = computed(() => {
  if (exitConfirmMode.value === 'switch') return 'Save and Switch'
  if (exitConfirmMode.value === 'delete-current') return 'Save and Delete'
  if (exitConfirmMode.value === 'theme') return 'Save Theme and Exit'
  return 'Save and Exit'
})
const discardActionLabel = computed(() => {
  if (exitConfirmMode.value === 'switch') return 'Discard and Switch'
  if (exitConfirmMode.value === 'delete-current') return 'Discard and Delete'
  if (exitConfirmMode.value === 'theme') return 'Discard and Exit'
  return 'Discard'
})

function distanceFromPointToRect(px, py, rect) {
  const dx = Math.max(rect.left - px, 0, px - rect.right)
  const dy = Math.max(rect.top - py, 0, py - rect.bottom)
  return Math.hypot(dx, dy)
}

function evaluateVisibility() {
  rafId = null

  const el = buttonRef.value?.$el || buttonRef.value
  if (!el) return

  const rect = el.getBoundingClientRect()
  const distance = distanceFromPointToRect(lastCursorX, lastCursorY, rect)
  isFloatingMenuVisible.value = distance <= FLOATING_MENU_PROXIMITY
}

function scheduleEvaluation() {
  if (rafId !== null) return
  rafId = requestAnimationFrame(evaluateVisibility)
}

function handleMouseMove(event) {
  lastCursorX = event.clientX
  lastCursorY = event.clientY
  scheduleEvaluation()
}

function handleResize() {
  scheduleEvaluation()
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('resize', handleResize)
  evaluateVisibility()
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('resize', handleResize)
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
})

// Keep the panel in sync with edit mode regardless of how it was entered/exited.
watch(isEditMode, (editing) => {
  showPanel.value = editing
  if (!editing) {
    // Same as the widget dialogs: they must not stay open in view mode
    showDashboardSettings.value = false
    // The editor answers for itself: its own guard asks about the draft when
    // there is one, and closes straight away when there is not.
    themeEditorRef.value?.requestClose()
    evaluateVisibility()
  }
}, { flush: 'post' })

function onPanelMove({ x, width }) {
  const half = window.innerWidth / 2
  tooltipSide.value = (x + width / 2) < half ? 'right' : 'left'
}

function handlePencilClick() {
  if (isEditMode.value) {
    confirmCancelEditMode()
  } else {
    uiStore.enterEditMode()
  }
}

// Confirm before canceling edit mode (discard changes)
// Only show dialog if there are actual changes
function confirmCancelEditMode() {
  if (themeEditorRef.value?.hasUnsavedChanges) {
    // The theme is asked about first: it is the thing at risk, and the
    // dashboard's own question comes after this one is answered.
    exitConfirmMode.value = 'theme'
    showExitConfirm.value = true
    return
  }
  proceedExitEditMode()
}

function proceedExitEditMode() {
  if (!uiStore.hasDashboardChanges()) {
    // No changes - just exit edit mode without reloading from the DB
    uiStore.exitEditMode()
    return
  }

  exitConfirmMode.value = 'exit'
  showExitConfirm.value = true
}

async function saveThemeAndExitEditMode() {
  showExitConfirm.value = false
  // A failed save leaves the editor on screen with the changes still in it.
  if (!(await themeEditorRef.value?.saveDraft())) return
  proceedExitEditMode()
}

function discardThemeAndExitEditMode() {
  showExitConfirm.value = false
  themeEditorRef.value?.discardAndClose()
  proceedExitEditMode()
}

async function saveAndExitEditMode() {
  showExitConfirm.value = false
  try {
    await uiStore.saveDashboard()
    uiStore.exitEditMode()
  } catch (err) {
    // Save failed (Notify already shown by the store) - stay in edit mode
  }
}

async function discardAndExit() {
  showExitConfirm.value = false
  // Cancel edit mode and reload the dashboard from the DB
  await uiStore.cancelEditMode()
}

function handleSaveAction() {
  if (exitConfirmMode.value === 'switch') return saveAndSwitch()
  if (exitConfirmMode.value === 'delete-current') return saveAndDeleteCurrent()
  if (exitConfirmMode.value === 'theme') return saveThemeAndExitEditMode()
  return saveAndExitEditMode()
}

function handleDiscardAction() {
  if (exitConfirmMode.value === 'switch') return discardAndSwitch()
  if (exitConfirmMode.value === 'delete-current') return discardAndDeleteCurrent()
  if (exitConfirmMode.value === 'theme') return discardThemeAndExitEditMode()
  return discardAndExit()
}

function handleOpenManager() {
  showOpenManager.value = true
}

async function handleManagerSwitch(dashboard) {
  showOpenManager.value = false
  if (!dashboard || dashboard.id === dashboardStore.currentDashboardId) return

  if (!uiStore.hasDashboardChanges()) {
    await dashboardStore.loadDashboard(dashboard.id)
    uiStore.exitEditMode()
    return
  }

  pendingSwitch.value = dashboard
  exitConfirmMode.value = 'switch'
  showExitConfirm.value = true
}

async function saveAndSwitch() {
  showExitConfirm.value = false
  const target = pendingSwitch.value
  pendingSwitch.value = null
  try {
    await uiStore.saveDashboard()
    await switchToDashboard(target)
  } catch (err) {
    // Save failed (Notify already shown by the store) - stay on current dashboard
  }
}

async function discardAndSwitch() {
  showExitConfirm.value = false
  const target = pendingSwitch.value
  pendingSwitch.value = null
  await uiStore.cancelEditMode()
  await switchToDashboard(target)
}

async function switchToDashboard(target) {
  if (target) {
    await dashboardStore.loadDashboard(target.id)
  }
  uiStore.exitEditMode()
}

async function handleManagerCreate(name) {
  showOpenManager.value = false
  try {
    const response = await createDashboardApi(name, { theme: themeStore.currentThemeId })
    const created = response.dashboard
    const target = { id: created.id, name: created.name }

    if (!uiStore.hasDashboardChanges()) {
      await dashboardStore.loadDashboard(target.id)
      uiStore.exitEditMode()
      return
    }

    pendingSwitch.value = target
    exitConfirmMode.value = 'switch'
    showExitConfirm.value = true
  } catch (err) {
    console.error('Failed to create dashboard:', err)
    Notify.create({
      message: 'Failed to create dashboard',
      position: 'bottom',
      type: 'negative',
      timeout: 3000
    })
  }
}

async function handleManagerDelete(dashboard) {
  const isCurrent = dashboard.id === dashboardStore.currentDashboardId

  if (isCurrent && uiStore.hasDashboardChanges()) {
    pendingDelete.value = dashboard
    exitConfirmMode.value = 'delete-current'
    showExitConfirm.value = true
    return
  }

  await performDelete({ id: dashboard.id, isCurrent })
}

async function saveAndDeleteCurrent() {
  showExitConfirm.value = false
  const target = pendingDelete.value
  pendingDelete.value = null
  try {
    await uiStore.saveDashboard()
    await performDelete({ id: target.id, isCurrent: true })
  } catch (err) {
    // Save failed - stay on current dashboard
  }
}

async function discardAndDeleteCurrent() {
  showExitConfirm.value = false
  const target = pendingDelete.value
  pendingDelete.value = null
  await uiStore.cancelEditMode()
  await performDelete({ id: target.id, isCurrent: true })
}

async function performDelete({ id, isCurrent }) {
  try {
    await deleteDashboardApi(id)

    if (isCurrent) {
      showOpenManager.value = false
      const meta = await getDashboardMetaApi()
      const remaining = meta.filter((d) => d.id !== id)
      if (remaining.length > 0) {
        await dashboardStore.loadDashboard(remaining[0].id)
        uiStore.exitEditMode()
      } else {
        const response = await createDashboardApi('My Dashboard', { theme: themeStore.currentThemeId })
        await dashboardStore.loadDashboard(response.dashboard.id)
        uiStore.exitEditMode()
      }
    }

    dashboardManagerRef.value?.refresh()
  } catch (err) {
    console.error('Failed to delete dashboard:', err)
    Notify.create({
      message: 'Failed to delete dashboard',
      position: 'bottom',
      type: 'negative',
      timeout: 3000
    })
  }
}

function handleAddWidget() {
  widgetWindows.openCreate('root')
}

function handleSaveDashboard() {
  uiStore.saveDashboard()
}

function handleDashboardSettings() {
  showDashboardSettings.value = true
}
</script>

<style scoped>
/* Floating Menu Container */
.floating-menu-container {
  position: fixed;
  top: 5px;
  right: 5px;
  z-index: 1000;
}

/* Chrome-owned, not dashboard-owned: the panel follows light/dark chrome so it
   stays legible whichever theme the dashboard itself uses. */
.floating-menu-btn {
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  color: #212121 !important;
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.floating-menu-btn--hidden {
  opacity: 0;
  pointer-events: none;
  transform: scale(0.6) translateY(-4px);
}

.floating-menu-btn:hover {
  background: #ffffff;
}

.floating-menu-container--light .floating-menu-btn {
  background: rgba(33, 33, 33, 0.75);
  color: #ffffff !important;
}

.floating-menu-container--light .floating-menu-btn:hover {
  background: rgba(33, 33, 33, 0.9);
}

/* Dark chrome: a light panel reads better than a dark one over dark widgets. */
:global(body.q-dark) .floating-menu-btn {
  background: rgba(255, 255, 255, 0.92);
  color: #212121 !important;
}

:global(body.q-dark) .floating-menu-container--light .floating-menu-btn {
  background: rgba(33, 33, 33, 0.8);
  color: #ffffff !important;
}
</style>
