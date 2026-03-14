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
      @mousedown="onBarMouseDown"
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
        :class="{ 
          'gradient-editor__marker--active': activeMarkerId === stop.id,
          'gradient-editor__marker--dragging': isDraggingMarker && activeMarkerId === stop.id
        }"
        :style="getMarkerStyle(stop)"
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
          class="gradient-editor__color-input"
        >
          <template #append>
            <q-btn round dense flat icon="colorize">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-color v-model="activeColor" />
              </q-popup-proxy>
            </q-btn>
          </template>
        </q-input>
      </div>
      <div class="gradient-editor__hint">
        <span v-if="!localAutoDistribute">Drag: move</span>
        <span v-else>Auto mode: markers are static</span>
        <span>Middle-click: remove</span>
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

// Watch for color changes and update the stop
watch(activeColor, (newColor, oldColor) => {
  console.log('Color changed:', { oldColor, newColor, activeMarkerId: activeMarkerId.value })
  console.log('Stops:', stops.value.map(s => ({ id: s.id, color: s.color })))
  
  if (!activeMarkerId.value || !newColor) return
  
  const stop = stops.value.find(s => s.id === activeMarkerId.value)
  console.log('Found stop:', stop)
  
  if (stop) {
    console.log('Updating stop color:', stop.id, 'from', stop.color, 'to', newColor)
    stop.color = newColor
  }
  emitUpdate()
}, { deep: true, immediate: false })

// Local computed for autoDistribute with getter/setter
const localAutoDistribute = computed({
  get: () => props.autoDistribute,
  set: (value) => emit('update:auto-distribute', value)
})

// Internal stops with stable unique IDs
const stops = ref([])
let stopIdCounter = 0
let isDraggingMarker = false
const draggingMarkerPosition = ref(null)

// Get marker style - uses dragging position if currently dragging
const getMarkerStyle = (stop) => {
  if (isDraggingMarker && activeMarkerId.value === stop.id && draggingMarkerPosition.value !== null) {
    return { left: `${draggingMarkerPosition.value * 100}%` }
  }
  return { left: `${stop.position * 100}%` }
}

// Initialize stops with stable unique IDs
const initStops = () => {
  const newStops = props.modelValue.map((stop) => {
    // Try to find matching existing stop
    const existingStop = stops.value.find(s => 
      s.position === stop.position && s.color === stop.color
    )
    
    return {
      ...stop,
      id: existingStop?.id || `stop-${stopIdCounter++}`
    }
  })
  
  stops.value = newStops
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
  const result = `linear-gradient(to right, ${gradientStops.join(', ')})`
  console.log('Gradient updated:', result)
  return result
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

const onBarMouseDown = (event) => {
  // Don't create new marker if we just finished dragging
  if (isDraggingMarker) return
  
  // Only handle left mouse button
  if (event.button !== 0) return
  
  // Prevent default to avoid text selection
  event.preventDefault()
  
  if (!barRef.value) return

  const rect = barRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const position = Math.max(0, Math.min(1, x / rect.width))

  // Calculate color at this position from existing gradient
  let color = '#cccccc'
  if (stops.value.length >= 2) {
    const sorted = sortedStops.value
    
    // Find the two stops that surround this position
    let leftStop = sorted[0]
    let rightStop = sorted[sorted.length - 1]
    
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].position <= position && sorted[i + 1].position >= position) {
        leftStop = sorted[i]
        rightStop = sorted[i + 1]
        break
      }
    }
    
    // Interpolate color between left and right stops
    const range = rightStop.position - leftStop.position
    const ratio = range === 0 ? 0.5 : (position - leftStop.position) / range
    
    const leftColor = hexToRgb(leftStop.color)
    const rightColor = hexToRgb(rightStop.color)
    
    const r = Math.round(leftColor.r + (rightColor.r - leftColor.r) * ratio)
    const g = Math.round(leftColor.g + (rightColor.g - leftColor.g) * ratio)
    const b = Math.round(leftColor.b + (rightColor.b - leftColor.b) * ratio)
    
    color = rgbToHex(r, g, b)
  }

  // Add new color stop at this position
  const newStop = {
    id: `stop-${stopIdCounter++}`,
    color,
    position
  }

  if (props.autoDistribute) {
    // In auto mode: insert at the correct position based on click location
    const sorted = sortedStops.value
    let insertIndex = sorted.length
    
    // Find where to insert based on position
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].position > position) {
        insertIndex = i
        break
      }
    }
    
    // Insert at the correct position
    stops.value.splice(insertIndex, 0, newStop)
    
    // Re-distribute all stops evenly
    stops.value = stops.value.map((stop, index) => ({
      ...stop,
      position: index / (stops.value.length - 1)
    }))
  } else {
    // In manual mode: just add to the end
    stops.value.push(newStop)
  }

  activeMarkerId.value = newStop.id
  activeColor.value = newStop.color
  emitUpdate()
}

