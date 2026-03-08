<template>
  <BaseWidget :show-header="true">
    <template #title>
      <div class="container-header">
        <span class="widget-title">{{ title }}</span>
        <div class="header-actions">
          <q-btn
            flat
            dense
            size="sm"
            icon="add"
            @click="showAddWidget = true"
          />
        </div>
      </div>
    </template>
    <template #content>
      <div class="grid-container-widget">
        <GridLayout
          v-model:layout="internalLayout"
          :col-num="12"
          :row-height="25"
          :is-draggable="true"
          :is-resizable="true"
          :vertical-compact="true"
          :use-css-transforms="true"
          :prevent-collision="true"
          class="internal-grid"
          @layout-updated="onLayoutUpdated"
        >
          <GridItem
            v-for="item in internalLayout"
            :key="item.i"
            :x="item.x"
            :y="item.y"
            :w="item.w"
            :h="item.h"
            :min-w="item.minW || 2"
            :min-h="item.minH || 2"
            :i="item.i"
          >
            <div class="widget-content-wrapper">
              <component :is="renderWidget(getWidget(item.i))" />
              <div class="widget-remove">
                <q-btn
                  flat
                  dense
                  size="xs"
                  icon="close"
                  @click.stop="removeWidget(item.i)"
                  title="Remove"
                />
              </div>
            </div>
          </GridItem>
        </GridLayout>

        <div v-if="internalLayout.length === 0" class="empty-state">
          <div class="text-center text-caption">
            Drop widgets here or click +
          </div>
        </div>
      </div>
    </template>
  </BaseWidget>

  <q-dialog v-model="showAddWidget">
    <q-card style="min-width: 300px">
      <q-card-section>
        <div class="text-h6">Add Widget</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-select
          v-model="selectedWidgetType"
          :options="widgetTypes"
          label="Widget Type"
          outlined
          dense
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn flat label="Add" color="primary" @click="addInternalWidget" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, h, watch } from 'vue'
import { GridLayout, GridItem } from 'vue-grid-layout-v3'
import BaseWidget from './BaseWidget.vue'
import NumberWidget from './NumberWidget.vue'
import ChartWidget from './ChartWidget.vue'

interface InternalWidget {
  id: string
  type: string
  title?: string
  options: Record<string, any>
  data?: any
}

interface InternalLayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

const props = defineProps<{
  title?: string
  showHeader?: boolean
  containerId?: string
  children?: InternalWidget[]
  childLayout?: InternalLayoutItem[]
}>()

const emit = defineEmits<{
  'update:layout': [layout: InternalLayoutItem[]]
  'update:children': [children: InternalWidget[]]
}>()

const internalLayout = ref<InternalLayoutItem[]>([])
const internalWidgets = ref<InternalWidget[]>([])
const showAddWidget = ref(false)
const selectedWidgetType = ref('number')

const widgetTypes = ['number', 'chart']

let widgetCounter = 0

// Watch for external changes to children and layout
watch(() => props.children, (newChildren) => {
  if (newChildren && newChildren.length > 0) {
    internalWidgets.value = newChildren
  }
}, { immediate: true })

watch(() => props.childLayout, (newLayout) => {
  if (newLayout && newLayout.length > 0) {
    internalLayout.value = newLayout
  }
}, { immediate: true })

function getWidget(id: string): InternalWidget | undefined {
  return internalWidgets.value.find(w => w.id === id)
}

function renderWidget(widget: InternalWidget | undefined) {
  if (!widget) return null

  const commonProps = {
    title: widget.title,
    showHeader: !!widget.title,
    options: widget.options,
    loading: false,
    error: null
  }

  if (widget.type === 'number') {
    return h(NumberWidget, {
      ...commonProps,
      value: widget.data?.value ?? 0
    })
  }

  if (widget.type === 'chart') {
    return h(ChartWidget, {
      ...commonProps,
      data: widget.data?.data ?? []
    })
  }

  return null
}

function addInternalWidget() {
  widgetCounter++
  const widgetId = `${props.containerId || 'container'}-widget-${widgetCounter}`

  const newWidget: InternalWidget = {
    id: widgetId,
    type: selectedWidgetType.value,
    title: `Widget ${widgetCounter}`,
    options: selectedWidgetType.value === 'number'
      ? { decimals: 1, suffix: '', color: '#4CAF50' }
      : { timeRange: '1h', showLegend: false, smooth: true, colors: ['#2196F3'], fill: true },
    data: selectedWidgetType.value === 'number'
      ? { value: Math.random() * 100 }
      : { data: [] }
  }

  internalWidgets.value.push(newWidget)
  emit('update:children', internalWidgets.value)

  // Auto-place widget
  const itemW = 4
  const itemH = 4
  let x = 0
  let y = 0
  let placed = false

  for (let row = 0; row < 20 && !placed; row++) {
    for (let col = 0; col < 12 && !placed; col += itemW) {
      x = col
      y = row * itemH

      const overlaps = internalLayout.value.some(item =>
        x < item.x + item.w &&
        x + itemW > item.x &&
        y < item.y + item.h &&
        y + itemH > item.y
      )

      if (!overlaps) {
        placed = true
      }
    }
  }

  const newLayout: InternalLayoutItem = {
    i: widgetId,
    x,
    y,
    w: itemW,
    h: itemH,
    minW: 3,
    minH: 3
  }

  internalLayout.value.push(newLayout)
  emit('update:layout', internalLayout.value)

  showAddWidget.value = false
}

function onLayoutUpdated(newLayout: InternalLayoutItem[]) {
  internalLayout.value = newLayout
  emit('update:layout', newLayout)
}

function removeWidget(widgetId: string) {
  internalWidgets.value = internalWidgets.value.filter(w => w.id !== widgetId)
  internalLayout.value = internalLayout.value.filter(l => l.i !== widgetId)

  emit('update:children', internalWidgets.value)
  emit('update:layout', internalLayout.value)
}

// Expose methods
defineExpose({
  getLayout: () => internalLayout.value,
  getWidgets: () => internalWidgets.value
})
</script>

<style scoped>
.grid-container-widget {
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.container-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.internal-grid {
  flex: 1;
  min-height: 0;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.5;
}

.widget-content-wrapper {
  height: 100%;
  position: relative;
}

.widget-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
}

.widget-content-wrapper:hover .widget-remove {
  opacity: 1;
}

/* Dark theme for internal grid items */
:deep(.vue-grid-item:not(.vue-grid-placeholder)) {
  background: #545454;
  border: 1px solid #757575;
}

:deep(.vue-grid-layout-light .vue-grid-item:not(.vue-grid-placeholder)) {
  background: #fafafa;
  border: 1px solid #e0e0e0;
}

:deep(.vue-grid-item .vue-resizable-handle) {
  z-index: 10;
}

/* Отключаем выделение текста при ресайзе */
:deep(.vue-grid-item *) {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
</style>
