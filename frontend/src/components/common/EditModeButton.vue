<template>
  <div
    ref="containerEl"
    :class="['floating-menu-container', { 'floating-menu-container--light': !isDark }]"
  >
    <q-btn
      v-if="!isEditMode"
      ref="buttonRef"
      dense
      flat
      round
      size="sm"
      icon="edit"
      color="grey-7"
      @click="toggleEditMode"
      class="floating-menu-btn"
      :class="{ 'floating-menu-btn--hidden': !isFloatingMenuVisible }"
      title="Edit Mode"
    />

    <!-- Edit Mode Menu -->
    <div v-else class="edit-mode-menu">
      <q-btn
        round
        dense
        flat
        icon="add"
        @click="handleAddWidget"
        title="Add Widget"
      />
      <q-btn
        round
        dense
        flat
        icon="save"
        @click="handleSaveDashboard"
        title="Save Dashboard"
      />
      <q-btn
        round
        dense
        flat
        icon="logout"
        @click="toggleEditMode"
        title="Save and Exit Edit Mode"
      />
      <q-btn
        round
        dense
        flat
        icon="edit"
        @click="handleDashboardSettings"
        title="Dashboard Settings"
      />
      <q-btn
        round
        dense
        flat
        icon="close"
        @click="confirmCancelEditMode"
        title="Discard Changes and Exit"
      />
    </div>

    <!-- Add Widget Dialog -->
    <AddWidgetDialog
      v-model="showAddWidget"
      parent-type="root"
    />

    <!-- Dashboard Settings Dialog -->
    <DashboardSettingsDialog v-model="showDashboardSettings" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useUIStore } from 'stores/ui'
import AddWidgetDialog from 'components/widgets/AddWidgetDialog.vue'
import DashboardSettingsDialog from './DashboardSettingsDialog.vue'

const FLOATING_MENU_PROXIMITY = 200

const $q = useQuasar()
const uiStore = useUIStore()

const containerEl = ref(null)
const buttonRef = ref(null)
const isFloatingMenuVisible = ref(false)
const showAddWidget = ref(false)
const showDashboardSettings = ref(false)

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
  if (isEditMode.value) return

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
  if (isEditMode.value) return
  scheduleEvaluation()
}

function handleResize() {
  if (isEditMode.value) return
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

// When exiting edit mode the button reappears - re-evaluate proximity
watch(isEditMode, (editing) => {
  if (!editing) {
    evaluateVisibility()
  }
}, { flush: 'post' })

function toggleEditMode() {
  uiStore.toggleEditMode()
}

// Confirm before canceling edit mode (discard changes)
// Only show dialog if there are actual changes
function confirmCancelEditMode() {
  if (!uiStore.hasDashboardChanges()) {
    // No changes - just exit without confirmation
    uiStore.cancelEditMode()
    return
  }

  $q.dialog({
    title: 'Discard Changes?',
    message: 'You have unsaved changes. Are you sure you want to discard them and reload the last saved dashboard?',
    cancel: {
      label: 'Keep Editing',
      color: 'primary',
      flat: true
    },
    ok: {
      label: 'Discard',
      color: 'negative',
      flat: true
    },
    persistent: true
  }).onOk(async () => {
    // User confirmed - cancel edit mode and reload from server
    await uiStore.cancelEditMode()
  })
}

function handleAddWidget() {
  showAddWidget.value = true
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

/* Edit Mode Menu */
.edit-mode-menu {
  display: flex;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px;
  border-radius: 50px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.edit-mode-menu .q-btn {
  background: rgba(255, 255, 255, 0.2);
}

.edit-mode-menu .q-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Light theme support - keep dark background */
.floating-menu-container--light .floating-menu-btn {
  background: rgba(0, 0, 0, 0.3);
}

.floating-menu-container--light .floating-menu-btn:hover {
  background: rgba(0, 0, 0, 0.4);
}

.floating-menu-container--light .edit-mode-menu {
  background: rgba(0, 0, 0, 0.3);
}

.floating-menu-container--light .edit-mode-menu .q-btn {
  background: rgba(255, 255, 255, 0.2);
}

.floating-menu-container--light .edit-mode-menu .q-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>