// Helper: Convert hex to RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 204, g: 204, b: 204 }
}

// Helper: Convert RGB to hex
const rgbToHex = (r, g, b) => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

const onMarkerMouseDown = (event, stopId) => {
  // Prevent event from bubbling to bar
  event.stopPropagation()
  
  if (event.button === 1) {
    // Middle click - remove marker
    event.preventDefault()
    removeMarker(stopId)
    return
  }

  if (event.button !== 0) return

  const stop = stops.value.find(s => s.id === stopId)
  if (!stop) return

  // Select the marker first
  activeMarkerId.value = stopId
  activeColor.value = stop.color
  
  // In auto distribute mode, markers are static - don't allow dragging
  if (props.autoDistribute) {
    console.log('Auto distribute mode: markers are static')
    return
  }
  
  event.preventDefault()
  
  // Log selected marker info
  console.log('Selected marker:', {
    id: stop.id,
    color: stop.color,
    position: stop.position.toFixed(3)
  })
  
  // Initialize drag state
  isDraggingMarker = false
  draggingMarkerPosition.value = null
  dragStartX.value = event.clientX
  dragStartPosition.value = stop.position
  
  event.preventDefault()
  
  // Log selected marker info
  console.log('Selected marker:', {
    id: stop.id,
    color: stop.color,
    position: stop.position.toFixed(3)
  })
  
  // Get bar rect for position calculations
  const barRect = barRef.value.getBoundingClientRect()

  const onMove = (moveEvent) => {
    moveEvent.preventDefault()
    
    const deltaX = moveEvent.clientX - dragStartX.value
    const deltaPosition = deltaX / barRect.width
    const newPosition = Math.max(0, Math.min(1, dragStartPosition.value + deltaPosition))
    
    // Update visual position for smooth dragging (uses draggingMarkerPosition ref)
    draggingMarkerPosition.value = newPosition
    
    // Also update stop.position so gradient updates in real-time
    stop.position = newPosition
    
    // Mark as dragging if moved more than 5px
    if (!isDraggingMarker && Math.abs(deltaX) > 5) {
      isDraggingMarker = true
    }
  }

  const onUp = (upEvent) => {
    upEvent.stopPropagation()
    upEvent.preventDefault()
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    
    // Final position update
    const deltaX = upEvent.clientX - dragStartX.value
    const deltaPosition = deltaX / barRect.width
    stop.position = Math.max(0, Math.min(1, dragStartPosition.value + deltaPosition))
    
    // Reset dragging state
    draggingMarkerPosition.value = null
    isDraggingMarker = false
    
    // Emit update once at the end
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
  bottom: 0;
  left: 0;
  transform: translateX(-50%);
  cursor: grab;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
  touch-action: none;
  user-select: none;
  will-change: left;
}

.gradient-editor__marker:active {
  cursor: grabbing;
}

.gradient-editor__marker--active {
  z-index: 2;
}

.gradient-editor__marker--dragging {
  z-index: 3;
  cursor: grabbing;
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
