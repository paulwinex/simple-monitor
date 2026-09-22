<template>
  <q-dialog
    ref="dialogRef"
    v-model="model"
    no-esc-dismiss
    :seamless="seamless"
    :persistent="persistent"
    transition-show="scale"
    transition-hide="scale"
    @before-show="onDialogBeforeShow"
    @hide="onDialogHide"
  >
    <q-card
      class="draggable-dialog-card"
      :class="{ 'draggable-dialog-card--active': dragging || resizing }"
      :style="cardStyle"
    >
      <q-card-section
        class="draggable-dialog-header row items-center no-wrap q-pb-none"
        v-touch-pan.prevent.mouse="onDragPan"
      >
        <div class="text-h6 ellipsis">{{ title }}</div>
        <q-space />
        <slot name="tools">
          <q-btn
            flat
            round
            dense
            icon="close"
            :aria-label="`Close ${title || 'dialog'}`"
            @click="requestClose"
          />
        </slot>
      </q-card-section>

      <q-card-section class="draggable-dialog-body col q-pt-none">
        <slot />
      </q-card-section>

      <slot name="actions" />

      <div
        class="draggable-dialog-resize-handle"
        v-touch-pan.prevent.mouse="onResizePan"
        @mousedown.stop
      ></div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, reactive, ref, onUnmounted } from 'vue'

// Registry of currently open dialogs so ESC only closes the topmost one.
const activeDialogs = []
// Persisted window state (position/size) per logical dialog.
const savedStates = new Map()
let dialogUid = 0

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  // Stable key used to remember the last position/size of this dialog
  // across opens (and even across component instances).
  stateKey: { type: String, default: '' },
  // Floating-window mode: no dimming backdrop, page stays clickable,
  // several dialogs can be open at once.
  seamless: { type: Boolean, default: true },
  // Starting size. Number = px, String = any CSS length ('40%', '60vw', '320px').
  width: { type: [Number, String], default: 560 },
  height: { type: [Number, String], default: 400 },
  minWidth: { type: Number, default: 240 },
  minHeight: { type: Number, default: 160 },
  maxWidth: { type: Number, default: null },
  maxHeight: { type: Number, default: null },
  // Starting position: null (center), a corner preset string,
  // or { x, y } coordinates (px).
  position: { type: [Object, String], default: null },
  persistent: { type: Boolean, default: false },
  // Async hook: return false to veto the close request (ESC, X button).
  beforeClose: { type: Function, default: null }
})

const emit = defineEmits(['update:modelValue'])

const selfId = ++dialogUid
const stateId = props.stateKey || `draggable-dialog-${selfId}`

const model = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const size = reactive({ width: 560, height: 400 })
const pos = reactive({ x: 0, y: 0 })
const dragging = ref(false)
const resizing = ref(false)

const cardStyle = computed(() => ({
  position: 'fixed',
  left: pos.x + 'px',
  top: pos.y + 'px',
  width: size.width + 'px',
  height: size.height + 'px',
  maxWidth: 'none',
  maxHeight: 'none',
  margin: '0',
  display: 'flex',
  flexDirection: 'column'
}))

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function resolveLength(value, viewportLength, fallback) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const v = value.trim()
    if (v.endsWith('%')) return (parseFloat(v) / 100) * viewportLength
    if (v.endsWith('vw')) return (parseFloat(v) / 100) * window.innerWidth
    if (v.endsWith('vh')) return (parseFloat(v) / 100) * window.innerHeight
    const n = parseFloat(v)
    if (!isNaN(n)) return n
  }
  return fallback
}

