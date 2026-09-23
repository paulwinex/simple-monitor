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
          color="negative"
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
    <DashboardSettingsDialog v-model="showDashboardSettings" />

    <!-- Discard / Save & Exit Confirmation -->
    <q-dialog v-model="showExitConfirm" persistent>
      <q-card
        class="q-dialog-plugin"
        :class="{ 'q-dialog-plugin--dark q-dark': isDark }"
      >
        <q-card-section class="q-dialog__title">Discard Changes?</q-card-section>
        <q-card-section class="q-dialog__message">
          You have unsaved changes. How do you want to proceed?
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Keep Editing" color="primary" @click="showExitConfirm = false" />
          <q-btn flat label="Save and Exit" color="positive" @click="saveAndExitEditMode" />
          <q-btn flat label="Discard" color="negative" @click="discardAndExit" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useUIStore } from 'stores/ui'
import { useWidgetWindowsStore } from 'stores/widgetWindows'
import DashboardSettingsDialog from './DashboardSettingsDialog.vue'
import DraggableToolbar from './DraggableToolbar.vue'

const FLOATING_MENU_PROXIMITY = 200

const $q = useQuasar()
const uiStore = useUIStore()
const widgetWindows = useWidgetWindowsStore()

const containerEl = ref(null)
const buttonRef = ref(null)
const isFloatingMenuVisible = ref(false)
const showPanel = ref(false)
const showDashboardSettings = ref(false)
const showExitConfirm = ref(false)

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
  if (!uiStore.hasDashboardChanges()) {
    // No changes - just exit edit mode without reloading from the DB
    uiStore.exitEditMode()
    return
  }

  showExitConfirm.value = true
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

.floating-menu-btn {
  background: rgba(41, 41, 41, 0.5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  color: #434343 !important;
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.floating-menu-btn--hidden {
  opacity: 0;
  pointer-events: none;
  transform: scale(0.6) translateY(-4px);
}

.floating-menu-btn:hover {
  background: rgba(128, 128, 128, 0.7);
}

/* Light theme support - keep dark background */
.floating-menu-container--light .floating-menu-btn {
  background: rgba(0, 0, 0, 0.3);
}

.floating-menu-container--light .floating-menu-btn:hover {
  background: rgba(0, 0, 0, 0.4);
}
</style>