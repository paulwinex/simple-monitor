<script setup lang="ts">
import { onMounted, computed, h, ref } from 'vue'
import { GridLayout, GridItem } from 'vue-grid-layout-v3'
import { useQuasar } from 'quasar'
import { useDashboardStore, WIDGET_MIN_SIZES } from 'stores/dashboard'
import NumberWidget from 'components/widgets/NumberWidget.vue'
import ChartWidget from 'components/widgets/ChartWidget.vue'
import GridContainerWidget from 'components/widgets/GridContainerWidget.vue'

const $q = useQuasar()
const dashboardStore = useDashboardStore()

const isDark = computed(() => $q.dark.mode === true || $q.dark.mode === 'true')
const gridOptions = computed(() => dashboardStore.gridOptions)

const showAddWidget = ref(false)
const selectedWidgetType = ref('number')
const selectedWidgetTitle = ref('')

const widgetTypes = [
  { value: 'number', label: 'Number' },
  { value: 'chart', label: 'Chart' },
  { value: 'gridContainer', label: 'Grid Container' }
]

let widgetCounter = 0

onMounted(() => {
  dashboardStore.loadDashboard()
})

function moveEvent(i: string, newX: number, newY: number) {
  console.info(`MOVE i=${i}, X=${newX}, Y=${newY}`)
}

function movedEvent(i: string, newX: number, newY: number) {
  console.info(`MOVED i=${i}, X=${newX}, Y=${newY}`)
}

function resizeEvent(i: string, newH: number, newW: number, newHPx: number, newWPx: number) {
  console.info(`RESIZE i=${i}, H=${newH}, W=${newW}, H(px)=${newHPx}, W(px)=${newWPx}`)
}

function resizedEvent(i: string, newX: number, newY: number, newHPx: number, newWPx: number) {
  console.info(`RESIZED i=${i}, X=${newX}, Y=${newY}, H(px)=${newHPx}, W(px)=${newWPx}`)
}

function layoutUpdatedEvent(newLayout: any[]) {
  dashboardStore.updateLayout(newLayout)
  console.info('Updated layout')
}

function getWidget(id: string) {
  return dashboardStore.widgets.find(w => w.id === id)
}

function getMinWidth(widget: any): number {
  if (!widget) return 2
  return WIDGET_MIN_SIZES[widget.type]?.minW || 2
}

function getMinHeight(widget: any): number {
  if (!widget) return 2
  return WIDGET_MIN_SIZES[widget.type]?.minH || 2
}

function renderWidget(widget: any) {
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
      value: widget.data?.value ?? null
    })
  }

  if (widget.type === 'chart') {
    return h(ChartWidget, {
      ...commonProps,
      data: widget.data?.data ?? []
    })
  }

  if (widget.type === 'gridContainer') {
    return h(GridContainerWidget, {
      title: widget.title,
      showHeader: !!widget.title,
      containerId: widget.id,
      children: widget.children || [],
      childLayout: widget.childLayout || [],
      'onUpdate:layout': (newLayout: any[]) => {
        widget.childLayout = newLayout
      },
      'onUpdate:children': (newChildren: any[]) => {
        widget.children = newChildren
      }
    })
  }

  return null
}

function addWidget() {
  showAddWidget.value = true
}

function confirmAddWidget() {
  widgetCounter++
  const widgetId = `widget-${widgetCounter}`
  const widgetType = selectedWidgetType.value

  const newWidget: any = {
    id: widgetId,
    type: widgetType,
    title: selectedWidgetTitle.value || `Widget ${widgetCounter}`,
    options: {},
    refreshInterval: 5000
  }

  if (widgetType === 'number') {
    newWidget.options = { decimals: 1, suffix: '', color: '#4CAF50' }
    newWidget.data = { value: 0 }
    newWidget.hostId = 'host-1'
    newWidget.deviceId = 'cpu'
    newWidget.sensors = [{ name: 'usage_percent', table: 'raw' }]
  } else if (widgetType === 'chart') {
    newWidget.options = { timeRange: '1h', showLegend: false, smooth: true, colors: ['#2196F3'], fill: true }
    newWidget.data = { data: [] }
    newWidget.hostId = 'host-1'
    newWidget.deviceId = 'cpu'
    newWidget.sensors = [{ name: 'usage_percent', table: 'raw' }]
  } else if (widgetType === 'gridContainer') {
    newWidget.children = []
    newWidget.childLayout = []
  }

  dashboardStore.addWidget(newWidget)
  
  showAddWidget.value = false
  selectedWidgetTitle.value = ''
}
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h4">Dashboard</div>
      <q-space />
      <q-btn
        color="primary"
        icon="add"
        label="Add Widget"
        @click="addWidget"
      />
    </div>

    <div v-if="dashboardStore.isLoading" class="row justify-center q-mt-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="dashboardStore.hasError" class="row justify-center q-mt-xl">
      <q-banner class="bg-negative text-white">
        {{ dashboardStore.error }}
      </q-banner>
    </div>

    <div v-else :class="['dashboard-grid', { 'vue-grid-layout-light': !isDark }]">
      <GridLayout
        v-model:layout="dashboardStore.layout"
        :col-num="gridOptions.colNum"
        :row-height="gridOptions.rowHeight"
        :is-draggable="true"
        :is-resizable="true"
        :vertical-compact="gridOptions.verticalCompact"
        :use-css-transforms="true"
        @layout-updated="layoutUpdatedEvent"
      >
        <GridItem
          v-for="item in dashboardStore.layout"
          :key="item.i"
          :x="item.x"
          :y="item.y"
          :w="item.w"
          :h="item.h"
          :min-w="item.minW || getMinWidth(getWidget(item.i))"
          :min-h="item.minH || getMinHeight(getWidget(item.i))"
          :i="item.i"
          @resize="resizeEvent"
          @move="moveEvent"
          @resized="resizedEvent"
          @moved="movedEvent"
        >
          <component :is="renderWidget(getWidget(item.i))" />
        </GridItem>
      </GridLayout>
    </div>
  </q-page>

  <q-dialog v-model="showAddWidget">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Add Widget</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input
          v-model="selectedWidgetTitle"
          label="Widget Title"
          outlined
          dense
          class="q-mb-md"
        />
        <q-select
          v-model="selectedWidgetType"
          :options="widgetTypes"
          option-value="value"
          option-label="label"
          label="Widget Type"
          outlined
          dense
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn flat label="Add" color="primary" @click="confirmAddWidget" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.dashboard-grid {
  background: var(--q-card-background);
  border-radius: 8px;
  padding: 16px;
  min-height: 400px;
}

.vue-grid-layout {
  background: transparent;
}

/* Dark theme */
.vue-grid-item:not(.vue-grid-placeholder) {
  background: #424242;
  border: 1px solid #616161;
  border-radius: 4px;
}

.vue-grid-item.static {
  background: #545454;
}

/* Light theme */
.vue-grid-layout-light .vue-grid-item:not(.vue-grid-placeholder) {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.vue-grid-layout-light .vue-grid-item.static {
  background: #f5f5f5;
}

.vue-grid-item .vue-resizable-handle {
  z-index: 10;
}

/* Отключаем выделение текста при ресайзе */
.vue-grid-item * {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
</style>
