<template>
  <Teleport to="body">
    <Transition
      :enter-active-class="`drg-slide-${spawn}-enter-active`"
      :enter-from-class="`drg-slide-${spawn}-enter-from`"
      :enter-to-class="`drg-slide-${spawn}-enter-to`"
      :leave-active-class="`drg-slide-${spawn}-leave-active`"
      :leave-from-class="`drg-slide-${spawn}-leave-from`"
      :leave-to-class="`drg-slide-${spawn}-leave-to`"
    >
      <div
        v-if="modelValue"
        ref="panelEl"
        class="draggable-toolbar"
        :class="{ 'draggable-toolbar--active': dragging }"
        :style="toolbarStyle"
      >
        <div class="draggable-toolbar-header" v-touch-pan.prevent.mouse="onDragPan"></div>
        <div class="draggable-toolbar-body">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, reactive, ref, watch, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'

// Persisted position per logical toolbar (in-memory, like DraggableDialog).
const savedStates = new Map()
let toolbarUid = 0

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // Stable key used to remember the last position across opens/instances.
  stateKey: { type: String, default: '' },
  // Initial placement before the first drag: corner preset or { x, y } (px).
  position: { type: [Object, String], default: 'top-right' },
  // Direction the panel slides in from: 'right' | 'left'.
  spawn: { type: String, default: 'right' },
  // Fixed toolbar width; height follows the content.
  width: { type: Number, default: 56 }
})

const emit = defineEmits(['update:modelValue', 'move'])

const MARGIN = 8
const $q = useQuasar()
const stateId = props.stateKey || `draggable-toolbar-${++toolbarUid}`
const panelEl = ref(null)
const pos = reactive({ x: 0, y: 0 })
const dragging = ref(false)

const isDark = computed(() => $q.dark.mode === true || $q.dark.mode === 'true')

const toolbarStyle = computed(() => ({
  position: 'fixed',
  left: pos.x + 'px',
  top: pos.y + 'px',
  width: props.width + 'px',
  background: isDark.value ? '#1d1d1d' : '#ffffff',
  color: isDark.value ? '#ffffff' : '#424242'
}))

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function panelSize() {
  const el = panelEl.value
  return {
    width: props.width,
    height: el ? el.offsetHeight : props.width
  }
}

function notifyMove() {
  const { width, height } = panelSize()
  emit('move', { x: pos.x, y: pos.y, width, height })
}

function resetPos() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const { width, height } = panelSize()
  const p = props.position
  let x
  let y

  if (p && typeof p === 'object') {
    x = p.x
    y = p.y
  } else if (p === 'top-left') { x = MARGIN; y = MARGIN }
  else if (p === 'top-right') { x = vw - width - MARGIN; y = MARGIN }
  else if (p === 'bottom-left') { x = MARGIN; y = vh - height - MARGIN }
  else if (p === 'bottom-right') { x = vw - width - MARGIN; y = vh - height - MARGIN }
  else { x = (vw - width) / 2; y = (vh - height) / 2 }

  pos.x = clamp(x, 0, Math.max(0, vw - width))
  pos.y = clamp(y, 0, Math.max(0, vh - height))
}

function restorePos() {
  const saved = savedStates.get(stateId)
  const vw = window.innerWidth
  const vh = window.innerHeight
  const { width, height } = panelSize()

  if (saved !== undefined) {
    pos.x = clamp(saved.x, 0, Math.max(0, vw - width))
    pos.y = clamp(saved.y, 0, Math.max(0, vh - height))
  } else {
    resetPos()
  }
  notifyMove()
}

function savePos() {
  savedStates.set(stateId, { x: pos.x, y: pos.y })
}

// Panel is rendered in the DOM (height measurable) once the DOM has updated.
watch(() => props.modelValue, (open) => {
  if (open) {
    restorePos()
  } else {
    savePos()
  }
}, { flush: 'post' })

onUnmounted(savePos)

function onDragPan({ isFirst, isFinal, delta }) {
  if (isFirst) {
    dragging.value = true
    return
  }
  if (isFinal) {
    dragging.value = false
    return
  }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const { width, height } = panelSize()
  pos.x = clamp(pos.x + delta.x, 0, Math.max(0, vw - width))
  pos.y = clamp(pos.y + delta.y, 0, Math.max(0, vh - height))
  notifyMove()
}

resetPos()
</script>

<style scoped>
.draggable-toolbar {
  position: fixed;
  z-index: 2500;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.draggable-toolbar--active {
  user-select: none;
  -webkit-user-select: none;
}

.draggable-toolbar-header {
  position: relative;
  height: 22px;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  border-bottom: 1px solid rgba(128, 128, 128, 0.18);
}

.draggable-toolbar-header::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 4px;
  background: radial-gradient(circle, currentColor 1px, transparent 1px) center / 5px 4px repeat-x;
  opacity: 0.35;
  pointer-events: none;
}

.draggable-toolbar--active .draggable-toolbar-header {
  cursor: grabbing;
}

.draggable-toolbar-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 6px;
}

/* Slide-in/out transitions */
.drg-slide-right-enter-from,
.drg-slide-right-leave-to,
.drg-slide-left-enter-from,
.drg-slide-left-leave-to {
  opacity: 0;
}

.drg-slide-right-enter-from,
.drg-slide-right-leave-to {
  transform: translateX(60px);
}

.drg-slide-left-enter-from,
.drg-slide-left-leave-to {
  transform: translateX(-60px);
}

.drg-slide-right-enter-active,
.drg-slide-right-leave-active,
.drg-slide-left-enter-active,
.drg-slide-left-leave-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
}
</style>