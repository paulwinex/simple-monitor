<template>
  <div class="gradient-editor">
    <!-- Mode toggle -->
    <div class="gradient-editor__header">
      <span class="gradient-editor__label">{{ label }}</span>
      <q-toggle
        :model-value="localAutoDistribute"
        label="Auto distribute"
        dense
        @update:model-value="onModeChange"
      />
    </div>

    <!-- Gradient preview bar -->
    <div
      ref="barRef"
      class="gradient-editor__bar"
      @click="onBarClick"
    >
      <div
        class="gradient-editor__gradient"
        :style="{ background: gradientBackground }"
      />
      
      <!-- Color markers -->
      <div
        v-for="(stop, index) in sortedStops"
        :key="stop.id"
        :data-stop-id="stop.id"
        class="gradient-editor__marker"
        :class="{ 'gradient-editor__marker--active': activeMarkerId === stop.id }"
        :style="{ left: `${stop.position * 100}%` }"
        @mousedown="onMarkerMouseDown($event, stop.id)"
        @contextmenu.prevent="onMarkerContextMenu($event, stop.id)"
      >
        <div
          class="gradient-editor__marker-color"
          :style="{ backgroundColor: stop.color }"
          title="Drag to move"
        />
      </div>
    </div>

    <!-- Color picker for active marker -->
    <div v-if="activeMarkerId" class="gradient-editor__controls">
      <div class="gradient-editor__color-row">
        <q-input
          v-model="activeColor"
          label="Color"
          dense
          outlined
          readonly
          class="gradient-editor__color-input"
        />
      </div>
      <div class="gradient-editor__hint">
        <span>Drag: move</span>
        <span>Middle-click: remove</span>
        <span>Console: see selected marker</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [
      { color: '#2ecc71', position: 0 },
      { color: '#f1c40f', position: 0.5 },
      { color: '#e74c3c', position: 1 }
    ]
  },
  label: {
    type: String,
    default: 'Gradient Colors'
  },
  autoDistribute: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:model-value', 'update:auto-distribute'])

const barRef = ref(null)
const activeMarkerId = ref(null)
const activeColor = ref('')
const dragStartX = ref(0)
const dragStartPosition = ref(0)

// Local computed for autoDistribute with getter/setter
const localAutoDistribute = computed({
  get: () => props.autoDistribute,
  set: (value) => emit('update:auto-distribute', value)
})

// Internal stops with unique IDs
const stops = ref([])

// Initialize stops with IDs
const initStops = () => {
  stops.value = props.modelValue.map((stop, index) => ({
    ...stop,
    id: `stop-${index}-${Date.now()}`
  }))
}

watch(() => props.modelValue, initStops, { deep: true })
initStops()

const sortedStops = computed(() => {
  return [...stops.value].sort((a, b) => a.position - b.position)
})

const gradientBackground = computed(() => {
  if (stops.value.length === 0) return '#cccccc'
  
  const sorted = sortedStops.value
  const gradientStops = sorted.map(stop => `${stop.color} ${stop.position * 100}%`)
  return `linear-gradient(to right, ${gradientStops.join(', ')})`
})

const activeMarker = computed(() => {
  return stops.value.find(s => s.id === activeMarkerId.value)
})

const onModeChange = (value) => {
  emit('update:auto-distribute', value)
  if (value) {
    // Auto-distribute: recalculate positions evenly
    stops.value = stops.value.map((stop, index) => ({
      ...stop,
      position: stops.value.length > 1 ? index / (stops.value.length - 1) : 0.5
    }))
    emitUpdate()
  }
}

const onBarClick = (event) => {
  if (!barRef.value) return

  const rect = barRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const position = Math.max(0, Math.min(1, x / rect.width))

  // Add new color stop at this position
  const newStop = {
    id: `stop-${Date.now()}`,
    color: '#cccccc',
    position
  }

  stops.value.push(newStop)

  if (props.autoDistribute) {
    // Re-distribute all stops evenly
    stops.value = stops.value.map((stop, index) => ({
      ...stop,
      position: index / (stops.value.length - 1)
    }))
  }

  activeMarkerId.value = newStop.id
  activeColor.value = newStop.color
  emitUpdate()
}