function resetWindow() {
  const vw = window.innerWidth
  const vh = window.innerHeight

  const maxW = props.maxWidth == null ? vw : Math.min(props.maxWidth, vw)
  const maxH = props.maxHeight == null ? vh : Math.min(props.maxHeight, vh)

  size.width = clamp(resolveLength(props.width, vw, 560), props.minWidth, maxW)
  size.height = clamp(resolveLength(props.height, vh, 400), props.minHeight, maxH)

  const w = size.width
  const h = size.height
  const p = props.position
  let x
  let y

  if (p && typeof p === 'object') {
    x = p.x
    y = p.y
  } else if (p === 'top-left') { x = 0; y = 0 }
  else if (p === 'top-right') { x = vw - w; y = 0 }
  else if (p === 'bottom-left') { x = 0; y = vh - h }
  else if (p === 'bottom-right') { x = vw - w; y = vh - h }
  else { x = (vw - w) / 2; y = (vh - h) / 2 }

  pos.x = clamp(x, 0, Math.max(0, vw - w))
  pos.y = clamp(y, 0, Math.max(0, vh - h))
}

function restoreWindow() {
  const saved = savedStates.get(stateId)
  if (saved !== undefined) {
    size.width = saved.width
    size.height = saved.height
    pos.x = clamp(saved.x, 0, Math.max(0, window.innerWidth - size.width))
    pos.y = clamp(saved.y, 0, Math.max(0, window.innerHeight - size.height))
  } else {
    resetWindow()
  }
}

function saveWindow() {
  savedStates.set(stateId, {
    x: pos.x,
    y: pos.y,
    width: size.width,
    height: size.height
  })
}

function requestClose() {
  const hook = props.beforeClose
  if (typeof hook === 'function') {
    Promise.resolve(hook()).then((allowClose) => {
      if (allowClose !== false) model.value = false
    })
  } else {
    model.value = false
  }
}

function onKeydown(event) {
  if (event.key !== 'Escape') return
  if (activeDialogs[activeDialogs.length - 1] !== selfId) return
  event.preventDefault()
  requestClose()
}

function onDialogBeforeShow() {
  restoreWindow()
  activeDialogs.push(selfId)
  window.addEventListener('keydown', onKeydown)
}

function onDialogHide() {
  saveWindow()
  const index = activeDialogs.indexOf(selfId)
  if (index !== -1) activeDialogs.splice(index, 1)
  window.removeEventListener('keydown', onKeydown)
}

onUnmounted(() => {
  saveWindow()
  const index = activeDialogs.indexOf(selfId)
  if (index !== -1) activeDialogs.splice(index, 1)
  window.removeEventListener('keydown', onKeydown)
})

function onDragPan({ isFirst, isFinal, delta }) {
  if (isFirst) {
    dragging.value = true
    return
  }
  if (isFinal) {
    dragging.value = false
    return
  }
  pos.x = clamp(pos.x + delta.x, 0, Math.max(0, window.innerWidth - size.width))
  pos.y = clamp(pos.y + delta.y, 0, Math.max(0, window.innerHeight - size.height))
}

function onResizePan({ isFirst, isFinal, delta }) {
  if (isFirst) {
    resizing.value = true
    return
  }
  if (isFinal) {
    resizing.value = false
    return
  }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxW = props.maxWidth == null ? vw : Math.min(props.maxWidth, vw)
  const maxH = props.maxHeight == null ? vh : Math.min(props.maxHeight, vh)
  size.width = clamp(size.width + delta.x, props.minWidth, maxW)
  size.height = clamp(size.height + delta.y, props.minHeight, maxH)
}
</script>

<style scoped>
.draggable-dialog-card--active {
  user-select: none;
  -webkit-user-select: none;
}

.draggable-dialog-header {
  flex: 0 0 auto;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  min-height: 48px;
}

.draggable-dialog-card--active .draggable-dialog-header {
  cursor: grabbing;
}

.draggable-dialog-body {
  flex: 1 1 auto;
  overflow: auto;
  min-height: 0;
}

.draggable-dialog-resize-handle {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 18px;
  height: 18px;
  z-index: 3;
  cursor: nwse-resize;
  touch-action: none;
}

.draggable-dialog-resize-handle::after {
  content: '';
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 9px;
  height: 9px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  border-bottom-right-radius: 2px;
  opacity: 0.55;
}
</style>