const onMarkerMouseDown = (event, stopId) => {
  // Prevent event from bubbling to bar
  event.stopPropagation()
  event.preventDefault()
  
  if (event.button === 1) {
    // Middle click - remove marker
    removeMarker(stopId)
    return
  }

  if (event.button !== 0) return

  const stop = stops.value.find(s => s.id === stopId)
  if (!stop) return

  activeMarkerId.value = stopId
  activeColor.value = stop.color
  
  // Log selected marker info
  console.log('Selected marker:', {
    id: stop.id,
    color: stop.color,
    position: stop.position.toFixed(3)
  })
  
  // Initialize drag state
  dragStartX.value = event.clientX
  dragStartPosition.value = stop.position

  // Get marker element for direct position update
  const markerEl = event.currentTarget
  const barRect = barRef.value.getBoundingClientRect()

  const onMove = (moveEvent) => {
    moveEvent.preventDefault()
    
    const deltaX = moveEvent.clientX - dragStartX.value
    const deltaPosition = deltaX / barRect.width
    const newPosition = Math.max(0, Math.min(1, dragStartPosition.value + deltaPosition))
    
    // Update position directly
    stop.position = newPosition
    
    // Update marker position visually
    markerEl.style.left = `${newPosition * 100}%`
  }

  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    emitUpdate()
  }

  document.addEventListener('mousemove', onMove, { passive: false })
  document.addEventListener('mouseup', onUp)
}

const onMarkerContextMenu = (event, stopId) => {
  // Right-click - remove marker (if more than 2 stops)
  if (stops.value.length > 2) {
    removeMarker(stopId)
  }
}

const removeMarker = (stopId) => {
  if (stops.value.length <= 2) return
  
  const index = stops.value.findIndex(s => s.id === stopId)
  if (index === -1) return
  
  stops.value.splice(index, 1)
  
  if (props.autoDistribute) {
    // Re-distribute remaining stops
    stops.value = stops.value.map((stop, i) => ({
      ...stop,
      position: i / (stops.value.length - 1)
    }))
  }
  
  if (activeMarkerId.value === stopId) {
    activeMarkerId.value = null
    activeColor.value = ''
  }
  
  emitUpdate()
}

const onColorChange = (color) => {
  const stop = stops.value.find(s => s.id === activeMarkerId.value)
  if (stop) {
    stop.color = color
    emitUpdate()
  }
}

const emitUpdate = () => {
  const output = stops.value.map(({ id, ...rest }) => rest)
  emit('update:model-value', output)
}

// Expose for debugging
defineExpose({
  stops: computed(() => stops.value.map(({ id, ...rest }) => rest))
})
</script>

<style scoped>
.gradient-editor {
  padding: 12px;
  background: #2b2b2b;
  border-radius: 6px;
  margin-bottom: 12px;
}

.gradient-editor__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.gradient-editor__label {
  font-size: 12px;
  font-weight: 600;
  color: #e0e0e0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.gradient-editor__bar {
  position: relative;
  height: 40px;
  border-radius: 2px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #555;
  margin-bottom: 8px;
  background: #333;
}

.gradient-editor__gradient {
  width: 100%;
  height: 100%;
}

.gradient-editor__marker {
  position: absolute;
  bottom: -4px;
  transform: translateX(-50%);
  cursor: grab;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
  touch-action: none;
  user-select: none;
}

.gradient-editor__marker:active {
  cursor: grabbing;
}

.gradient-editor__marker--active {
  z-index: 2;
}

.gradient-editor__marker--active .gradient-editor__marker-color {
  border-color: #fff;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
}

.gradient-editor__marker::before {
  content: '';
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 8px solid #e0e0e0;
  margin-bottom: 2px;
}

.gradient-editor__marker--active::before {
  border-bottom-color: #fff;
}

.gradient-editor__marker-color {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 2px;
  background: #fff;
  transition: transform 0.1s;
}

.gradient-editor__marker--active .gradient-editor__marker-color {
  transform: scale(1.1);
}

.gradient-editor__controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gradient-editor__color-row {
  display: flex;
  align-items: center;
}

.gradient-editor__color-input {
  flex: 1;
}

.gradient-editor__hint {
  display: flex;
  gap: 12px;
  font-size: 10px;
  color: #9e9e9e;
  flex-wrap: wrap;
}

.gradient-editor__hint span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.gradient-editor__hint span::before {
  content: '•';
  color: #4CAF50;
}
</style>
